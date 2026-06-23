"""
Kokoro TTS microservice.

Thin FastAPI wrapper around the Kokoro-82M model.  Exposes three endpoints:

  POST /synthesize  — text + voice → WAV bytes
  GET  /voices      — list available voices
  GET  /health      — readiness probe

The model is loaded once at startup and cached for the lifetime of the process.
Voice labels used here are the internal Kokoro IDs; the main API maps branded
names (Sophia, Adam) to these IDs before calling this service.
"""

import asyncio
import io
import logging
import re

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kokoro-tts")

# Kokoro internal voice IDs available in this service.
VOICES = {
    "sophia": "af_heart",
    "adam":   "am_adam",
}

_pipeline = None

app = FastAPI(title="Kokoro TTS", version="1.0.0")


def _load_pipeline():
    from kokoro import KPipeline
    return KPipeline(lang_code="a")  # 'a' = American English


@app.on_event("startup")
async def startup():
    global _pipeline
    logger.info("Loading Kokoro pipeline (model download may take a moment on first run)...")
    loop = asyncio.get_event_loop()
    try:
        _pipeline = await loop.run_in_executor(None, _load_pipeline)
        logger.info("Kokoro pipeline ready. Voices: %s", list(VOICES))
    except Exception as exc:
        logger.error("Failed to load Kokoro pipeline: %s", exc)


_MAX_WORDS_PER_CHUNK = 120


def _split_into_chunks(text: str) -> list[str]:
    """Split text at sentence boundaries so no chunk exceeds _MAX_WORDS_PER_CHUNK.

    Keeps sentences together where possible; a single sentence longer than the
    limit is passed through as-is rather than breaking mid-sentence.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current: list[str] = []
    count = 0
    for sentence in sentences:
        words = len(sentence.split())
        if count + words > _MAX_WORDS_PER_CHUNK and current:
            chunks.append(" ".join(current))
            current = [sentence]
            count = words
        else:
            current.append(sentence)
            count += words
    if current:
        chunks.append(" ".join(current))
    return chunks


class SynthRequest(BaseModel):
    text: str
    voice: str = "sophia"


@app.post("/synthesize")
async def synthesize(req: SynthRequest):
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    kokoro_voice = VOICES.get(req.voice, "af_heart")

    def _run() -> bytes:
        # Collapse internal whitespace — espeak-ng raises a line-count mismatch
        # error when a token contains a newline character.
        clean = " ".join(req.text.split())
        chunks = _split_into_chunks(clean)
        segments = []
        for chunk in chunks:
            # KPipeline yields (graphemes, phonemes, audio) — audio is always 24 kHz
            for _, _, audio in _pipeline(chunk, voice=kokoro_voice, speed=1.0):
                if audio is not None:
                    segments.append(np.atleast_1d(audio))
        combined = np.concatenate(segments) if segments else np.zeros(1, dtype=np.float32)
        buf = io.BytesIO()
        sf.write(buf, combined, 24000, format="WAV")
        buf.seek(0)
        return buf.read()

    loop = asyncio.get_event_loop()
    wav = await loop.run_in_executor(None, _run)
    return Response(content=wav, media_type="audio/wav")


@app.get("/voices")
async def list_voices():
    return {"voices": [{"id": k, "label": k.capitalize()} for k in VOICES]}


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _pipeline is not None}
