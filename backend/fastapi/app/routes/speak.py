import asyncio
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

from ..services.tts import tts_service

router = APIRouter(tags=["speak"])


@router.get("/speak")
async def speak(request: Request, text: str, voice: str = "dave", wpm: int = 150):
    """
    SSE stream of word-by-word timing events for text highlighting.
    The client is responsible for audio playback (via /tts/audio or Web Speech API).
    """
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        raise HTTPException(status_code=400, detail="No content to speak")

    ms_per_word = 60_000 / wpm
    window_size = 5

    async def event_stream():
        for p_idx, paragraph in enumerate(paragraphs):
            if await request.is_disconnected():
                break

            words = paragraph.split()
            if not words:
                continue

            # Signal start of new paragraph
            yield (
                f"data: {json.dumps({'paragraphIndex': p_idx, 'currentWordIndex': -1, 'wordWindow': [], 'windowStart': 0, 'fullParagraph': ' '.join(words), 'newParagraph': True})}\n\n"
            )

            for word_idx in range(len(words)):
                if await request.is_disconnected():
                    return

                half = window_size // 2
                start = max(0, word_idx - half)
                end = min(len(words) - 1, word_idx + half)

                yield (
                    f"data: {json.dumps({'paragraphIndex': p_idx, 'currentWordIndex': word_idx, 'wordWindow': words[start:end + 1], 'windowStart': start, 'fullParagraph': ' '.join(words), 'newParagraph': False})}\n\n"
                )

                await asyncio.sleep(ms_per_word / 1000)

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/tts/audio")
async def generate_audio(text: str, voice: str = "dave"):
    """
    Generate WAV audio with NeuTTS Air and return the bytes.
    Returns a JSON fallback hint when NeuTTS is unavailable so the
    client can switch to the Web Speech API automatically.
    """
    if not tts_service.available:
        return {"tts_available": False, "fallback": "web_speech_api"}

    audio_bytes = await tts_service.synthesize(text, voice)
    if audio_bytes is None:
        raise HTTPException(status_code=500, detail="Audio generation failed")

    return Response(content=audio_bytes, media_type="audio/wav")
