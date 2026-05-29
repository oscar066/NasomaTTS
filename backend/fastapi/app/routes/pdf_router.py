"""
PDF upload and serving routes.

Handles two responsibilities:

1. **Upload** (``POST /pdf/upload``) — Accepts a PDF file, extracts text via
   PyMuPDF, stores the binary in MinIO, and returns the extracted content so
   the client can immediately save a document record.

2. **Serve** (``GET /pdf/{doc_id}``) — Proxies the PDF binary from MinIO back
   to the browser.  The browser never calls MinIO directly, which keeps storage
   credentials server-side and allows access control to be enforced here.

Routes
------
POST /pdf/upload        — Parse a PDF and upload it to MinIO (authenticated).
GET  /pdf/{doc_id}      — Stream the stored PDF for the given document ID.
"""

import uuid
from urllib.parse import urlparse

import fitz  # PyMuPDF
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..config import settings
from ..db.database import get_db
from ..deps import get_current_user
from ..services.storage import get_pdf_stream, upload_pdf
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.pdf")
router = APIRouter(prefix="/pdf", tags=["pdf"])

# Maximum accepted PDF size.  Larger files are rejected before any processing
# to protect server memory and storage quotas.
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_pdf_route(
    pdf: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Parse a PDF, extract per-page text, and store the binary in MinIO.

    Processing steps:
    1. Validate content type and file size.
    2. Extract full text and per-page text with PyMuPDF (fitz).
    3. Upload the raw PDF bytes to MinIO under a namespaced object key.
       If MinIO is unavailable the upload is skipped and ``pdf_url`` is
       returned as ``None`` — TTS still works via the extracted text.
    4. Return extracted content so the client can persist a document record.

    Args:
        pdf: The uploaded PDF file from the multipart form body.
        current_user: Injected by :func:`~app.deps.get_current_user`.

    Raises:
        HTTPException 400: If the file is not a PDF or exceeds the size limit.
        HTTPException 500: If PyMuPDF fails to parse the file.
    """
    if pdf.content_type != "application/pdf":
        logger.warning("Invalid file type uploaded: %s", pdf.content_type)
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await pdf.read()
    if len(content) > MAX_SIZE:
        logger.warning("PDF too large: %d bytes (filename=%s)", len(content), pdf.filename)
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # ── Text extraction via PyMuPDF ───────────────────────────────────────────
    try:
        fitz_doc = fitz.open(stream=content, filetype="pdf")
        pages = [
            {"page_number": i + 1, "text": page.get_text()}
            for i, page in enumerate(fitz_doc)
        ]
        text = "".join(p["text"] for p in pages)
        fitz_doc.close()
    except Exception as e:
        logger.error("PDF extraction failed for %s: %s", pdf.filename, e)
        raise HTTPException(status_code=500, detail="Error extracting text from PDF")

    # ── MinIO upload ──────────────────────────────────────────────────────────
    # Object key is namespaced by user ID and a UUID to prevent collisions when
    # multiple users upload files with the same filename.
    pdf_key: str | None = None
    try:
        object_name = f"{current_user['_id']}/{uuid.uuid4()}/{pdf.filename}"
        pdf_key = upload_pdf(content, object_name)
    except Exception as e:
        # MinIO being down is non-fatal: TTS works from extracted text.
        logger.warning("MinIO upload failed, continuing without PDF binary: %s", e)

    logger.info(
        "PDF uploaded: filename=%s pages=%d chars=%d has_key=%s",
        pdf.filename,
        len(pages),
        len(text),
        bool(pdf_key),
    )
    return {
        "message": "PDF parsed successfully",
        "title": pdf.filename,
        "content": text,
        "pdf_url": pdf_key,   # None if MinIO upload failed.
        "pages": pages,        # Per-page text used for page-by-page TTS.
    }


@router.get("/{doc_id}")
async def serve_pdf(doc_id: str, db=Depends(get_db)):
    """Stream the stored PDF binary for a given document.

    Looks up the MinIO object key from the document record and proxies the
    binary back to the client as ``application/pdf``.  A ``Content-Disposition:
    inline`` header lets browsers render the PDF natively rather than
    downloading it.

    Legacy documents stored a full presigned MinIO URL instead of an object
    key.  These are normalised by extracting the path component on the fly.

    Args:
        doc_id: MongoDB ObjectId of the document as a hex string.
        db: Database handle from :func:`~app.db.database.get_db`.

    Raises:
        HTTPException 400: If ``doc_id`` is not a valid ObjectId.
        HTTPException 404: If the document doesn't exist or has no stored PDF.
        HTTPException 422: If a legacy presigned URL cannot be resolved.
        HTTPException 502: If MinIO returns an error when fetching the object.
    """
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await db.documents.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    pdf_key = doc.get("pdf_url")
    if not pdf_key:
        raise HTTPException(status_code=404, detail="No PDF stored for this document")

    # ── Legacy URL normalisation ──────────────────────────────────────────────
    # Early versions stored full presigned MinIO URLs.  Extract the object key
    # so we can call get_pdf_stream() with the bare key.
    if pdf_key.startswith("http://") or pdf_key.startswith("https://"):
        parsed = urlparse(pdf_key)
        bucket_prefix = f"/{settings.minio_bucket}/"
        if parsed.path.startswith(bucket_prefix):
            pdf_key = parsed.path[len(bucket_prefix):]
        else:
            raise HTTPException(status_code=422, detail="Cannot resolve legacy PDF URL")

    try:
        stream, size = get_pdf_stream(pdf_key)
    except Exception as e:
        logger.error("Failed to fetch PDF from MinIO for doc %s: %s", doc_id, e)
        raise HTTPException(status_code=502, detail="Could not retrieve PDF from storage")

    # HTTP headers only support latin-1; replace any characters that would
    # otherwise raise an encoding error in the ASGI layer.
    raw_title = doc.get("title", "document")
    safe_title = raw_title.encode("latin-1", errors="replace").decode("latin-1")

    return StreamingResponse(
        stream,
        media_type="application/pdf",
        headers={
            "Content-Length": str(size),
            "Content-Disposition": f'inline; filename="{safe_title}.pdf"',
        },
    )
