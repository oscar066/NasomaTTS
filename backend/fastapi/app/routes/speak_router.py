"""TTS streaming routes — SSE word-timing and WAV audio."""

import asyncio
import json

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse

from ..models.document import NasomaDocument
from ..models.document_page import NasomaDocumentPage
from ..schemas.speak import SpeakRequest
from ..services.tts_service import tts_service
from ..services.voices_service import VOICE_REGISTRY
from ..utils.deps import get_optional_user
from ..utils.logger import setup_logger

PREMIUM_VOICES = frozenset(VOICE_REGISTRY.keys())

logger = setup_logger("nasoma.routes.speak")
router = APIRouter(tags=["speak"])


@router.post("/speak")
async def speak(request: Request, payload: SpeakRequest):
    text, voice, wpm = payload.text, payload.voice, payload.wpm
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        raise HTTPException(status_code=400, detail="No content to speak")

    logger.info("SSE stream started: voice=%s wpm=%d paragraphs=%d", voice, wpm, len(paragraphs))

    ms_per_word = 60_000 / wpm
    window_size = 5

    async def event_stream():
        abs_word_idx = 0

        for p_idx, paragraph in enumerate(paragraphs):
            if await request.is_disconnected():
                break

            words = paragraph.split()
            if not words:
                continue

            yield f"data: {json.dumps({'paragraphIndex': p_idx, 'currentWordIndex': -1, 'absoluteWordIndex': abs_word_idx, 'wordWindow': [], 'windowStart': 0, 'fullParagraph': ' '.join(words), 'newParagraph': True})}\n\n"
            await asyncio.sleep(ms_per_word / 1000 * 0.4)

            for word_idx in range(len(words)):
                if await request.is_disconnected():
                    return

                half  = window_size // 2
                start = max(0, word_idx - half)
                end   = min(len(words) - 1, word_idx + half)

                yield f"data: {json.dumps({'paragraphIndex': p_idx, 'currentWordIndex': word_idx, 'absoluteWordIndex': abs_word_idx, 'currentWord': words[word_idx], 'wordWindow': words[start:end + 1], 'windowStart': start, 'fullParagraph': ' '.join(words), 'newParagraph': False})}\n\n"

                abs_word_idx += 1
                await asyncio.sleep(ms_per_word / 1000)

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/tts/audio")
async def generate_audio(text: str, voice: str = "sophia", current_user=Depends(get_optional_user)):
    if voice in PREMIUM_VOICES:
        if getattr(current_user, "plan", None) != "pro":
            raise HTTPException(status_code=403, detail="Premium voices require a Pro subscription.")

    if not tts_service.available:
        return {"tts_available": False, "fallback": "web_speech_api"}

    audio_bytes = await tts_service.synthesize(text, voice)
    if audio_bytes is None:
        raise HTTPException(status_code=500, detail="Audio generation failed")

    logger.info("TTS audio: voice=%s bytes=%d", voice, len(audio_bytes))
    return Response(content=audio_bytes, media_type="audio/wav")


@router.get("/tts/audio/{doc_id}")
async def paragraph_audio(
    doc_id: str,
    page: int = Query(..., ge=0),
    para: int = Query(..., ge=0),
    voice: str = Query("sophia"),
    current_user=Depends(get_optional_user),
):
    if voice in PREMIUM_VOICES:
        if getattr(current_user, "plan", None) != "pro":
            raise HTTPException(status_code=403, detail="Premium voices require a Pro subscription.")

    try:
        doc = await NasomaDocument.get(PydanticObjectId(doc_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    page_doc = await NasomaDocumentPage.find_one(
        NasomaDocumentPage.doc_id == doc.id,
        NasomaDocumentPage.page_number == page + 1,
    )
    if not page_doc:
        raise HTTPException(status_code=400, detail="Page index out of range")

    paragraphs = page_doc.paragraphs or []
    if not paragraphs:
        text = page_doc.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Page has no speakable content")
        paragraphs = [{"text": text}]

    if para >= len(paragraphs):
        raise HTTPException(status_code=400, detail="Paragraph index out of range")

    wav = await tts_service.synthesize_paragraph(doc_id, page, para, paragraphs[para]["text"], voice)
    if wav is None:
        raise HTTPException(status_code=500, detail="Audio generation failed")

    # Prefetch next 3 paragraphs across page boundaries.
    next_page_docs = await NasomaDocumentPage.find(
        NasomaDocumentPage.doc_id == doc.id,
        NasomaDocumentPage.page_number >= page + 1,
        NasomaDocumentPage.page_number <= page + 4,
    ).sort("+page_number").to_list()

    page_lookup = {pd.page_number - 1: pd for pd in next_page_docs}
    upcoming: list[tuple[int, int, str]] = []
    p, q = page, para + 1

    while len(upcoming) < 3:
        pd = page_lookup.get(p)
        if pd is None:
            break
        page_paras = pd.paragraphs or []
        if not page_paras:
            p += 1
            q = 0
            continue
        while q < len(page_paras) and len(upcoming) < 3:
            if not tts_service.is_cached(doc_id, p, q, voice):
                upcoming.append((p, q, page_paras[q]["text"]))
            q += 1
        p += 1
        q = 0

    if upcoming:
        tts_service.schedule_prefetch(doc_id, upcoming, voice)

    logger.info("Para audio: doc=%s page=%d para=%d voice=%s bytes=%d", doc_id, page, para, voice, len(wav))
    return Response(content=wav, media_type="audio/wav", headers={"Cache-Control": "private, max-age=3600"})
