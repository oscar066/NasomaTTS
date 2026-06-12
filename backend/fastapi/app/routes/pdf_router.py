"""
PDF upload and serving routes.

Handles three responsibilities:

1. **Upload** (``POST /pdf/upload``) — Accepts a PDF file, extracts text via
   PyMuPDF, renders a first-page thumbnail, stores both in MinIO, and returns
   the extracted content so the client can immediately save a document record.

2. **Serve** (``GET /pdf/{doc_id}``) — Proxies the PDF binary from MinIO back
   to the browser.  The browser never calls MinIO directly, which keeps storage
   credentials server-side and allows access control to be enforced here.

3. **Thumbnail** (``GET /pdf/{doc_id}/thumbnail``) — Serves the pre-rendered
   first-page PNG thumbnail for display in the dashboard document grid.

Routes
------
POST /pdf/upload              — Parse a PDF and upload it to MinIO (authenticated).
GET  /pdf/{doc_id}            — Stream the stored PDF for the given document ID.
GET  /pdf/{doc_id}/thumbnail  — Serve the first-page thumbnail image.
"""

import asyncio
import io
import uuid
from urllib.parse import urlparse

import fitz  # PyMuPDF
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response, StreamingResponse

from ..utils.config import settings
from ..db.database import get_db
from ..utils.deps import get_current_user
from ..services.storage import get_pdf_stream, upload_file, upload_pdf
from ..utils.cache import cache_get, cache_set
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.pdf")
router = APIRouter(prefix="/pdf", tags=["pdf"])

# Maximum accepted PDF size.  Larger files are rejected before any processing
# to protect server memory and storage quotas.
MAX_SIZE = 10 * 1024 * 1024  # 10 MB

# Thumbnail render resolution.  72 DPI × scale 3 ≈ 216 DPI — sharp on retina
# displays while keeping file size small (typically 40–120 KB per page).
THUMBNAIL_SCALE = 3.0
THUMBNAIL_QUALITY = 85  # JPEG quality (0–100); 85 balances size vs fidelity.


def _render_thumbnail(fitz_doc: fitz.Document) -> bytes | None:
    """Render the first page of a PDF as a JPEG thumbnail.

    Uses PyMuPDF to rasterise page 0 at ``THUMBNAIL_SCALE`` × 72 DPI.  The
    result is compressed as JPEG to minimise storage and transfer size.

    Args:
        fitz_doc: An open :class:`fitz.Document` instance.

    Returns:
        JPEG bytes of the thumbnail, or ``None`` if rendering fails.
    """
    try:
        page = fitz_doc[0]
        mat = fitz.Matrix(THUMBNAIL_SCALE, THUMBNAIL_SCALE)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        return pix.tobytes("jpeg", jpg_quality=THUMBNAIL_QUALITY)
    except Exception as e:
        logger.warning("Thumbnail render failed: %s", e)
        return None


def _extract_pdf_sync(content: bytes) -> tuple[list, bytes | None, str]:
    """Parse a PDF with PyMuPDF and return (pages, thumbnail_bytes, full_text).

    This is CPU-bound work — calling fitz functions holds the GIL and blocks
    the event loop.  It must be run via ``asyncio.to_thread`` so FastAPI can
    continue handling other requests while extraction is in progress.

    Args:
        content: Raw bytes of the uploaded PDF file.

    Returns:
        A tuple of:
        - ``pages``: list of per-page dicts with text, paragraphs, and bbox data.
        - ``thumbnail_bytes``: JPEG bytes of the first page, or ``None`` on failure.
        - ``text``: full document text (all pages joined with double newlines).

    Raises:
        Exception: Any fitz error is re-raised so the caller can return HTTP 500.
    """
    fitz_doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    for i, page in enumerate(fitz_doc):
        raw_blocks = page.get_text("blocks")
        page_rect = page.rect
        paragraphs = [
            {
                "text": blk[4].strip(),
                "bbox": [blk[0], blk[1], blk[2], blk[3]],
            }
            for blk in sorted(raw_blocks, key=lambda b: (round(b[1] / 10), b[0]))
            if blk[6] == 0 and blk[4].strip()
        ]
        flat_text = "\n\n".join(p["text"] for p in paragraphs)
        pages.append({
            "page_number": i + 1,
            "text": flat_text,
            "paragraphs": paragraphs,
            "width": page_rect.width,
            "height": page_rect.height,
        })
    full_text = "\n\n".join(p["text"] for p in pages)
    thumbnail_bytes = _render_thumbnail(fitz_doc)
    fitz_doc.close()
    return pages, thumbnail_bytes, full_text


