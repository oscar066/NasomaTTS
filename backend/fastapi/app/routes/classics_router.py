"""Classics routes — browse and import public-domain books."""

import asyncio
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from ..models.document import NasomaDocument
from ..models.document_page import NasomaDocumentPage
from ..services.classics_service import (
    clean_gutenberg_text,
    epub_to_pdf_and_extract,
    get_bytes,
    get_json,
    get_text,
    split_into_pages,
    upload_classic_pdf,
)
from ..services.document_service import fmt_author, fmt_doc
from ..services.storage_service import upload_file
from ..utils.cache import cache_del, cache_get, cache_set
from ..utils.deps import get_current_user
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.classics")
router = APIRouter(prefix="/classics", tags=["classics"])

GUTENDEX       = "https://gutendex.com"
FREE_DOC_LIMIT = 5
BROWSE_TTL     = 3600


@router.get("")
async def browse(
    search: str = Query(""),
    page:   int = Query(1, ge=1),
    current_user=Depends(get_current_user),
):
    cache_key = f"cache:classics:{search}:{page}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    params: dict = {"languages": "en", "page": page}
    if search.strip():
        params["search"] = search.strip()
    else:
        params["sort"] = "popular"

    try:
        data = await get_json(f"{GUTENDEX}/books/", params)
    except httpx.HTTPError as e:
        logger.error("Gutendex request failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not reach the book catalog. Please try again.")

    await cache_set(cache_key, data, BROWSE_TTL)
    return data


@router.post("/{gutenberg_id}/import")
async def import_classic(
    gutenberg_id: int,
    current_user=Depends(get_current_user),
):
    existing = await NasomaDocument.find_one(
        NasomaDocument.author == current_user.id,
        NasomaDocument.gutenberg_id == gutenberg_id,
    )
    if existing:
        raise HTTPException(status_code=409, detail="This book is already in your library.")

    if current_user.plan == "free":
        count = await NasomaDocument.find(NasomaDocument.author == current_user.id).count()
        if count >= FREE_DOC_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan limit reached ({FREE_DOC_LIMIT} documents). Upgrade to Pro for unlimited imports.",
                headers={"X-Plan-Limit": "true"},
            )

    # Fetch book metadata (retry once on timeout)
    book = None
    for attempt in range(2):
        try:
            book = await get_json(f"{GUTENDEX}/books/{gutenberg_id}")
            break
        except httpx.TimeoutException:
            if attempt == 0:
                await asyncio.sleep(2)
                continue
            raise HTTPException(status_code=504, detail="The book catalog took too long to respond. Please try again.")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Book not found.")
            raise HTTPException(status_code=502, detail="Could not reach the book catalog. Please try again.")

    formats   = book.get("formats", {})
    title     = book.get("title") or "Untitled"
    base_path = f"{current_user.id}/{uuid.uuid4()}"

    pages: list[dict]        = []
    total_word_count         = 0
    content_excerpt          = ""
    pdf_key: str | None      = None
    thumbnail_key: str | None = None

    # Try EPUB first
    epub_url = formats.get("application/epub+zip") or formats.get("application/epub")
    if epub_url:
        try:
            logger.info("EPUB import: gutenberg_id=%d", gutenberg_id)
            epub_bytes = await get_bytes(epub_url)
            pdf_bytes, extracted_pages, thumb_bytes, full_text, wc = await asyncio.to_thread(
                epub_to_pdf_and_extract, epub_bytes
            )
            pdf_key, thumbnail_key = await asyncio.to_thread(
                upload_classic_pdf, pdf_bytes, thumb_bytes, base_path, f"{gutenberg_id}.pdf"
            )
            pages            = extracted_pages
            total_word_count = wc
            content_excerpt  = full_text[:4000]
            logger.info("EPUB import ok: gutenberg_id=%d pages=%d", gutenberg_id, len(pages))
        except Exception as e:
            logger.warning("EPUB failed for gutenberg_id=%d, falling back: %s", gutenberg_id, e)
            pdf_key = None
            pages   = []

    # Fall back to plain text
    if not pages:
        text_url = (
            formats.get("text/plain; charset=utf-8")
            or formats.get("text/plain; charset=us-ascii")
            or formats.get("text/plain")
        )
        if not text_url:
            raise HTTPException(status_code=422, detail="No readable version is available for this book.")

        try:
            raw = await get_text(text_url)
        except httpx.HTTPError as e:
            logger.error("Failed to download text for book %d: %s", gutenberg_id, e)
            raise HTTPException(status_code=502, detail="Could not download this book. Please try again.")

        text = clean_gutenberg_text(raw)
        if len(text) < 200:
            raise HTTPException(status_code=422, detail="Could not extract readable content from this book.")

        pages            = split_into_pages(text)
        total_word_count = sum(len(p["text"].split()) for p in pages)
        content_excerpt  = text[:4000]

        cover_url = formats.get("image/jpeg")
        if cover_url:
            try:
                cover_bytes   = await get_bytes(cover_url)
                thumbnail_key = await asyncio.to_thread(
                    upload_file, cover_bytes, f"{base_path}/thumbnail.jpg", "image/jpeg"
                )
            except Exception as e:
                logger.warning("Could not save cover for book %d: %s", gutenberg_id, e)

        logger.info("Text import: gutenberg_id=%d pages=%d words=%d", gutenberg_id, len(pages), total_word_count)

    doc = await NasomaDocument(
        title            = title,
        content          = content_excerpt,
        pdf_url          = pdf_key,
        thumbnail_url    = thumbnail_key,
        page_count       = len(pages),
        total_word_count = total_word_count,
        author           = current_user.id,
        gutenberg_id     = gutenberg_id,
    ).insert()

    try:
        await NasomaDocumentPage.insert_many([
            NasomaDocumentPage(
                doc_id=doc.id, page_number=p["page_number"],
                text=p["text"], paragraphs=p["paragraphs"],
                width=p["width"], height=p["height"],
            )
            for p in pages
        ])
    except Exception as e:
        logger.error("Failed to save pages for classic doc %s: %s", doc.id, e)

    await cache_del(f"cache:docs:user:{str(current_user.id)}")
    logger.info("Classic imported: gutenberg_id=%d title=%r pages=%d user=%s",
                gutenberg_id, title, len(pages), current_user.id)
    return fmt_doc(doc, fmt_author(current_user))
