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
from statistics import median as _median
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response, StreamingResponse

from ..utils.config import settings
from ..models.document import NasomaDocument
from ..models.document_page import NasomaDocumentPage
from ..utils.deps import get_current_user
from ..services.storage import get_pdf_stream, upload_file, upload_pdf
from ..utils.cache import cache_del, cache_get, cache_set
from ..utils.logger import setup_logger

FREE_DOCUMENT_LIMIT = 5

logger = setup_logger("nasoma.routes.pdf")
router = APIRouter(prefix="/pdf", tags=["pdf"])

# Maximum accepted PDF size.  Larger files are rejected before any processing
# to protect server memory and storage quotas.
MAX_SIZE = 50 * 1024 * 1024  # 50 MB

# Thumbnail render resolution.  72 DPI × scale 3 ≈ 216 DPI — sharp on retina
# displays while keeping file size small (typically 40–120 KB per page).
THUMBNAIL_SCALE = 3.0
THUMBNAIL_QUALITY = 85  # JPEG quality (0–100); 85 balances size vs fidelity.


def _words_to_paragraphs(raw_words: list) -> list[dict]:
    """Reconstruct paragraphs from individual words using vertical gap detection.

    Processes each PyMuPDF block independently (handles multi-column layouts)
    then applies gap-based paragraph splitting within each block.  This bypasses
    PyMuPDF's unreliable paragraph/block heuristic while keeping its reliable
    per-line word grouping (block_no, line_no).

    Args:
        raw_words: Output of ``page.get_text("words")`` — each entry is
            ``[x0, y0, x1, y1, text, block_no, line_no, word_no]``.

    Returns:
        List of paragraph dicts with keys ``text``, ``bbox``,
        ``word_texts``, and ``word_bboxes``.
    """
    words = [w for w in raw_words if w[4].strip()]
    if not words:
        return []

    # Group words by block_no then sort blocks top-to-bottom, left-to-right.
    # Primary key: avg y0 (vertical position) — ensures blocks read top to bottom.
    # Secondary key: avg x0 (horizontal position) — breaks ties for multi-column
    # layouts where two blocks share the same vertical band.
    block_map: dict[int, list] = {}
    for w in words:
        block_map.setdefault(w[5], []).append(w)

    sorted_blocks = sorted(
        block_map.values(),
        key=lambda ws: (
            sum(w[1] for w in ws) / len(ws),  # avg y0 — top to bottom
            sum(w[0] for w in ws) / len(ws),  # avg x0 — left to right
        ),
    )

    paragraphs: list[dict] = []

    for block_words in sorted_blocks:
        # Within the block, group by line_no (reliable per-visual-line index).
        line_map: dict[int, list] = {}
        for w in block_words:
            line_map.setdefault(w[6], []).append(w)

        # Sort lines top-to-bottom; sort words within each line left-to-right.
        lines = [
            sorted(line_map[ln], key=lambda w: w[0])
            for ln in sorted(line_map, key=lambda ln: min(w[1] for w in line_map[ln]))
        ]

        if not lines:
            continue

        # Gap threshold = 80 % of the median line height for this block.
        heights = [max(w[3] - w[1] for w in ln) for ln in lines]
        gap_threshold = _median(heights) * 0.8 if heights else 9.6

        # Split into paragraphs wherever the vertical gap exceeds the threshold.
        para_groups: list[list] = [[lines[0]]]
        for j in range(1, len(lines)):
            prev_bottom = max(w[3] for w in lines[j - 1])
            curr_top    = min(w[1] for w in lines[j])
            if curr_top - prev_bottom > gap_threshold:
                para_groups.append([lines[j]])
            else:
                para_groups[-1].append(lines[j])

        for para_lines in para_groups:
            flat = [w for ln in para_lines for w in ln]
            text = " ".join(w[4] for w in flat).strip()
            if not text:
                continue
            paragraphs.append({
                "text": text,
                "bbox": [
                    min(w[0] for w in flat),
                    min(w[1] for w in flat),
                    max(w[2] for w in flat),
                    max(w[3] for w in flat),
                ],
                "word_texts":  [w[4] for w in flat],
                "word_bboxes": [[w[0], w[1], w[2], w[3]] for w in flat],
            })

    return paragraphs


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


