"""
Redis cache helpers.

Wraps a module-level async Redis client with thin get/set/del helpers that
silently fall through on any error — if Redis is down, requests hit MongoDB
as normal. This means caching is purely an optimisation and never a hard
dependency.

Cache key conventions
---------------------
  cache:user:{user_id}     — serialised user document, TTL 5 min
  cache:doc:{doc_id}       — serialised formatted document, TTL 10 min
  cache:docs:user:{user_id} — serialised document list for a user, TTL 60 s
"""

import json
from datetime import datetime

from bson import ObjectId
from redis.asyncio import Redis

from .logger import setup_logger

logger = setup_logger("nasoma.cache")

_redis: Redis | None = None

# TTLs in seconds
TTL_USER     = 300    # 5 min — short enough to catch deleted accounts
TTL_DOCUMENT = 600    # 10 min
TTL_DOC_LIST = 300    # 5 min — progress updates no longer invalidate this,
                      # so only create/rename/delete bust the list cache


async def connect_cache(url: str) -> None:
    global _redis
    _redis = Redis.from_url(url, decode_responses=True)
    # Verify connectivity so startup fails fast on misconfiguration.
    await _redis.ping()
    logger.info("Connected to Redis at %s", url)


async def close_cache() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        logger.info("Redis connection closed")


# ── JSON serialisation helpers 

class _Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return {"__oid__": str(obj)}
        if isinstance(obj, datetime):
            return {"__dt__": obj.isoformat()}
        return super().default(obj)


def _decode(obj: dict):
    if "__oid__" in obj:
        return ObjectId(obj["__oid__"])
    if "__dt__" in obj:
        return datetime.fromisoformat(obj["__dt__"])
    return obj


def _dumps(value) -> str:
    return json.dumps(value, cls=_Encoder)


def _loads(raw: str):
    return json.loads(raw, object_hook=_decode)


# ── Public API

async def cache_get(key: str):
    if not _redis:
        return None
    try:
        raw = await _redis.get(key)
        return _loads(raw) if raw else None
    except Exception as exc:
        logger.debug("cache_get miss/error for %s: %s", key, exc)
        return None


async def cache_set(key: str, value, ttl: int) -> None:
    if not _redis:
        return
    try:
        await _redis.setex(key, ttl, _dumps(value))
    except Exception as exc:
        logger.debug("cache_set error for %s: %s", key, exc)


async def cache_del(*keys: str) -> None:
    if not _redis or not keys:
        return
    try:
        await _redis.delete(*keys)
    except Exception as exc:
        logger.debug("cache_del error for %s: %s", keys, exc)
