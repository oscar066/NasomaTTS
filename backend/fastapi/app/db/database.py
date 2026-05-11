from pymongo import AsyncMongoClient
from ..config import settings
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

_client: AsyncMongoClient = None


async def connect_db():
    global _client
    _client = AsyncMongoClient(settings.mongodb_url)
    logger.info("Connected to MongoDB at %s (db: %s)", settings.mongodb_url, settings.mongodb_db)


async def close_db():
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_db():
    return _client[settings.mongodb_db]
