import asyncio
import hashlib
from typing import Any, Optional

import resend
from beanie import PydanticObjectId
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import BeanieUserDatabase

from ..models.user import User
from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.auth")

resend.api_key = settings.resend_api_key


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
        params: resend.Emails.SendParams = {
            "from": "Nasoma <noreply@me-nasoma.com>",
            "to": [user.email],
            "subject": "Verify your Nasoma email address",
            "html": _verify_email_html(user.username, verify_url),
        }
        try:
            await asyncio.to_thread(resend.Emails.send, params)
            logger.info("Verification email sent to %s", user.email)
        except Exception as exc:
            logger.error("Failed to send verification email to %s: %s", user.email, exc)

    async def on_after_verify(self, user: User, request: Optional[Request] = None):
        logger.info("Email verified for %s", user.email)

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        reset_url = f"{settings.frontend_url}/auth/reset-password?token={token}"
        params: resend.Emails.SendParams = {
            "from": "Nasoma <noreply@me-nasoma.com>",
            "to": [user.email],
            "subject": "Reset your Nasoma password",
            "html": _reset_password_email(user.username, reset_url),
        }
        try:
            await asyncio.to_thread(resend.Emails.send, params)
            logger.info("Password reset email sent to %s", user.email)
        except Exception as exc:
            logger.error("Failed to send password reset email to %s: %s", user.email, exc)

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


def _verify_email_html(username: str, verify_url: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nasoma</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your AI Reading Companion</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Verify your email address</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi {username}, welcome to Nasoma! Click the button below to verify your email and activate your account.
                This link expires in <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(135deg,#6366f1,#7c3aed);">
                    <a href="{verify_url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                If the button doesn&apos;t work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="{verify_url}" style="color:#6366f1;font-size:13px;">{verify_url}</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                If you didn&apos;t create a Nasoma account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                &copy; 2025 Nasoma. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _reset_password_email(username: str, reset_url: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nasoma</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your AI Reading Companion</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset your password</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi {username}, we received a request to reset the password for your Nasoma account.
                Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(135deg,#6366f1,#7c3aed);">
                    <a href="{reset_url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                If the button doesn&apos;t work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="{reset_url}" style="color:#6366f1;font-size:13px;">{reset_url}</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                If you didn&apos;t request a password reset, you can safely ignore this email — your password won&apos;t change.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                &copy; 2025 Nasoma. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
