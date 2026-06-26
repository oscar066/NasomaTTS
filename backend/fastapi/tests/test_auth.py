"""Tests for Google auth and user stats/activity routes."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.auth.setup import get_user_manager
from tests.conftest import make_user


def _mock_google_http(status: int, payload: dict):
    """Return a patched httpx.AsyncClient that returns a fake Google response."""
    mock_resp = MagicMock()
    mock_resp.status_code = status
    mock_resp.json.return_value = payload
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_resp)
    return patch("app.services.auth_service.httpx.AsyncClient", return_value=mock_client)


def _override_user_manager(app, manager):
    async def _dep():
        yield manager
    app.dependency_overrides[get_user_manager] = _dep


# ── POST /auth/google ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_google_auth_invalid_token(client):
    with _mock_google_http(400, {}):
        resp = await client.post("/auth/google", json={"id_token": "bad-token"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_google_auth_missing_email(client):
    with _mock_google_http(200, {"name": "Alice"}):
        resp = await client.post("/auth/google", json={"id_token": "tok"})
    assert resp.status_code == 400
    assert "email" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_google_auth_existing_user(client):
    from app.main import app as _app
    user = make_user(email="alice@example.com")
    mock_manager = MagicMock()
    mock_manager.get_by_email = AsyncMock(return_value=user)
    _override_user_manager(_app, mock_manager)

    with _mock_google_http(200, {"email": "alice@example.com", "name": "Alice"}):
        with patch("app.services.auth_service.get_jwt_strategy") as MockJWT:
            MockJWT.return_value.write_token = AsyncMock(return_value="jwt-token")
            resp = await client.post("/auth/google", json={"id_token": "valid-tok"})

    _app.dependency_overrides.pop(get_user_manager, None)
    assert resp.status_code == 200
    assert resp.json()["access_token"] == "jwt-token"
    assert resp.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_google_auth_inactive_user(client):
    from app.main import app as _app
    user = make_user(is_active=False)
    mock_manager = MagicMock()
    mock_manager.get_by_email = AsyncMock(return_value=user)
    _override_user_manager(_app, mock_manager)

    with _mock_google_http(200, {"email": "alice@example.com", "name": "Alice"}):
        resp = await client.post("/auth/google", json={"id_token": "valid-tok"})

    _app.dependency_overrides.pop(get_user_manager, None)
    assert resp.status_code == 400
    assert "disabled" in resp.json()["detail"].lower()


# ── GET /users/me/stats ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_stats_requires_auth(client):
    resp = await client.get("/users/me/stats")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_stats_no_words_read(authed_client):
    client, user = authed_client
    # words_read == 0 → rank branch is skipped entirely, no DB call needed
    resp = await client.get("/users/me/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["words_read"] == 0
    assert data["rank"] is None


@pytest.mark.asyncio
async def test_get_stats_with_rank(authed_client):
    client, user = authed_client
    object.__setattr__(user, "words_read", 500)
    # Patch the find().count() chain; args are Beanie expressions we don't need to evaluate
    mock_find = MagicMock()
    mock_find.return_value.count = AsyncMock(return_value=4)
    with patch("app.routes.auth_router.User.find", mock_find):
        resp = await client.get("/users/me/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["words_read"] == 500
    assert data["rank"] == 5


# ── GET /users/me/reading-activity ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_reading_activity_requires_auth(client):
    resp = await client.get("/users/me/reading-activity")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_reading_activity_returns_30_days(authed_client):
    client, user = authed_client
    mock_find = MagicMock()
    mock_find.return_value.to_list = AsyncMock(return_value=[])
    with patch("app.routes.auth_router.ReadingActivity.find", mock_find):
        resp = await client.get("/users/me/reading-activity")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["days"]) == 30
    assert all(d["words_read"] == 0 for d in data["days"])


@pytest.mark.asyncio
async def test_reading_activity_fills_known_dates(authed_client):
    client, user = authed_client
    today = date.today()
    entry = MagicMock()
    entry.date = today.isoformat()
    entry.words_read = 120

    mock_find = MagicMock()
    mock_find.return_value.to_list = AsyncMock(return_value=[entry])
    with patch("app.routes.auth_router.ReadingActivity.find", mock_find):
        resp = await client.get("/users/me/reading-activity")

    assert resp.status_code == 200
    days = resp.json()["days"]
    today_entry = next((d for d in days if d["date"] == today.isoformat()), None)
    assert today_entry is not None
    assert today_entry["words_read"] == 120
