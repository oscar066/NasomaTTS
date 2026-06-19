import hashlib
import secrets

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi_users import exceptions
from fastapi_users.password import PasswordHelper
from pydantic import BaseModel

from ..auth.setup import auth_backend, fastapi_users, get_jwt_strategy, get_user_manager
from ..models.user import User, UserCreate, UserRead, UserUpdate
from ..auth.setup import UserManager
from ..utils.rate_limit import limiter

router = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)


class GoogleAuthBody(BaseModel):
    id_token: str


@router.post("/auth/google", tags=["auth"])
@limiter.limit("10/minute")
async def google_auth(
    request: Request,
    body: GoogleAuthBody,
    user_manager: UserManager = Depends(get_user_manager),
):
    # Verify the Google id_token and get the user's profile
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": body.id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    data     = resp.json()
    email    = data.get("email")
    name     = data.get("name") or (email.split("@")[0] if email else "User")
    picture  = data.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

    # Find existing user or create a new one
    try:
        user = await user_manager.get_by_email(email)
    except exceptions.UserNotExists:
        h      = hashlib.md5(email.lower().encode()).hexdigest()
        avatar = picture or f"https://www.gravatar.com/avatar/{h}?s=200&r=pg&d=mm"
        user   = User(
            email           = email,
            hashed_password = PasswordHelper().hash(secrets.token_urlsafe(32)),
            username        = name,
            avatar          = avatar,
            is_active       = True,
            is_verified     = True,
        )
        await user.insert()

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    # Issue our JWT for the user
    token = await get_jwt_strategy().write_token(user)
    return {"access_token": token, "token_type": "bearer"}
