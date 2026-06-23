"""
Text-to-speech streaming routes.

Implements two TTS endpoints:

- **SSE word-timing stream** (``POST /speak``) — Splits the input text into
  paragraphs and words, then emits Server-Sent Events (SSE) that carry the
  current word index, a sliding word window, and an absolute word counter.
  The client uses these events to drive word-level highlight synchronisation
  in the reader UI.  Audio is produced by the browser's Web Speech API or the
  NeuTTS engine (handled client-side or via ``/tts/audio``).

- **WAV audio generation** (``POST /tts/audio``) — Synthesises a WAV file
  using the NeuTTS Air model and streams it back.  Falls back gracefully when
  NeuTTS is unavailable.

Routes
------
POST /speak         — Stream SSE word-timing events for the given text.
POST /tts/audio     — Return synthesised WAV audio for the given text.
"""

import asyncio
import json

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from ..models.document import NasomaDocument
from ..services.tts import tts_service
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.speak")
router = APIRouter(tags=["speak"])


class SpeakRequest(BaseModel):
    """Payload for ``POST /speak``.

    Attributes:
        text: The full text to be read aloud.  May contain multiple paragraphs
            separated by blank lines (``\\n\\n``).
        voice: Voice identifier recognised by the TTS service (default: dave).
        wpm: Target reading speed in words per minute — controls the delay
            between SSE events so the client highlight matches audio pace.
    """

    text: str
    voice: str = "dave"
    wpm: int = 150


@router.post("/speak")
async def speak(request: Request, payload: SpeakRequest):
    """Stream word-timing SSE events for the given text.

    The response is a ``text/event-stream`` where each ``data:`` line is a
    JSON object with the following fields:

    - ``paragraphIndex`` — 0-based index of the current paragraph.
    - ``currentWordIndex`` — 0-based word index within the paragraph
      (``-1`` on ``newParagraph`` events).
    - ``absoluteWordIndex`` — cumulative word index across all paragraphs.
    - ``wordWindow`` — a 5-word sliding window centred on the current word,
      used to display context around the highlighted word.
    - ``windowStart`` — index of the first word in ``wordWindow`` within the
      paragraph, so the client can map back to absolute positions.
    - ``newParagraph`` — ``true`` when the event marks a paragraph boundary.
    - ``done`` — ``true`` on the final event signalling stream completion.

    The client is expected to disconnect when TTS stops; the generator checks
    ``request.is_disconnected()`` each iteration and exits early.

    Args:
        request: The raw FastAPI request, used to detect client disconnections.
        payload: Validated request body containing text, voice, and WPM.

    Raises:
        HTTPException 400: If ``text`` is empty or contains no speakable content.
    """
    text, voice, wpm = payload.text, payload.voice, payload.wpm
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        raise HTTPException(status_code=400, detail="No content to speak")

    logger.info(
        "SSE stream started: voice=%s wpm=%d paragraphs=%d",
        voice,
        wpm,
        len(paragraphs),
    )

    # Delay between SSE events derived from target WPM.
    ms_per_word = 60_000 / wpm
    window_size = 5  # Words visible in the highlight context window.

    async def event_stream():
        """Async generator that yields SSE-formatted strings."""
        abs_word_idx = 0  # Running total of words emitted across all paragraphs.

        for p_idx, paragraph in enumerate(paragraphs):
            if await request.is_disconnected():
                break

            words = paragraph.split()
            if not words:
                continue

            # Emit a paragraph-boundary event first so the client can reset
            # its highlight state before individual word events arrive.
            para_payload = json.dumps({
                'paragraphIndex': p_idx,
                'currentWordIndex': -1,
                'absoluteWordIndex': abs_word_idx,
                'wordWindow': [],
                'windowStart': 0,
                'fullParagraph': ' '.join(words),
                'newParagraph': True,
            })
            yield f"data: {para_payload}\n\n"

            # Brief pause so the client can render the paragraph highlight
            # before the first word event arrives.
            await asyncio.sleep(ms_per_word / 1000 * 0.4)

            for word_idx in range(len(words)):
                if await request.is_disconnected():
                    return

                # Build a centred sliding window; clamp at paragraph boundaries.
                half = window_size // 2
                start = max(0, word_idx - half)
                end = min(len(words) - 1, word_idx + half)

                payload = json.dumps({
                    'paragraphIndex': p_idx,
                    'currentWordIndex': word_idx,
                    'absoluteWordIndex': abs_word_idx,
                    'currentWord': words[word_idx],
                    'wordWindow': words[start:end + 1],
                    'windowStart': start,
                    'fullParagraph': ' '.join(words),
                    'newParagraph': False,
                })
                yield f"data: {payload}\n\n"

                abs_word_idx += 1
                await asyncio.sleep(ms_per_word / 1000)

        # Signal to the client that all words have been emitted.
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Prevent Nginx from buffering SSE responses, which would delay
            # delivery of word events to the client.
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/tts/audio")
async def generate_audio(text: str, voice: str = "sophia"):
    """Synthesise and return WAV audio for the given text.

    Returns a JSON fallback hint when the Kokoro sidecar is unavailable so the
    client can fall back to the browser's Web Speech API automatically.
    """
    if not tts_service.available:
        logger.info("TTS audio requested but Kokoro unavailable — returning fallback hint")
        return {"tts_available": False, "fallback": "web_speech_api"}

    audio_bytes = await tts_service.synthesize(text, voice)
    if audio_bytes is None:
        raise HTTPException(status_code=500, detail="Audio generation failed")

    logger.info("TTS audio generated: voice=%s bytes=%d", voice, len(audio_bytes))
    return Response(content=audio_bytes, media_type="audio/wav")


