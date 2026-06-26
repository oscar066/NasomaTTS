"""PDF upload and serving routes."""

import asyncio
import uuid
from urllib.parse import urlparse

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response, StreamingResponse

from ..models.document import NasomaDocument
from ..models.document_page import NasomaDocumentPage
from ..services.document_service import fmt_author, fmt_doc
from ..services.pdf_service import extract_pdf_sync, upload_pdf_and_thumb
from ..services.storage_service import get_pdf_stream
from ..utils.cache import cache_del, cache_get, cache_set
from ..utils.config import settings
from ..utils.deps import get_current_user
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.pdf")
router = APIRouter(prefix="/pdf", tags=["pdf"])

FREE_DOCUMENT_LIMIT = 5
MAX_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload")
async def upload_pdf_route(
    pdf: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await pdf.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    if current_user.plan == "free":
        count = await NasomaDocument.find(NasomaDocument.author == current_user.id).count()
        if count >= FREE_DOCUMENT_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan limit reached ({FREE_DOCUMENT_LIMIT} documents). Upgrade to Pro for unlimited uploads.",
            )

    try:
        pages, thumbnail_bytes, text, total_word_count = await asyncio.to_thread(extract_pdf_sync, content)
    except Exception as e:
        logger.error("PDF extraction failed for %s: %s", pdf.filename, e)
        raise HTTPException(status_code=500, detail="Error extracting text from PDF")

    pdf_key: str | None = None
    thumbnail_key: str | None = None
    try:
        base_path = f"{current_user.id}/{uuid.uuid4()}"
        pdf_key, thumbnail_key = await asyncio.to_thread(
            upload_pdf_and_thumb, content, thumbnail_bytes, base_path, pdf.filename
        )
    except Exception as e:
        logger.warning("MinIO upload failed, continuing without stored files: %s", e)

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
    logger.info("PDF uploaded: id=%s title=%r pages=%d user=%s", doc.id, title, len(pages), current_user.id)
    return fmt_doc(doc, fmt_author(current_user))


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
        headers={"Cache-Control": "public, max-age=31536000, immutable", "Content-Length": str(size)},
    )


@router.get("/{doc_id}")
async def serve_pdf(doc_id: str, request: Request):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    redis_key    = f"cache:pdf_key:{doc_id}"
    cached_entry = await cache_get(redis_key)

    if cached_entry:
        pdf_key    = cached_entry["key"]
        safe_title = cached_entry["title"]
    else:
        doc = await NasomaDocument.get(oid)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        pdf_key = doc.pdf_url
        if not pdf_key:
            raise HTTPException(status_code=404, detail="No PDF stored for this document")
        if pdf_key.startswith("http://") or pdf_key.startswith("https://"):
            parsed = urlparse(pdf_key)
            prefix = f"/{settings.minio_bucket}/"
            if parsed.path.startswith(prefix):
                pdf_key = parsed.path[len(prefix):]
            else:
                raise HTTPException(status_code=422, detail="Cannot resolve legacy PDF URL")
        safe_title = (doc.title or "document").encode("latin-1", errors="replace").decode("latin-1")
        await cache_set(redis_key, {"key": pdf_key, "title": safe_title}, 86400)

    etag = f'"{pdf_key}"'
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
