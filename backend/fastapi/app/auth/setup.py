import hashlib
from typing import Any, Optional

from beanie import PydanticObjectId
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import BeanieUserDatabase

from ..models.user import User
from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.auth")


async def get_user_db():
    yield BeanieUserDatabase(User)


class UserManager(BaseUserManager[User, PydanticObjectId]):
    reset_password_token_secret = settings.jwt_secret
    verification_token_secret = settings.jwt_secret

    def parse_id(self, value: Any) -> PydanticObjectId:
        return PydanticObjectId(value)

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        h = hashlib.md5(user.email.lower().encode()).hexdigest()
        await user.set({"avatar": f"https://www.gravatar.com/avatar/{h}?s=200&r=pg&d=mm"})
        logger.info("User registered: %s", user.email)

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        # TODO: send password reset email with token
        logger.info("Password reset requested for %s (token: %s)", user.email, token)

    async def on_after_reset_password(self, user: User, request: Optional[Request] = None):
        logger.info("Password reset successful for %s", user.email)


async def get_user_manager(user_db: BeanieUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


bearer_transport = BearerTransport(tokenUrl="/auth/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=settings.jwt_secret,
        lifetime_seconds=settings.jwt_expire_hours * 3600,
    )


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, PydanticObjectId](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)
