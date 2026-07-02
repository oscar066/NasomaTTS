import hashlib
import secrets
from datetime import datetime
from typing import Any, Optional

from beanie import PydanticObjectId
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import BeanieUserDatabase

from ..models.user import User
from ..utils.config import settings
from ..utils.logger import setup_logger
from ..workers import pool as worker_pool

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
        await self.request_verify(user, request)

    async def on_after_request_verify(self, user: User, token: str, request: Optional[Request] = None):
        verify_url = f"{settings.frontend_url}/auth/verify-email?token={token}"
        pool = worker_pool.get_pool()
        if pool:
            await pool.enqueue_job(
                "send_verification_email",
                username=user.username,
                email=user.email,
                verify_url=verify_url,
            )
            logger.info("Queued verification email for %s", user.email)
        else:
            logger.warning("arq pool not ready — skipping verification email for %s", user.email)

    async def on_after_verify(self, user: User, request: Optional[Request] = None):
        logger.info("Email verified for %s", user.email)

    # TODO (payment integration): add on_after_upgrade hook here.
    # When a user upgrades to Pro, enqueue:
    #   await pool.enqueue_job("index_user_documents", user_id=str(user.id))

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        reset_url = f"{settings.frontend_url}/auth/reset-password?token={token}"
        pool = worker_pool.get_pool()
        if pool:
            await pool.enqueue_job(
                "send_password_reset_email",
                username=user.username,
                email=user.email,
                reset_url=reset_url,
            )
            logger.info("Queued password reset email for %s", user.email)
        else:
            logger.warning("arq pool not ready — skipping password reset email for %s", user.email)

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
