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

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

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
            yield (
                f"data: {json.dumps({'paragraphIndex': p_idx, 'currentWordIndex': -1, 'absoluteWordIndex': abs_word_idx, 'wordWindow': [], 'windowStart': 0, 'fullParagraph': ' '.join(words), 'newParagraph': True})}\n\n"
            )

            for word_idx in range(len(words)):
                if await request.is_disconnected():
                    return

                # Build a centred sliding window; clamp at paragraph boundaries.
                half = window_size // 2
                start = max(0, word_idx - half)
                end = min(len(words) - 1, word_idx + half)

                yield (
                    f"data: {json.dumps({'paragraphIndex': p_idx, 'currentWordIndex': word_idx, 'absoluteWordIndex': abs_word_idx, 'wordWindow': words[start:end + 1], 'windowStart': start, 'fullParagraph': ' '.join(words), 'newParagraph': False})}\n\n"
                )

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
async def generate_audio(text: str, voice: str = "dave"):
    """Synthesise and return WAV audio for the given text using NeuTTS.

    When NeuTTS is unavailable (model not loaded or missing sample files) the
    endpoint returns a JSON hint telling the client to fall back to the Web
    Speech API instead of raising an error.

    Args:
        text: The text to synthesise.
        voice: Voice ID to use (must match a key in ``PRESET_VOICES``).

    Returns:
        A ``audio/wav`` binary response, or a JSON fallback hint.

    Raises:
        HTTPException 500: If NeuTTS is available but synthesis returns no data.
    """
    if not tts_service.available:
        logger.info("TTS audio requested but NeuTTS unavailable — returning fallback hint")
        return {"tts_available": False, "fallback": "web_speech_api"}

    audio_bytes = await tts_service.synthesize(text, voice)
    if audio_bytes is None:
        logger.error("TTS synthesis returned None for voice=%s", voice)
        raise HTTPException(status_code=500, detail="Audio generation failed")

    logger.info("TTS audio generated: voice=%s bytes=%d", voice, len(audio_bytes))
    return Response(content=audio_bytes, media_type="audio/wav")
