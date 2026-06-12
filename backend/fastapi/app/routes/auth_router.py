"""
Authentication routes.

Handles user registration, login, and profile retrieval.  Passwords are hashed
with bcrypt via passlib.  Session tokens are signed JWTs with a configurable
expiry (default 24 hours).

Routes
------
POST /auth/signup   — Register a new user account.
POST /auth/signin   — Authenticate and receive a JWT.
GET  /auth/me       — Return the profile of the currently authenticated user.
"""

import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext

from ..utils.config import settings
from ..db.database import get_db
from ..utils.deps import get_current_user
from ..schemas.schema import UserCreate, UserSignIn
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

# bcrypt password hashing context.  The ``deprecated="auto"`` setting
# automatically re-hashes legacy entries when a user signs in.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _gravatar(email: str) -> str:
    """Return a Gravatar URL for the given email address.

    The URL includes sensible defaults: 200 px, PG-rated content, and the
    mystery-man fallback image (``d=mm``) when no Gravatar is registered.
    """
    h = hashlib.md5(email.lower().encode()).hexdigest()
    return f"https://www.gravatar.com/avatar/{h}?s=200&r=pg&d=mm"


def _make_token(user_id: str) -> str:
    """Sign and return a JWT for the given user ID.

    The token embeds an ``exp`` claim so the server and client can both enforce
    expiry without a database round-trip on every request.
    """
    exp = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    return jwt.encode(
        {"id": user_id, "exp": exp},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


@router.post("/signup")
async def signup(data: UserCreate, db=Depends(get_db)):
    """Register a new user account.

    Validates that neither the email nor the username is already taken, hashes
    the password, and stores the new user document.  Returns a signed JWT so
    the client is immediately authenticated without a separate sign-in step.

    Raises:
        HTTPException 400: If the email or username is already registered.
    """
    email = data.email.strip().lower()

    # Check for duplicate email or username in a single query.
    if await db.users.find_one({"$or": [{"email": email}, {"username": data.username}]}):
        logger.warning(
            "Signup conflict: email=%s or username=%s already exists",
            email,
            data.username,
        )
        raise HTTPException(status_code=400, detail="Username or email already exists")

    now = datetime.utcnow()
    result = await db.users.insert_one(
        {
            "username": data.username,
            "email": email,
            "password": pwd_context.hash(data.password),
            "avatar": _gravatar(email),
            "createdAt": now,
            "updatedAt": now,
        }
    )
    logger.info("New user registered: %s (%s)", data.username, email)
    return {"token": _make_token(str(result.inserted_id))}


@router.post("/signin")
async def signin(data: UserSignIn, db=Depends(get_db)):
    """Authenticate an existing user and return a JWT.

    Deliberately returns the same error message for both "user not found" and
    "wrong password" to prevent email enumeration attacks.

    Raises:
        HTTPException 401: If the credentials are invalid.
    """
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})

    # Verify in one step: missing user and wrong password both return 401.
    if not user or not pwd_context.verify(data.password, user["password"]):
        logger.warning("Failed signin attempt for email=%s", email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info("User signed in: %s", email)
    return {"token": _make_token(str(user["_id"]))}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    """Return the profile of the currently authenticated user.

    Requires a valid ``Authorization: Bearer <token>`` header.  Sensitive
    fields (e.g. password hash) are excluded from the response.
    """
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "avatar": current_user.get("avatar", ""),
        "createdAt": current_user.get("createdAt"),
        "updatedAt": current_user.get("updatedAt"),
    }
