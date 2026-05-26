import uuid
import fitz  # PyMuPDF
from bson import ObjectId
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..config import settings
from ..db.database import get_db
from ..deps import get_current_user
from ..services.storage import get_pdf_stream, upload_pdf
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/pdf", tags=["pdf"])

MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_pdf_route(
    pdf: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if pdf.content_type != "application/pdf":
        logger.warning("Invalid file type uploaded: %s", pdf.content_type)
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await pdf.read()
    if len(content) > MAX_SIZE:
        logger.warning("PDF too large: %d bytes (filename=%s)", len(content), pdf.filename)
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

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

    # Store the original PDF in MinIO; keep the object key (not a presigned URL)
    pdf_key: str | None = None
    try:
        object_name = f"{current_user['_id']}/{uuid.uuid4()}/{pdf.filename}"
        pdf_key = upload_pdf(content, object_name)
    except Exception as e:
        logger.warning("MinIO upload failed, continuing without PDF: %s", e)

    logger.info(
        "PDF uploaded: filename=%s pages=%d chars=%d has_key=%s",
        pdf.filename, len(pages), len(text), bool(pdf_key),
    )
    return {
        "message": "PDF parsed successfully",
        "title": pdf.filename,
        "content": text,
        "pdf_url": pdf_key,
        "pages": pages,       # per-page text for uniform TTS
    }


@router.get("/{doc_id}")
async def serve_pdf(doc_id: str, db=Depends(get_db)):
    """Proxy the PDF from MinIO so the browser never hits MinIO directly."""
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

    # Legacy documents stored a full presigned URL; extract the object key from it
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

    # Encode filename safely — latin-1 is the only encoding HTTP headers support
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
