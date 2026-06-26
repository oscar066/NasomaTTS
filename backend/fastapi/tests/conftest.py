"""Shared fixtures for the NasomaTTS test suite.

Strategy:
- Beanie is initialized once per session with mongomock_motor so model
  class-level field expressions (User.words_read, etc.) work without a real DB.
- httpx.AsyncClient + ASGITransport for async HTTP tests (no real server).
- Beanie model methods are patched per-test with AsyncMock.
- get_current_user is overridden via dependency_overrides for auth tests.
- Lifespan hooks (connect_db, connect_cache, tts_service.load) are patched
  so no real connections are attempted on startup.
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch

import beanie
import mongomock_motor
import pytest
import pytest_asyncio
from beanie import PydanticObjectId
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.document import NasomaDocument
from app.models.document_page import NasomaDocumentPage
from app.models.reading_activity import ReadingActivity
from app.models.user import User
from app.utils.deps import get_current_user


# ── Session-scoped Beanie init ────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_beanie():
    """Initialize Beanie once with an in-memory mongomock database.

    This makes model class-level field expressions (e.g. User.words_read > 0)
    work in tests without a real MongoDB connection.
    """
    client = mongomock_motor.AsyncMongoMockClient()
    await beanie.init_beanie(
        database=client["nasoma_test"],
        document_models=[User, NasomaDocument, NasomaDocumentPage, ReadingActivity],
    )


# ── Factories ─────────────────────────────────────────────────────────────────

def make_user(**kwargs) -> User:
    uid = PydanticObjectId()
    return User.model_construct(
        id=uid,
        email=kwargs.get("email", "test@example.com"),
        username=kwargs.get("username", "testuser"),
        hashed_password="hashed",
        avatar="https://gravatar.com/avatar/test",
        plan=kwargs.get("plan", "free"),
        words_read=kwargs.get("words_read", 0),
        is_active=kwargs.get("is_active", True),
        is_verified=kwargs.get("is_verified", True),
        is_superuser=kwargs.get("is_superuser", False),
        created_at=datetime(2024, 1, 1),
    )


def make_doc(author: User | None = None, **kwargs) -> NasomaDocument:
    author_id = author.id if author else PydanticObjectId()
    return NasomaDocument.model_construct(
        id=PydanticObjectId(),
        title=kwargs.get("title", "Test Document"),
        content=kwargs.get("content", "Some test content."),
        pdf_url=kwargs.get("pdf_url", None),
        thumbnail_url=kwargs.get("thumbnail_url", None),
        page_count=kwargs.get("page_count", None),
        total_word_count=kwargs.get("total_word_count", None),
        current_page=kwargs.get("current_page", 0),
        reading_status=kwargs.get("reading_status", None),
        author=author_id,
        gutenberg_id=kwargs.get("gutenberg_id", None),
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    )


# ── Lifespan patches ──────────────────────────────────────────────────────────

LIFESPAN_PATCHES = [
    patch("app.main.connect_db",       new_callable=AsyncMock),
    patch("app.main.close_db",         new_callable=AsyncMock),
    patch("app.main.connect_cache",    new_callable=AsyncMock),
    patch("app.main.close_cache",      new_callable=AsyncMock),
    patch("app.main.run_migrations",   new_callable=AsyncMock),
    patch("app.main.tts_service.load", new_callable=AsyncMock),
    patch("app.main.create_pool",      new_callable=AsyncMock),
    patch("app.workers.pool.set_pool"),
]


# ── HTTP client fixtures ──────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client():
    """Unauthenticated async client with all I/O patched out."""
    with _apply_patches(LIFESPAN_PATCHES):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authed_client():
    """Async client with get_current_user returning a free-plan user."""
    user = make_user()
    app.dependency_overrides[get_current_user] = lambda: user

    with _apply_patches(LIFESPAN_PATCHES):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c, user

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def pro_client():
    """Async client with a pro-plan user."""
    user = make_user(plan="pro")
    app.dependency_overrides[get_current_user] = lambda: user

    with _apply_patches(LIFESPAN_PATCHES):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c, user

    app.dependency_overrides.clear()


# ── Helpers ───────────────────────────────────────────────────────────────────

class _MultiPatchCtx:
    def __init__(self, patches):
        self._patches = patches

    def __enter__(self):
        for p in self._patches:
            p.start()
        return self

    def __exit__(self, *_):
        for p in self._patches:
            p.stop()


def _apply_patches(patches):
    return _MultiPatchCtx(patches)
