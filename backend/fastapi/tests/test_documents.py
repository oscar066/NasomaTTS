from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from tests.conftest import AsyncCursor, make_doc, make_user


# ── GET /documents/me ─────────────────────────────────────────────────────────

def test_my_documents_requires_auth(client):
    response = client.get("/documents/me")
    assert response.status_code == 403


def test_my_documents_empty(authed_client):
    client, user, mock_db = authed_client
    mock_db.documents.find.return_value = AsyncCursor([])

    response = client.get("/documents/me")

    assert response.status_code == 200
    assert response.json() == []


def test_my_documents_returns_list(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=user["_id"])
    mock_db.documents.find.return_value = AsyncCursor([doc])

    response = client.get("/documents/me")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == doc["title"]
    assert data[0]["id"] == str(doc["_id"])


def test_my_documents_served_from_cache(authed_client):
    client, user, mock_db = authed_client
    cached = [{"id": "cached_id", "title": "Cached Doc"}]

    with patch("app.routes.documents_router.cache_get", new=AsyncMock(return_value=cached)):
        response = client.get("/documents/me")

    assert response.status_code == 200
    assert response.json() == cached
    mock_db.documents.find.assert_not_called()


# ── GET /documents/{doc_id} ───────────────────────────────────────────────────

def test_get_document_success(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=user["_id"])
    mock_db.documents.find_one.return_value = doc
    mock_db.users.find_one.return_value = user

    response = client.get(f"/documents/{doc['_id']}")

    assert response.status_code == 200
    assert response.json()["title"] == doc["title"]


def test_get_document_not_found(authed_client):
    client, user, mock_db = authed_client
    mock_db.documents.find_one.return_value = None

    response = client.get(f"/documents/{ObjectId()}")

    assert response.status_code == 404


def test_get_document_invalid_id(client):
    response = client.get("/documents/not-a-valid-id")
    assert response.status_code == 400


def test_get_document_served_from_cache(authed_client):
    client, user, mock_db = authed_client
    cached_doc = {"id": str(ObjectId()), "title": "Cached"}

    with patch("app.routes.documents_router.cache_get", new=AsyncMock(return_value=cached_doc)):
        response = client.get(f"/documents/{ObjectId()}")

    assert response.status_code == 200
    assert response.json() == cached_doc
    mock_db.documents.find_one.assert_not_called()


# ── POST /documents/ ──────────────────────────────────────────────────────────

def test_create_document_success(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=user["_id"])
    inserted = MagicMock()
    inserted.inserted_id = doc["_id"]
    mock_db.documents.insert_one.return_value = inserted
    mock_db.documents.find_one.return_value = doc

    response = client.post(
        "/documents",
        json={"title": "My Book", "content": "Once upon a time..."},
    )

    assert response.status_code == 200
    assert response.json()["title"] == doc["title"]


def test_create_document_missing_title(authed_client):
    client, user, mock_db = authed_client

    response = client.post("/documents", json={"title": "", "content": "text"})

    assert response.status_code == 400


def test_create_document_title_too_long(authed_client):
    client, user, mock_db = authed_client

    response = client.post(
        "/documents",
        json={"title": "x" * 201, "content": "text"},
    )

    assert response.status_code == 400


def test_create_document_requires_auth(client):
    response = client.post("/documents", json={"title": "Book", "content": "text"})
    assert response.status_code == 403


# ── DELETE /documents/{doc_id} ────────────────────────────────────────────────

def test_delete_document_success(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=user["_id"])
    mock_db.documents.find_one.return_value = doc

    response = client.delete(f"/documents/{doc['_id']}")

    assert response.status_code == 200
    assert response.json()["success"] is True
    mock_db.documents.delete_one.assert_called_once()


def test_delete_document_not_owner(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=ObjectId())  # different author
    mock_db.documents.find_one.return_value = doc

    response = client.delete(f"/documents/{doc['_id']}")

    assert response.status_code == 403


def test_delete_document_not_found(authed_client):
    client, user, mock_db = authed_client
    mock_db.documents.find_one.return_value = None

    response = client.delete(f"/documents/{ObjectId()}")

    assert response.status_code == 404


# ── PATCH /documents/{doc_id}/rename ─────────────────────────────────────────

def test_rename_document_success(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=user["_id"])
    mock_db.documents.find_one.return_value = doc

    response = client.patch(
        f"/documents/{doc['_id']}/rename",
        json={"title": "New Title"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "New Title"
    mock_db.documents.update_one.assert_called_once()


def test_rename_document_empty_title(authed_client):
    client, user, mock_db = authed_client

    response = client.patch(f"/documents/{ObjectId()}/rename", json={"title": "  "})

    assert response.status_code == 400


def test_rename_document_not_owner(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=ObjectId())
    mock_db.documents.find_one.return_value = doc

    response = client.patch(f"/documents/{doc['_id']}/rename", json={"title": "New"})

    assert response.status_code == 403


# ── PATCH /documents/{doc_id}/progress ───────────────────────────────────────

def test_update_progress_success(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=user["_id"])
    mock_db.documents.find_one.return_value = doc

    response = client.patch(
        f"/documents/{doc['_id']}/progress",
        json={"current_page": 5},
    )

    assert response.status_code == 200
    assert response.json()["current_page"] == 5
    mock_db.documents.update_one.assert_called_once()


def test_update_progress_not_owner(authed_client):
    client, user, mock_db = authed_client
    doc = make_doc(author_id=ObjectId())
    mock_db.documents.find_one.return_value = doc

    response = client.patch(f"/documents/{doc['_id']}/progress", json={"current_page": 3})

    assert response.status_code == 403
