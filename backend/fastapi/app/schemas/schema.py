from pydantic import BaseModel


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
        pages: Per-page data extracted by PyMuPDF at upload time.  Each entry
            includes ``page_number``, ``text``, ``paragraphs`` (with word-level
            bboxes), ``width``, and ``height``.  ``None`` for legacy documents.
        total_word_count: Total words across all pages, computed at upload time.
            Used for reading-time estimates and statistics.  ``None`` for legacy
            plain-text documents.
    """

    title: str
    content: str
    pdf_url: str | None = None
    thumbnail_url: str | None = None
    pages: list | None = None          # received from client, saved to NasomaDocumentPage
    page_count: int | None = None
    total_word_count: int | None = None


class DocumentRename(BaseModel):
    """Payload for ``PATCH /documents/{doc_id}/rename``.

    Attributes:
        title: New human-readable title for the document (max 200 characters
            enforced in the route handler).
    """

    title: str


class ProgressUpdate(BaseModel):
    """Payload for ``PATCH /documents/{doc_id}/progress``.

    Attributes:
        current_page: 0-based index of the most recently reached page.
            Pass ``total_pages`` (= ``len(pages)``) to mark the document
            as fully read so the dashboard shows 100 %.
    """

    current_page: int


class StatusUpdate(BaseModel):
    """Payload for ``PATCH /documents/{doc_id}/status``."""

    reading_status: str | None = None
