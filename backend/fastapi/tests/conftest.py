"""
Shared fixtures and helpers for the NasomaTTS test suite.

Strategy
--------
- FastAPI's TestClient (sync) is used for all HTTP-level tests.
- MongoDB and Redis are never touched — the DB is replaced via FastAPI's
  dependency_overrides, and the cache is kept at None (its default) so all
  cache helpers are silent no-ops.
- The lifespan hooks (connect_db, connect_cache, tts_service.load) are patched
  before the TestClient starts so no real connections are attempted.
"""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from jose import jwt

from app.db.database import get_db
from app.main import app
from app.utils.config import settings
from app.utils.deps import get_current_user


# ── Data factories ────────────────────────────────────────────────────────────

def make_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=1)
    return jwt.encode(
        {"id": user_id, "exp": exp},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def make_user(user_id: ObjectId | None = None) -> dict:
    uid = user_id or ObjectId()
    return {
        "_id": uid,
        "username": "testuser",
        "email": "test@example.com",
        "password": "hashed_pw",
        "avatar": "https://gravatar.com/avatar/test",
        "createdAt": datetime(2024, 1, 1),
        "updatedAt": datetime(2024, 1, 1),
    }


def make_doc(doc_id: ObjectId | None = None, author_id: ObjectId | None = None) -> dict:
    did = doc_id or ObjectId()
    aid = author_id or ObjectId()
    return {
        "_id": did,
        "title": "Test Document",
        "content": "Some test content here.",
        "pdf_url": None,
        "thumbnail_url": None,
        "pages": None,
        "current_page": 0,
        "author": aid,
        "createdAt": datetime(2024, 1, 1),
        "updatedAt": datetime(2024, 1, 1),
    }


class AsyncCursor:
    """Simulates Motor's async cursor so 'async for' loops work in mocks."""

    def __init__(self, items: list):
        self._it = iter(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = MagicMock()
    db.users.find.return_value = AsyncCursor([])
    db.documents.find.return_value = AsyncCursor([])
    db.users.find_one = AsyncMock(return_value=None)
    db.documents.find_one = AsyncMock(return_value=None)
    db.users.insert_one = AsyncMock()
    db.documents.insert_one = AsyncMock()
    db.documents.delete_one = AsyncMock()
    db.documents.update_one = AsyncMock()
    return db


@pytest.fixture
def client(mock_db):
    """TestClient with all external connections patched out."""
    app.dependency_overrides[get_db] = lambda: mock_db

    with (
        patch("app.main.connect_db", new_callable=AsyncMock),
        patch("app.main.close_db", new_callable=AsyncMock),
        patch("app.main.connect_cache", new_callable=AsyncMock),
        patch("app.main.close_cache", new_callable=AsyncMock),
        patch("app.services.tts.tts_service.load", new_callable=AsyncMock),
    ):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()


@pytest.fixture
def authed_client(client, mock_db):
    """client with get_current_user returning a fixed test user."""
    user = make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    yield client, user, mock_db
