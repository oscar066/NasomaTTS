"""
Kokoro TTS — Modal serverless GPU deployment.

Endpoints:
    GET  /health              → {"status": "healthy"}
    POST /v1/audio/speech     → WAV audio bytes (OpenAI-compatible)
"""

import io
import modal

# Modal app
app = modal.App("nasoma-kokoro")

# Image: Python 3.11 + Kokoro + audio libs
kokoro_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "kokoro>=0.9.4",
        "soundfile",
        "numpy",
        "fastapi[standard]",
        "pydantic",
    )
)

# Persistent volume caches the HuggingFace model download across cold starts
model_cache = modal.Volume.from_name("nasoma-kokoro-cache", create_if_missing=True)

# Branded name → Kokoro native ID (also accepts native IDs directly)
VOICE_MAP: dict[str, str] = {
    # American Female
    "sophia":   "af_heart",
    "luna":     "af_alloy",
    "aria":     "af_aoede",
    "bella":    "af_bella",
    "zara":     "af_jessica",
    "iris":     "af_kore",
    "nina":     "af_nicole",
    "nova":     "af_nova",
    "river":    "af_river",
    "sarah":    "af_sarah",
    "sky":      "af_sky",
    # American Male
    "oscar":     "am_adam",
    "echo":     "am_echo",
    "eli":      "am_eric",
    "thor":     "am_fenrir",
    "liam":     "am_liam",
    "max":      "am_michael",
    "onyx":     "am_onyx",
    "rex":      "am_puck",
    # British Female
    "alice":    "bf_alice",
    "emma":     "bf_emma",
    "isabella": "bf_isabella",
    "lily":     "bf_lily",
    # British Male
    "daniel":   "bm_daniel",
    "fable":    "bm_fable",
    "george":   "bm_george",
    "lewis":    "bm_lewis",
}


# Service class
@app.cls(
    image=kokoro_image,
    gpu="T4",
    volumes={"/root/.cache/huggingface": model_cache},
    scaledown_window=300,
)
@modal.concurrent(max_inputs=4)
class KokoroService:

    @modal.enter()
    def load(self):
        from kokoro import KPipeline
        self._pipeline_a = KPipeline(lang_code="a")  # American English
        self._pipeline_b = KPipeline(lang_code="b")  # British English

    @modal.asgi_app()
    def serve(self):
        """Return a FastAPI app with OpenAI-compatible TTS endpoints."""
        import numpy as np
        import soundfile as sf
        from fastapi import FastAPI
        from fastapi.responses import Response
        from pydantic import BaseModel

        api = FastAPI(title="Nasoma Kokoro TTS")

        class SpeechRequest(BaseModel):
            model: str = "kokoro"
            input: str
            voice: str = "af_heart"
            response_format: str = "wav"
            speed: float = 1.0

        @api.get("/health")
        def health():
            return {"status": "healthy"}

        @api.post("/v1/audio/speech")
        def synthesize(req: SpeechRequest):
            voice = VOICE_MAP.get(req.voice, req.voice)
            pipeline = (
                self._pipeline_b
                if voice.startswith("bf_") or voice.startswith("bm_")
                else self._pipeline_a
            )
            segments = []
            for _, _, audio in pipeline(req.input, voice=voice, speed=req.speed):
                if audio is not None:
                    segments.append(np.atleast_1d(audio))

            combined = (
                np.concatenate(segments) if segments
                else np.zeros(1, dtype=np.float32)
            )
            # issues in some browser decoders).
            pcm16 = (np.clip(combined, -1.0, 1.0) * 32767).astype(np.int16)
            buf = io.BytesIO()
            sf.write(buf, pcm16, 24000, format="WAV", subtype="PCM_16")
            buf.seek(0)
            return Response(content=buf.read(), media_type="audio/wav")

        return api
