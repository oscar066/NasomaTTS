import beanie
from motor.motor_asyncio import AsyncIOMotorClient

from ..models.document import NasomaDocument
from ..models.document_page import NasomaDocumentPage
from ..models.reading_activity import ReadingActivity
from ..models.user import User
from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.db")

_client: AsyncIOMotorClient = None


async def connect_db() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_url)
    await beanie.init_beanie(
        database=_client[settings.mongodb_db],
        document_models=[User, NasomaDocument, NasomaDocumentPage, ReadingActivity],
    )
    logger.info("Connected to MongoDB at %s (db: %s)", settings.mongodb_url, settings.mongodb_db)


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_db():
    return _client[settings.mongodb_db]
