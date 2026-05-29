"""
NeuTTS text-to-speech service.

Wraps the NeuTTS Air model to provide voice cloning-based speech synthesis.
The service loads at application startup and degrades gracefully when the
model or its dependencies are unavailable — in that case the client falls back
to the browser's Web Speech API automatically.

Voice presets are defined in the ``PRESET_VOICES`` mapping.  Adding a new
voice requires only a ``<name>.wav`` reference audio file and a ``<name>.txt``
transcript in the ``samples/`` directory.
"""

import asyncio
import io
from pathlib import Path
from typing import Optional

from ..utils.logger import setup_logger

logger = setup_logger("nasoma.services.tts")

# Absolute path to the voice sample files, resolved relative to this module.
SAMPLES_DIR = Path(__file__).parent.parent.parent / "samples"

# Preset voice registry.  Each entry maps a voice ID to its reference audio
# file and the transcript of that audio (required by NeuTTS for cloning).
# Add more entries here and place matching files in ``samples/`` to extend.
PRESET_VOICES: dict[str, dict] = {
    "dave": {
        "label": "Dave",
        "audio": SAMPLES_DIR / "dave.wav",
        "text": SAMPLES_DIR / "dave.txt",
    },
}


class TTSService:
    """Singleton service that manages the NeuTTS Air model lifecycle.

    Attributes:
        _tts: The loaded NeuTTS instance, or ``None`` if unavailable.
        _ref_codes: Encoded reference audio tensors keyed by voice ID.
        _ref_texts: Reference transcripts keyed by voice ID — required by the
            NeuTTS cloning algorithm alongside the encoded audio.
    """

    def __init__(self):
        self._tts = None
        self._ref_codes: dict = {}
        self._ref_texts: dict = {}

    async def load(self) -> None:
        """Load the NeuTTS Air model and encode all preset voice references.

        Runs the blocking model-loading code in a thread pool executor so it
        does not block the asyncio event loop during startup.

        If NeuTTS or its dependencies (e.g. ``neutts``, ``soundfile``) are not
        installed, or if model weights cannot be downloaded, the method logs a
        warning and sets ``_tts = None``.  All subsequent calls to
        :meth:`synthesize` will return ``None``, and :attr:`available` will be
        ``False``, triggering the browser TTS fallback on the client.
        """
        try:
            from neutts import NeuTTS

            loop = asyncio.get_event_loop()

            # Loading the model is CPU-bound and can take several seconds —
            # run it in an executor to avoid blocking the event loop.
            self._tts = await loop.run_in_executor(
                None,
                lambda: NeuTTS(
                    backbone_repo="neuphonic/neutts-air-q4-gguf",
                    backbone_device="cpu",
                    codec_repo="neuphonic/neucodec",
                    codec_device="cpu",
                ),
            )

            # Pre-encode each preset voice's reference audio so synthesis
            # requests don't pay the encoding cost at runtime.
            for voice_id, info in PRESET_VOICES.items():
                if not info["audio"].exists() or not info["text"].exists():
                    logger.warning(
                        "Sample files missing for voice '%s' — skipping", voice_id
                    )
                    continue

                ref_text = info["text"].read_text().strip()
                ref_codes = await loop.run_in_executor(
                    None,
                    lambda p=info["audio"]: self._tts.encode_reference(str(p)),
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
        """``True`` if the model is loaded and at least one voice is ready."""
        return self._tts is not None and bool(self._ref_codes)

    def list_voices(self) -> list[dict]:
        """Return the list of available voices as ``[{"id": ..., "label": ...}]``."""
        return [
            {"id": vid, "label": PRESET_VOICES[vid]["label"]}
            for vid in self._ref_codes
        ]

    async def synthesize(self, text: str, voice_id: str = "dave") -> Optional[bytes]:
        """Synthesise speech and return WAV audio bytes.

        Falls back to the first available voice if ``voice_id`` is not found
        in the loaded presets rather than raising an error.

        Args:
            text: The text to convert to speech.
            voice_id: ID of the preset voice to use for cloning.

        Returns:
            WAV audio as ``bytes``, or ``None`` if NeuTTS is unavailable.
        """
        if not self.available:
            return None

        # Fall back to the first loaded voice rather than failing outright when
        # an unknown voice ID is requested.
        if voice_id not in self._ref_codes:
            voice_id = next(iter(self._ref_codes))

        ref_codes = self._ref_codes[voice_id]
        ref_text = self._ref_texts[voice_id]

        loop = asyncio.get_event_loop()

        # Inference is CPU-bound; run in executor to keep the event loop free.
        wav = await loop.run_in_executor(
            None,
            lambda: self._tts.infer(text, ref_codes, ref_text),
        )

        import soundfile as sf

        buf = io.BytesIO()
        sf.write(buf, wav, samplerate=24000, format="WAV")
        buf.seek(0)
        return buf.read()


# Module-level singleton — imported by routers and the lifespan handler.
tts_service = TTSService()
