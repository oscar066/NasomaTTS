"""Auth business logic — Google sign-in and JWT minting."""

import hashlib
import secrets

import httpx
from fastapi import HTTPException
from fastapi_users import exceptions
from fastapi_users.password import PasswordHelper

from ..auth.setup import UserManager, get_jwt_strategy
from ..models.user import User


async def google_sign_in(id_token: str, user_manager: UserManager) -> tuple[User, str]:
    """Verify a Google id_token, find or create the user, and return (user, jwt)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    data    = resp.json()
    email   = data.get("email")
    name    = data.get("name") or (email.split("@")[0] if email else "User")
    picture = data.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

    try:
        user = await user_manager.get_by_email(email)
    except exceptions.UserNotExists:
        h    = hashlib.md5(email.lower().encode()).hexdigest()
        user = User(
            email           = email,
            hashed_password = PasswordHelper().hash(secrets.token_urlsafe(32)),
            username        = name,
            avatar          = picture or f"https://www.gravatar.com/avatar/{h}?s=200&r=pg&d=mm",
            is_active       = True,
            is_verified     = True,
        )
        await user.insert()

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    token = await get_jwt_strategy().write_token(user)
    return user, token
