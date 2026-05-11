import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext

from ..config import settings
from ..db.database import get_db
from ..deps import get_current_user
from ..schemas.schema import UserCreate, UserSignIn
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _gravatar(email: str) -> str:
    h = hashlib.md5(email.lower().encode()).hexdigest()
    return f"https://www.gravatar.com/avatar/{h}?s=200&r=pg&d=mm"


def _make_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    return jwt.encode(
        {"id": user_id, "exp": exp},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


@router.post("/signup")
async def signup(data: UserCreate, db=Depends(get_db)):
    email = data.email.strip().lower()
    if await db.users.find_one({"$or": [{"email": email}, {"username": data.username}]}):
        logger.warning("Signup conflict: email=%s or username=%s already exists", email, data.username)
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
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not pwd_context.verify(data.password, user["password"]):
        logger.warning("Failed signin attempt for email=%s", email)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    logger.info("User signed in: %s", email)
    return {"token": _make_token(str(user["_id"]))}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "avatar": current_user.get("avatar", ""),
        "createdAt": current_user.get("createdAt"),
        "updatedAt": current_user.get("updatedAt"),
    }
