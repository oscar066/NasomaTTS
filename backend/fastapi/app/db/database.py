"""
MongoDB connection management.

Provides a module-level async client and a FastAPI dependency (:func:`get_db`)
that hands route handlers a reference to the application database.  The
connection is opened once at application startup and closed on shutdown via the
lifespan hooks in ``main.py``.
"""

from pymongo import AsyncMongoClient

from ..config import settings
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.db")

# Module-level client — initialised by connect_db() at startup.
_client: AsyncMongoClient = None


async def connect_db() -> None:
    """Open the MongoDB connection pool.

    Called once from the FastAPI lifespan context manager.  The async client
    maintains an internal connection pool, so this call is non-blocking and
    does not verify connectivity immediately — the first actual query will
    surface any misconfiguration errors.
    """
    global _client
    _client = AsyncMongoClient(settings.mongodb_url)
    logger.info(
        "Connected to MongoDB at %s (db: %s)",
        settings.mongodb_url,
        settings.mongodb_db,
    )


async def close_db() -> None:
    """Close the MongoDB connection pool gracefully on application shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_db():
    """FastAPI dependency that yields the application database handle.

    Usage::

        @router.get("/example")
        async def handler(db=Depends(get_db)):
            doc = await db.collection.find_one({})
    """
    return _client[settings.mongodb_db]
