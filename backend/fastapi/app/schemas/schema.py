"""
Pydantic request/response schemas.

These models define the shape of data accepted by the API endpoints.  Pydantic
validates incoming JSON against these schemas automatically and returns a
structured 422 response when validation fails.
"""

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """Payload for ``POST /auth/signup``.

    Attributes:
        username: Unique display name chosen by the user.
        email: Valid email address — validated by Pydantic's ``EmailStr``.
        password: Plain-text password; hashed with bcrypt before storage.
    """

    username: str
    email: EmailStr
    password: str


class UserSignIn(BaseModel):
    """Payload for ``POST /auth/signin``.

    Attributes:
        email: The email address used at registration.
        password: Plain-text password to verify against the stored hash.
    """

    email: str
    password: str


class DocumentCreate(BaseModel):
    """Payload for ``POST /documents/``.

    Sent by the client after a PDF is parsed or plain text is submitted.

    Attributes:
        title: Human-readable document title (max 200 characters enforced in
            the route handler).
        content: Full extracted text of the document — used for text-mode TTS
            and as a fallback when per-page data is unavailable.
        pdf_url: MinIO object key for the original PDF binary.  ``None`` for
            plain-text documents or when the MinIO upload failed.
        pages: Per-page text extracted by PyMuPDF at upload time.  Each entry
            is ``{"page_number": int, "text": str}``.  ``None`` for legacy
            documents uploaded before per-page storage was introduced.
    """

    title: str
    content: str
    pdf_url: str | None = None
    thumbnail_url: str | None = None  # MinIO key for the first-page JPEG thumbnail.
    pages: list | None = None         # [{"page_number": int, "text": str}]
