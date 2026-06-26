"""Tests for /documents/* routes."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from beanie import PydanticObjectId

from tests.conftest import make_doc, make_user


# ── GET /documents/me ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_my_documents_requires_auth(client):
    resp = await client.get("/documents/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_my_documents_empty(authed_client):
    client, user = authed_client
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.find.return_value.to_list = AsyncMock(return_value=[])
        with patch("app.routes.documents_router.cache_get", AsyncMock(return_value=None)):
            with patch("app.routes.documents_router.cache_set", AsyncMock()):
                resp = await client.get("/documents/me")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_my_documents_served_from_cache(authed_client):
    client, user = authed_client
    cached = [{"id": "abc", "title": "Cached"}]
    with patch("app.routes.documents_router.cache_get", AsyncMock(return_value=cached)):
        resp = await client.get("/documents/me")
    assert resp.status_code == 200
    assert resp.json() == cached


@pytest.mark.asyncio
async def test_my_documents_returns_list(authed_client):
    client, user = authed_client
    doc = make_doc(author=user)
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.find.return_value.to_list = AsyncMock(return_value=[doc])
        with patch("app.routes.documents_router.cache_get", AsyncMock(return_value=None)):
            with patch("app.routes.documents_router.cache_set", AsyncMock()):
                resp = await client.get("/documents/me")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == doc.title


# ── GET /documents/{doc_id} ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_document_invalid_id(client):
    resp = await client.get("/documents/not-a-valid-id")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_document_not_found(authed_client):
    client, user = authed_client
    with patch("app.routes.documents_router.cache_get", AsyncMock(return_value=None)):
        with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
            MockDoc.get = AsyncMock(return_value=None)
            resp = await client.get(f"/documents/{PydanticObjectId()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_document_served_from_cache(authed_client):
    client, user = authed_client
    cached = {"id": str(PydanticObjectId()), "title": "Cached"}
    with patch("app.routes.documents_router.cache_get", AsyncMock(return_value=cached)):
        resp = await client.get(f"/documents/{PydanticObjectId()}")
    assert resp.status_code == 200
    assert resp.json() == cached


@pytest.mark.asyncio
async def test_get_document_success(authed_client):
    client, user = authed_client
    doc = make_doc(author=user)
    with patch("app.routes.documents_router.cache_get", AsyncMock(return_value=None)):
        with patch("app.routes.documents_router.cache_set", AsyncMock()):
            with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
                MockDoc.get = AsyncMock(return_value=doc)
                with patch("app.routes.documents_router.User") as MockUser:
                    MockUser.get = AsyncMock(return_value=user)
                    resp = await client.get(f"/documents/{doc.id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == doc.title


# ── POST /documents ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_document_requires_auth(client):
    resp = await client.post("/documents", json={"title": "Book", "content": "text"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_document_missing_title(authed_client):
    client, user = authed_client
    resp = await client.post("/documents", json={"title": "", "content": "text"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_document_title_too_long(authed_client):
    client, user = authed_client
    resp = await client.post("/documents", json={"title": "x" * 201, "content": "text"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_document_free_plan_limit(authed_client):
    client, user = authed_client
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.find.return_value.count = AsyncMock(return_value=5)
        resp = await client.post("/documents", json={"title": "Book", "content": "text"})
    assert resp.status_code == 403
    assert "limit" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_document_success(authed_client):
    client, user = authed_client
    doc = make_doc(author=user, title="My Book")
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.find.return_value.count = AsyncMock(return_value=0)
        instance = MagicMock()
        instance.insert = AsyncMock(return_value=doc)
        MockDoc.return_value = instance
        with patch("app.routes.documents_router.cache_del", AsyncMock()):
            resp = await client.post("/documents", json={"title": "My Book", "content": "text"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "My Book"


# ── DELETE /documents/{doc_id} ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_document_requires_auth(client):
    resp = await client.delete(f"/documents/{PydanticObjectId()}")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_document_not_found(authed_client):
    client, user = authed_client
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=None)
        resp = await client.delete(f"/documents/{PydanticObjectId()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_document_not_owner(authed_client):
    client, user = authed_client
    doc = make_doc()  # different author
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        resp = await client.delete(f"/documents/{doc.id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_document_success(authed_client):
    client, user = authed_client
    doc = make_doc(author=user)
    object.__setattr__(doc, "delete", AsyncMock())
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        with patch("app.routes.documents_router.NasomaDocumentPage") as MockPage:
            MockPage.find.return_value.delete = AsyncMock()
            with patch("app.routes.documents_router.cache_del", AsyncMock()):
                resp = await client.delete(f"/documents/{doc.id}")
    assert resp.status_code == 200
    assert resp.json()["success"] is True


# ── PATCH /documents/{doc_id}/rename ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_rename_document_empty_title(authed_client):
    client, user = authed_client
    resp = await client.patch(f"/documents/{PydanticObjectId()}/rename", json={"title": "  "})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_rename_document_not_owner(authed_client):
    client, user = authed_client
    doc = make_doc()  # different author
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        resp = await client.patch(f"/documents/{doc.id}/rename", json={"title": "New"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_rename_document_success(authed_client):
    client, user = authed_client
    doc = make_doc(author=user)
    object.__setattr__(doc, "set", AsyncMock())
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        with patch("app.routes.documents_router.cache_del", AsyncMock()):
            resp = await client.patch(f"/documents/{doc.id}/rename", json={"title": "New Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


# ── PATCH /documents/{doc_id}/progress ───────────────────────────────────────

@pytest.mark.asyncio
async def test_update_progress_not_owner(authed_client):
    client, user = authed_client
    doc = make_doc()
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        resp = await client.patch(f"/documents/{doc.id}/progress", json={"current_page": 3})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_progress_success(authed_client):
    client, user = authed_client
    # Keep new page == old page so the word-count branch is skipped entirely,
    # avoiding Beanie field expression comparisons on the mocked class.
    doc = make_doc(author=user, current_page=3)
    object.__setattr__(doc, "set", AsyncMock())
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        with patch("app.routes.documents_router.cache_del", AsyncMock()):
            resp = await client.patch(f"/documents/{doc.id}/progress", json={"current_page": 3})
    assert resp.status_code == 200
    assert resp.json()["current_page"] == 3


# ── PATCH /documents/{doc_id}/status ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_status_success(authed_client):
    client, user = authed_client
    doc = make_doc(author=user)
    object.__setattr__(doc, "set", AsyncMock())
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        with patch("app.routes.documents_router.cache_del", AsyncMock()):
            resp = await client.patch(f"/documents/{doc.id}/status", json={"reading_status": "finished"})
    assert resp.status_code == 200
    assert resp.json()["reading_status"] == "finished"


@pytest.mark.asyncio
async def test_update_status_not_owner(authed_client):
    client, user = authed_client
    doc = make_doc()
    with patch("app.routes.documents_router.NasomaDocument") as MockDoc:
        MockDoc.get = AsyncMock(return_value=doc)
        resp = await client.patch(f"/documents/{doc.id}/status", json={"reading_status": "finished"})
    assert resp.status_code == 403
