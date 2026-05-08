import asyncio
import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

SAMPLES_DIR = Path(__file__).parent.parent.parent / "samples"

# Preset voices: each entry maps a voice id to its reference audio + transcript.
# Add more by placing a <name>.wav and <name>.txt in the samples/ directory.
PRESET_VOICES: dict[str, dict] = {
    "dave": {
        "label": "Dave",
        "audio": SAMPLES_DIR / "dave.wav",
        "text": SAMPLES_DIR / "dave.txt",
    },
}


class TTSService:
    def __init__(self):
        self._tts = None
        self._ref_codes: dict = {}
        self._ref_texts: dict = {}

    async def load(self):
        """Load NeuTTS Air at startup. Gracefully degrades if unavailable."""
        try:
            from neutts import NeuTTS

            loop = asyncio.get_event_loop()
            self._tts = await loop.run_in_executor(
                None,
                lambda: NeuTTS(
                    backbone_repo="neuphonic/neutts-air-q4-gguf",
                    backbone_device="cpu",
                    codec_repo="neuphonic/neucodec",
                    codec_device="cpu",
                ),
            )

            for voice_id, info in PRESET_VOICES.items():
                if not info["audio"].exists() or not info["text"].exists():
                    logger.warning("Sample files missing for voice '%s' — skipping", voice_id)
                    continue
                ref_text = info["text"].read_text().strip()
                ref_codes = await loop.run_in_executor(
                    None, lambda p=info["audio"]: self._tts.encode_reference(str(p))
                )
                self._ref_codes[voice_id] = ref_codes
                self._ref_texts[voice_id] = ref_text

            logger.info("NeuTTS Air loaded. Available voices: %s", list(self._ref_codes))
        except Exception as exc:
            logger.warning(
                "NeuTTS Air unavailable (%s). Falling back to Web Speech API on the client.",
                exc,
            )
            self._tts = None

    @property
    def available(self) -> bool:
        return self._tts is not None and bool(self._ref_codes)

    def list_voices(self) -> list[dict]:
        return [
            {"id": vid, "label": PRESET_VOICES[vid]["label"]}
            for vid in self._ref_codes
        ]

    async def synthesize(self, text: str, voice_id: str = "dave") -> Optional[bytes]:
        """Generate WAV audio for *text* using *voice_id*. Returns None if unavailable."""
        if not self.available:
            return None

        if voice_id not in self._ref_codes:
            voice_id = next(iter(self._ref_codes))

        ref_codes = self._ref_codes[voice_id]
        ref_text = self._ref_texts[voice_id]

        loop = asyncio.get_event_loop()
        wav = await loop.run_in_executor(
            None,
            lambda: self._tts.infer(text, ref_codes, ref_text),
        )

        import soundfile as sf

        buf = io.BytesIO()
        sf.write(buf, wav, samplerate=24000, format="WAV")
        buf.seek(0)
        return buf.read()


tts_service = TTSService()
