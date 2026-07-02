"""Background tasks executed by the arq worker."""

import asyncio
from datetime import datetime

import resend

from ..utils.config import settings

resend.api_key = settings.resend_api_key


async def send_verification_email(ctx, *, username: str, email: str, verify_url: str) -> None:
    params: resend.Emails.SendParams = {
        "from": "Me Nasoma <noreply@me-nasoma.com>",
        "to": [email],
        "subject": "Verify your Nasoma email address",
        "html": _verify_email_html(username, verify_url),
    }
    await asyncio.to_thread(resend.Emails.send, params)


async def send_password_reset_email(ctx, *, username: str, email: str, reset_url: str) -> None:
    params: resend.Emails.SendParams = {
        "from": "Me Nasoma <noreply@me-nasoma.com>",
        "to": [email],
        "subject": "Reset your Nasoma password",
        "html": _reset_password_email(username, reset_url),
    }
    await asyncio.to_thread(resend.Emails.send, params)


def _email_header(frontend_url: str) -> str:
    logo_url = f"{frontend_url}/Me-nasoma-tts-white.png"
    return f"""
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:28px 40px;text-align:center;">
              <img src="{logo_url}" alt="Me Nasoma" width="140" height="auto"
                   style="display:inline-block;max-width:140px;height:auto;margin-bottom:8px;" />
              <p style="margin:0;color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:0.3px;">Your AI Reading Companion</p>
            </td>
          </tr>"""


def _email_footer() -> str:
    year = datetime.utcnow().year
    return f"""
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                &copy; {year} Me Nasoma. All rights reserved.
              </p>
            </td>
          </tr>"""


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
          {_email_header(settings.frontend_url)}
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Verify your email address</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi {username}, welcome to Me Nasoma! Click the button below to verify your email and activate your account.
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
                If you didn&apos;t create a Me Nasoma account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          {_email_footer()}
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
          {_email_header(settings.frontend_url)}
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset your password</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi {username}, we received a request to reset the password for your Me Nasoma account.
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
          {_email_footer()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


# AI indexing tasks
async def index_single_document(ctx, *, document_id: str) -> None:
    """Index one document into Pinecone. Enqueued on upload for Pro users."""
    from beanie import PydanticObjectId
    from ..models.document import NasomaDocument
    from ..ai.services.rag import index_document
    from ..utils.logger import setup_logger

    logger = setup_logger("nasoma.worker.ai")
    doc = await NasomaDocument.get(PydanticObjectId(document_id))
    if not doc or not doc.content:
        logger.warning("index_single_document: doc %s not found or has no content", document_id)
        return
    await index_document(document_id, doc.content)
    logger.info("Indexed document %s", document_id)


async def index_user_documents(ctx, *, user_id: str) -> None:
    """Index all documents for a user. Enqueued when a user upgrades to Pro."""
    from beanie import PydanticObjectId
    from ..models.document import NasomaDocument
    from ..ai.services.rag import index_document
    from ..utils.logger import setup_logger

    logger = setup_logger("nasoma.worker.ai")
    docs = await NasomaDocument.find(
        NasomaDocument.author == PydanticObjectId(user_id)
    ).to_list()

    indexed = 0
    for doc in docs:
        if doc.content:
            await index_document(str(doc.id), doc.content)
            indexed += 1

    logger.info("Indexed %d/%d documents for user %s", indexed, len(docs), user_id)
