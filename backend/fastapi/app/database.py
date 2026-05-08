from pymongo import AsyncMongoClient
from .config import settings

_client: AsyncMongoClient = None


async def connect_db():
    global _client
    _client = AsyncMongoClient(settings.mongodb_url)


async def close_db():
    global _client
    if _client:
        _client.close()


def get_db():
    return _client[settings.mongodb_db]
