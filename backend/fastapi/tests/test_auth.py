from unittest.mock import MagicMock, AsyncMock
from bson import ObjectId

from tests.conftest import make_token, make_user


# ── Signup ────────────────────────────────────────────────────────────────────

def test_signup_success(client, mock_db):
    mock_db.users.find_one.return_value = None  # no existing user
    inserted = MagicMock()
    inserted.inserted_id = ObjectId()
    mock_db.users.insert_one.return_value = inserted

    response = client.post(
        "/auth/signup",
        json={"username": "alice", "email": "alice@example.com", "password": "secret"},
    )

    assert response.status_code == 200
    assert "token" in response.json()


def test_signup_duplicate(client, mock_db):
    mock_db.users.find_one.return_value = {"_id": ObjectId(), "email": "alice@example.com"}

    response = client.post(
        "/auth/signup",
        json={"username": "alice", "email": "alice@example.com", "password": "secret"},
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_signup_invalid_email(client, mock_db):
    response = client.post(
        "/auth/signup",
        json={"username": "alice", "email": "not-an-email", "password": "secret"},
    )
    assert response.status_code == 422


# ── Signin ────────────────────────────────────────────────────────────────────

def test_signin_success(client, mock_db):
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = {**make_user(), "email": "alice@example.com", "password": pwd.hash("secret")}
    mock_db.users.find_one.return_value = user

    response = client.post(
        "/auth/signin",
        json={"email": "alice@example.com", "password": "secret"},
    )

    assert response.status_code == 200
    assert "token" in response.json()


def test_signin_wrong_password(client, mock_db):
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = {**make_user(), "email": "alice@example.com", "password": pwd.hash("correct")}
    mock_db.users.find_one.return_value = user

    response = client.post(
        "/auth/signin",
        json={"email": "alice@example.com", "password": "wrong"},
    )

    assert response.status_code == 401


def test_signin_unknown_email(client, mock_db):
    mock_db.users.find_one.return_value = None

    response = client.post(
        "/auth/signin",
        json={"email": "nobody@example.com", "password": "secret"},
    )

    assert response.status_code == 401


# ── /auth/me ──────────────────────────────────────────────────────────────────

def test_me_success(client, mock_db):
    user = make_user()
    mock_db.users.find_one.return_value = user
    token = make_token(str(user["_id"]))

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user["email"]
    assert data["username"] == user["username"]
    assert "password" not in data


def test_me_no_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 403


def test_me_invalid_token(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401


def test_me_user_deleted(client, mock_db):
    user = make_user()
    mock_db.users.find_one.return_value = None  # user removed from DB
    token = make_token(str(user["_id"]))

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
