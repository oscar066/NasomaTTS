import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..deps import get_current_user
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/pdf", tags=["pdf"])

MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_pdf(
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
        doc = fitz.open(stream=content, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        doc.close()
    except Exception as e:
        logger.error("PDF extraction failed for %s: %s", pdf.filename, e)
        raise HTTPException(status_code=500, detail="Error extracting text from PDF")

    logger.info("PDF uploaded and parsed: filename=%s size=%d chars=%d", pdf.filename, len(content), len(text))
    return {
        "message": "PDF parsed successfully",
        "title": pdf.filename,
        "content": text,
    }