def _upload_to_minio_sync(
    content: bytes,
    thumbnail_bytes: bytes | None,
    base_path: str,
    filename: str,
) -> tuple[str | None, str | None]:
    """Upload PDF and thumbnail to MinIO synchronously.

    MinIO's Python SDK is synchronous (urllib3-backed).  Running it directly
    in an async route blocks the event loop for the duration of the upload.
    Call via ``asyncio.to_thread`` to keep the event loop free.

    Returns:
        ``(pdf_key, thumbnail_key)`` — either may be ``None`` if the upload
        failed or no thumbnail was produced.
    """
    pdf_key = upload_pdf(content, f"{base_path}/{filename}")
    thumbnail_key = None
    if thumbnail_bytes:
        thumbnail_key = upload_file(
            thumbnail_bytes,
            f"{base_path}/thumbnail.jpg",
            content_type="image/jpeg",
        )
    return pdf_key, thumbnail_key


@router.post("/upload")
async def upload_pdf_route(
    pdf: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Parse a PDF, extract per-page text, render a thumbnail, and store both in MinIO.

    Processing steps:
    1. Validate content type and file size.
    2. Extract full text and per-page text with PyMuPDF (fitz).
    3. Render the first page as a JPEG thumbnail.
    4. Upload the raw PDF bytes and thumbnail to MinIO under namespaced object keys.
       If MinIO is unavailable both uploads are skipped — TTS still works from
       the extracted text and the dashboard falls back to the file-type icon.
    5. Return extracted content and keys so the client can persist a document record.

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

    # ── Text extraction (CPU-bound) — run in a thread so the event loop stays
    # free to serve other requests while PyMuPDF does its work.
    try:
        pages, thumbnail_bytes, text = await asyncio.to_thread(
            _extract_pdf_sync, content
        )
    except Exception as e:
        logger.error("PDF extraction failed for %s: %s", pdf.filename, e)
        raise HTTPException(status_code=500, detail="Error extracting text from PDF")

    # ── MinIO uploads (synchronous I/O) — also run in a thread for the same reason.
    # Object keys are namespaced by user ID and a shared UUID so the PDF and
    # its thumbnail sit in the same logical "folder" in the bucket.
    pdf_key: str | None = None
    thumbnail_key: str | None = None
    try:
        base_path = f"{current_user['_id']}/{uuid.uuid4()}"
        pdf_key, thumbnail_key = await asyncio.to_thread(
            _upload_to_minio_sync, content, thumbnail_bytes, base_path, pdf.filename
        )
    except Exception as e:
        # MinIO being down is non-fatal: TTS works from extracted text and the
        # dashboard falls back to the generic file icon.
        logger.warning("MinIO upload failed, continuing without stored files: %s", e)

    logger.info(
        "PDF uploaded: filename=%s pages=%d chars=%d has_pdf=%s has_thumb=%s",
        pdf.filename,
        len(pages),
        len(text),
        bool(pdf_key),
        bool(thumbnail_key),
    )
    return {
        "message": "PDF parsed successfully",
        "title": pdf.filename,
        "content": text,
        "pdf_url": pdf_key,           # None if MinIO upload failed.
        "thumbnail_url": thumbnail_key,  # None if render or upload failed.
        "pages": pages,                # Per-page text used for page-by-page TTS.
    }


@router.get("/{doc_id}/thumbnail")
async def serve_thumbnail(doc_id: str, db=Depends(get_db)):
    """Return the pre-rendered first-page JPEG thumbnail for a document.

    Returns a ``image/jpeg`` response suitable for use in ``<img>`` tags.
    The thumbnail is cached by the browser using standard HTTP cache headers.

    Args:
        doc_id: MongoDB ObjectId of the document as a hex string.
        db: Database handle from :func:`~app.db.database.get_db`.

    Raises:
        HTTPException 400: If ``doc_id`` is not a valid ObjectId.
        HTTPException 404: If the document has no thumbnail stored.
        HTTPException 502: If MinIO returns an error when fetching the thumbnail.
    """
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    # Cache the MinIO object key in Redis so repeat requests skip MongoDB.
    # The thumbnail key is immutable after upload, so a long TTL is fine.
    redis_key = f"cache:thumb_key:{doc_id}"
    thumbnail_key = await cache_get(redis_key)
    if thumbnail_key is None:
        doc = await db.documents.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        thumbnail_key = doc.get("thumbnail_url")
        if not thumbnail_key:
            raise HTTPException(status_code=404, detail="No thumbnail stored for this document")
        await cache_set(redis_key, thumbnail_key, 86400)  # 24 h — key never changes

    try:
        stream, size = get_pdf_stream(thumbnail_key)
        image_bytes = stream.read()
    except Exception as e:
        logger.error("Failed to fetch thumbnail from MinIO for doc %s: %s", doc_id, e)
        raise HTTPException(status_code=502, detail="Could not retrieve thumbnail from storage")

    return Response(
        content=image_bytes,
        media_type="image/jpeg",
        headers={
            # Cache thumbnails aggressively — they never change after upload.
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": str(size),
        },
    )


@router.get("/{doc_id}")
async def serve_pdf(doc_id: str, request: Request, db=Depends(get_db)):
    """Stream the stored PDF binary for a given document.

    Looks up the MinIO object key from the document record and proxies the
    binary back to the client as ``application/pdf``.  A ``Content-Disposition:
    inline`` header lets browsers render the PDF natively rather than
    downloading it.

    Legacy documents stored a full presigned MinIO URL instead of an object
    key.  These are normalised by extracting the path component on the fly.

    Args:
        doc_id: MongoDB ObjectId of the document as a hex string.
        request: Incoming FastAPI request (used to check If-None-Match).
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

    # Cache the MinIO object key in Redis so repeat requests skip MongoDB.
    # The pdf_key is immutable after upload so a 24-hour TTL is conservative.
    redis_key = f"cache:pdf_key:{doc_id}"
    cached_entry = await cache_get(redis_key)  # {"key": str, "title": str}

    if cached_entry:
        pdf_key = cached_entry["key"]
        safe_title = cached_entry["title"]
    else:
        doc = await db.documents.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        pdf_key = doc.get("pdf_url")
        if not pdf_key:
            raise HTTPException(status_code=404, detail="No PDF stored for this document")

        # Legacy URL normalisation
        if pdf_key.startswith("http://") or pdf_key.startswith("https://"):
            parsed = urlparse(pdf_key)
            bucket_prefix = f"/{settings.minio_bucket}/"
            if parsed.path.startswith(bucket_prefix):
                pdf_key = parsed.path[len(bucket_prefix):]
            else:
                raise HTTPException(status_code=422, detail="Cannot resolve legacy PDF URL")

        raw_title = doc.get("title", "document")
        safe_title = raw_title.encode("latin-1", errors="replace").decode("latin-1")
        await cache_set(redis_key, {"key": pdf_key, "title": safe_title}, 86400)

    # Use the MinIO object key as a stable ETag — it contains a UUID that is
    # unique per upload and never changes, so it's safe as a strong validator.
    # Cache-Control: private prevents CDN/proxy caching (the PDF is user-owned)
    # while letting the browser cache it for 24 hours.  On subsequent opens the
    # browser skips the download entirely and renders from its local cache.
    etag = f'"{pdf_key}"'

    # Handle conditional GET: if the browser already has this version cached
    # (i.e. it sends If-None-Match matching our ETag), return 304 immediately
    # without touching MinIO at all.
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)

    try:
        stream, size = get_pdf_stream(pdf_key)
    except Exception as e:
        logger.error("Failed to fetch PDF from MinIO for doc %s: %s", doc_id, e)
        raise HTTPException(status_code=502, detail="Could not retrieve PDF from storage")

    return StreamingResponse(
        stream,
        media_type="application/pdf",
        headers={
            "Content-Length": str(size),
            "Content-Disposition": f'inline; filename="{safe_title}.pdf"',
            "Cache-Control": "private, max-age=86400, immutable",
            "ETag": etag,
        },
    )
