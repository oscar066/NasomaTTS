from fastapi import APIRouter

from ..services.tts import tts_service

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("/")
async def list_voices():
    return {
        "voices": tts_service.list_voices(),
        "tts_available": tts_service.available,
    }
