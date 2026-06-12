"""
Unit tests for the cache helpers in app/utils/cache.py.

These tests exercise the serialisation round-trips and the silent-failure
behaviour when Redis is unavailable (_redis is None).
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.utils.cache import (
    _dumps,
    _loads,
    cache_del,
    cache_get,
    cache_set,
)


# ── Serialisation helpers ─────────────────────────────────────────────────────

def test_objectid_round_trip():
    oid = ObjectId()
    data = {"_id": oid, "name": "test"}
    assert _loads(_dumps(data)) == data


def test_datetime_round_trip():
    dt = datetime(2024, 6, 15, 12, 0, 0)
    data = {"createdAt": dt}
    assert _loads(_dumps(data)) == data


def test_nested_types_round_trip():
    oid = ObjectId()
    dt = datetime(2024, 1, 1)
    data = {"_id": oid, "nested": {"ts": dt, "count": 42}, "items": [1, 2, 3]}
    assert _loads(_dumps(data)) == data


def test_plain_dict_round_trip():
    data = {"title": "Test", "pages": None, "current_page": 0}
    assert _loads(_dumps(data)) == data


# ── Behaviour when Redis is off (_redis = None) ───────────────────────────────

@pytest.mark.asyncio
async def test_cache_get_returns_none_when_redis_off():
    with patch("app.utils.cache._redis", None):
        result = await cache_get("any:key")
    assert result is None


@pytest.mark.asyncio
async def test_cache_set_is_noop_when_redis_off():
    with patch("app.utils.cache._redis", None):
        # Should not raise
        await cache_set("any:key", {"data": 1}, ttl=60)


@pytest.mark.asyncio
async def test_cache_del_is_noop_when_redis_off():
    with patch("app.utils.cache._redis", None):
        await cache_del("key1", "key2")


# ── Behaviour with a live (mocked) Redis client ───────────────────────────────

@pytest.mark.asyncio
async def test_cache_get_returns_cached_value():
    oid = ObjectId()
    payload = {"_id": oid, "title": "cached"}
    mock_redis = AsyncMock()
    mock_redis.get.return_value = _dumps(payload)

    with patch("app.utils.cache._redis", mock_redis):
        result = await cache_get("cache:doc:123")

    assert result == payload
    mock_redis.get.assert_called_once_with("cache:doc:123")


@pytest.mark.asyncio
async def test_cache_get_returns_none_on_miss():
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    with patch("app.utils.cache._redis", mock_redis):
        result = await cache_get("cache:doc:missing")

    assert result is None


@pytest.mark.asyncio
async def test_cache_set_stores_serialised_value():
    mock_redis = AsyncMock()
    payload = {"title": "hello", "count": 7}

    with patch("app.utils.cache._redis", mock_redis):
        await cache_set("cache:test", payload, ttl=300)

    mock_redis.setex.assert_called_once_with("cache:test", 300, _dumps(payload))


@pytest.mark.asyncio
async def test_cache_del_removes_keys():
    mock_redis = AsyncMock()

    with patch("app.utils.cache._redis", mock_redis):
        await cache_del("key:a", "key:b")

    mock_redis.delete.assert_called_once_with("key:a", "key:b")


@pytest.mark.asyncio
async def test_cache_get_swallows_redis_error():
    mock_redis = AsyncMock()
    mock_redis.get.side_effect = Exception("connection lost")

    with patch("app.utils.cache._redis", mock_redis):
        result = await cache_get("cache:broken")

    assert result is None  # error swallowed, returns None


@pytest.mark.asyncio
async def test_cache_set_swallows_redis_error():
    mock_redis = AsyncMock()
    mock_redis.setex.side_effect = Exception("connection lost")

    with patch("app.utils.cache._redis", mock_redis):
        await cache_set("cache:broken", {"x": 1}, ttl=60)  # must not raise