@router.get("/tts/audio/{doc_id}")
async def paragraph_audio(
    doc_id: str,
    page: int = Query(..., ge=0),
    para: int = Query(..., ge=0),
    voice: str = Query("sophia"),
):
    """Return synthesised WAV for a specific paragraph in a stored document.

    Checks the in-memory cache first (instant on a cache hit).  On a miss,
    synthesises via the Kokoro sidecar and caches the result.  After serving
    the requested paragraph, schedules background synthesis of the next 5
    paragraphs (across page boundaries) so they are ready before the client
    asks for them.

    Args:
        doc_id:  MongoDB document ID.
        page:    0-based page index within ``doc.pages``.
        para:    0-based paragraph index within that page's ``paragraphs`` list.
        voice:   Voice ID (``sophia`` or ``adam``).

    Returns:
        ``audio/wav`` binary, or a JSON fallback hint when Kokoro is unavailable.
    """
    if not tts_service.available:
        return {"tts_available": False, "fallback": "web_speech_api"}

    try:
        doc = await NasomaDocument.get(PydanticObjectId(doc_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc or not doc.pages:
        raise HTTPException(status_code=404, detail="Document not found or has no page data")

    if page >= len(doc.pages):
        raise HTTPException(status_code=400, detail="Page index out of range")

    page_data = doc.pages[page]
    paragraphs = page_data.get("paragraphs") or []

    if not paragraphs:
        # Fallback: treat the whole page text as a single paragraph.
        text = page_data.get("text", "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Page has no speakable content")
        paragraphs = [{"text": text}]

    if para >= len(paragraphs):
        raise HTTPException(status_code=400, detail="Paragraph index out of range")

    text = paragraphs[para]["text"]
    wav = await tts_service.synthesize_paragraph(doc_id, page, para, text, voice)

    if wav is None:
        raise HTTPException(status_code=500, detail="Audio generation failed")

    # Schedule prefetch of the next 5 paragraphs across page boundaries.
    upcoming: list[tuple[int, int, str]] = []
    p, q = page, para + 1
    while len(upcoming) < 5 and p < len(doc.pages):
        page_paras = doc.pages[p].get("paragraphs") or []
        if not page_paras:
            p += 1
            q = 0
            continue
        while q < len(page_paras) and len(upcoming) < 5:
            if not tts_service.is_cached(doc_id, p, q, voice):
                upcoming.append((p, q, page_paras[q]["text"]))
            q += 1
        p += 1
        q = 0

    if upcoming:
        tts_service.schedule_prefetch(doc_id, upcoming, voice)
        logger.debug("Prefetch scheduled: %d paragraphs after %s p%d:q%d", len(upcoming), doc_id, page, para)

    logger.info("Para audio: doc=%s page=%d para=%d voice=%s bytes=%d", doc_id, page, para, voice, len(wav))
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={"Cache-Control": "private, max-age=3600"},
    )