def _extract_pdf_sync(content: bytes) -> tuple[list, bytes | None, str, int]:
    """Parse a PDF with PyMuPDF and return (pages, thumbnail_bytes, full_text, total_word_count).

    Uses word-level extraction (``page.get_text("words")``) instead of block
    heuristics so paragraph boundaries are derived from actual vertical gaps
    between lines rather than the PDF's content-stream structure.  This fixes
    the "whole page as one paragraph" bug that occurs with single-stream PDFs.

    This is CPU-bound work — run via ``asyncio.to_thread`` to keep the event
    loop free.

    Returns:
        - ``pages``: per-page dicts with text, word-level paragraphs, and dimensions.
        - ``thumbnail_bytes``: first-page JPEG, or ``None`` on failure.
        - ``text``: full document text joined with double newlines.
        - ``total_word_count``: total words across all pages (for reading-time estimates).
    """
    fitz_doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    total_word_count = 0

    for i, page in enumerate(fitz_doc):
        page_rect = page.rect
        raw_words = page.get_text("words")
        paragraphs = _words_to_paragraphs(raw_words)

        for p in paragraphs:
            total_word_count += len(p["word_texts"])

        flat_text = "\n\n".join(p["text"] for p in paragraphs)
        pages.append({
            "page_number": i + 1,
            "text":        flat_text,
            "paragraphs":  paragraphs,
            "width":       page_rect.width,
            "height":      page_rect.height,
        })

    full_text = "\n\n".join(p["text"] for p in pages)
    thumbnail_bytes = _render_thumbnail(fitz_doc)
    fitz_doc.close()
    return pages, thumbnail_bytes, full_text, total_word_count


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

    # ── Free-user document limit check — before any CPU work or MinIO uploads
    # so we never waste resources processing a file that will be rejected.
    if current_user.plan == "free":
        count = await NasomaDocument.find(NasomaDocument.author == current_user.id).count()
        if count >= FREE_DOCUMENT_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan limit reached ({FREE_DOCUMENT_LIMIT} documents). Upgrade to Pro for unlimited uploads.",
            )

    # ── Text extraction (CPU-bound) — run in a thread so the event loop stays
    # free to serve other requests while PyMuPDF does its work.
    try:
        pages, thumbnail_bytes, text, total_word_count = await asyncio.to_thread(
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
        base_path = f"{current_user.id}/{uuid.uuid4()}"
        pdf_key, thumbnail_key = await asyncio.to_thread(
            _upload_to_minio_sync, content, thumbnail_bytes, base_path, pdf.filename
        )
    except Exception as e:
        # MinIO being down is non-fatal: TTS works from extracted text and the
        # dashboard falls back to the generic file icon.
        logger.warning("MinIO upload failed, continuing without stored files: %s", e)

    logger.info(
        "PDF uploaded: filename=%s pages=%d words=%d chars=%d has_pdf=%s has_thumb=%s",
        pdf.filename,
        len(pages),
        total_word_count,
        len(text),
        bool(pdf_key),
        bool(thumbnail_key),
    )

    # ── Persist document + pages server-side so the client never needs to send
    # the large page payload back.  Pages stay on the server from here on.
    title = pdf.filename.removesuffix(".pdf").strip() or pdf.filename
    doc = await NasomaDocument(
        title=title,
        content=text,
        pdf_url=pdf_key,
        thumbnail_url=thumbnail_key,
        page_count=len(pages),
        total_word_count=total_word_count,
        author=current_user.id,
    ).insert()

    if pages:
        try:
            await NasomaDocumentPage.insert_many([
                NasomaDocumentPage(
                    doc_id=doc.id,
                    page_number=p["page_number"],
                    text=p.get("text", ""),
                    paragraphs=p.get("paragraphs", []),
                    width=p.get("width", 0.0),
                    height=p.get("height", 0.0),
                )
                for p in pages
            ])
        except Exception as e:
            logger.error("Failed to save pages for doc %s: %s", doc.id, e)

    await cache_del(f"cache:docs:user:{str(current_user.id)}")
    logger.info("Document created from PDF: id=%s title=%r pages=%d user=%s", doc.id, title, len(pages), current_user.id)

    return {
        "id":               str(doc.id),
        "title":            doc.title,
        "content":          doc.content,
        "pdf_url":          doc.pdf_url,
        "thumbnail_url":    doc.thumbnail_url,
        "page_count":       doc.page_count,
        "total_word_count": doc.total_word_count,
        "current_page":     doc.current_page,
        "reading_status":   doc.reading_status,
        "author": {
            "id":       str(current_user.id),
            "username": current_user.username,
            "email":    current_user.email,
        },
        "createdAt": doc.created_at,
        "updatedAt": doc.updated_at,
    }


@router.get("/{doc_id}/thumbnail")
async def serve_thumbnail(doc_id: str):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    redis_key = f"cache:thumb_key:{doc_id}"
    thumbnail_key = await cache_get(redis_key)
    if thumbnail_key is None:
        doc = await NasomaDocument.get(oid)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        thumbnail_key = doc.thumbnail_url
        if not thumbnail_key:
            raise HTTPException(status_code=404, detail="No thumbnail stored for this document")
        await cache_set(redis_key, thumbnail_key, 86400)

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
async def serve_pdf(doc_id: str, request: Request):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    redis_key = f"cache:pdf_key:{doc_id}"
    cached_entry = await cache_get(redis_key)  # {"key": str, "title": str}

    if cached_entry:
        pdf_key = cached_entry["key"]
        safe_title = cached_entry["title"]
    else:
        doc = await NasomaDocument.get(oid)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        pdf_key = doc.pdf_url
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

        safe_title = (doc.title or "document").encode("latin-1", errors="replace").decode("latin-1")
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
