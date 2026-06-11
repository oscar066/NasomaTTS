"""
Voice listing route.

Exposes the voices available on the server so the client can populate its
voice selector.  The list is derived from the NeuTTS preset voices that were
successfully loaded at startup.

Routes
------
GET /voices/    — Return available voices and TTS availability flag.
"""

from fastapi import APIRouter

from ..services.tts import tts_service

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("")
async def list_voices():
    """Return available TTS voices and engine availability.

    Response shape::

        {
            "voices": [{"id": "dave", "label": "Dave"}, ...],
            "tts_available": true
        }

    When ``tts_available`` is ``false`` the ``voices`` list is empty and the
    client should fall back to the browser's Web Speech API.
    """
    return {
        "voices": tts_service.list_voices(),
        "tts_available": tts_service.available,
    }
