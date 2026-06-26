"""Gutenberg catalog fetching, EPUB→PDF conversion, and plain-text page splitting."""

import re

import fitz
import httpx

from .pdf_service import render_thumbnail, words_to_paragraphs
from .storage_service import upload_file, upload_pdf

WORDS_PER_PAGE = 500

_HEADING_RE = re.compile(
    r"^(CHAPTER|Chapter|PART|Part|BOOK|Book|VOLUME|Volume|"
    r"PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|"
    r"INTRODUCTION|Introduction|APPENDIX|Appendix|"
    r"[IVXivx]{1,6}\.|[IVXivx]{1,6}$)"
    r"[\s.:]",
    re.MULTILINE,
)


# HTTP helpers

async def get_json(url: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        return r.json()


async def get_bytes(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
        r = await c.get(url)
        r.raise_for_status()
        return r.content


async def get_text(url: str) -> str:
    raw = await get_bytes(url)
    for enc in ("utf-8", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


# Text helpers

def clean_gutenberg_text(text: str) -> str:
    """Strip Gutenberg header/footer boilerplate and normalise whitespace."""
    start = re.search(r"\*{3}\s*START OF.*?\*{3}", text, re.IGNORECASE)
    if start:
        text = text[start.end():]
    end = re.search(r"\*{3}\s*END OF.*?\*{3}", text, re.IGNORECASE)
    if end:
        text = text[: end.start()]
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    return text.strip()


def is_heading(text: str) -> bool:
    lines = text.strip().splitlines()
    if len(lines) > 3:
        return False
    return bool(_HEADING_RE.match(lines[0].strip())) and all(len(l.split()) <= 12 for l in lines)


def split_into_pages(text: str) -> list[dict]:
    """Split cleaned plain text into page dicts with heading/body paragraph tags."""
    double_split = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    raw: list[str] = []
    for block in double_split:
        lines = block.splitlines()
        # Break list-like blocks (e.g. TOC) into individual lines
        if len(lines) > 5 and all(len(l.split()) < 15 for l in lines):
            raw.extend(l.strip() for l in lines if l.strip())
        else:
            raw.append(block)

    # Drop TOC runs (4+ consecutive headings)
    filtered: list[str] = []
    i = 0
    while i < len(raw):
        if is_heading(raw[i]):
            run = 1
            while i + run < len(raw) and is_heading(raw[i + run]):
                run += 1
            if run >= 4:
                i += run
                continue
        filtered.append(raw[i])
        i += 1

    page_groups: list[list[str]] = []
    current: list[str] = []
    count = 0

    for para in filtered:
        wc = len(para.split())
        if is_heading(para):
            if current:
                page_groups.append(current)
            current = [para]
            count = wc
        elif count + wc > WORDS_PER_PAGE and current:
            page_groups.append(current)
            current = [para]
            count = wc
        else:
            current.append(para)
            count += wc

    if current:
        page_groups.append(current)

    return [
        {
            "page_number": i + 1,
            "text":        "\n\n".join(group),
            "paragraphs":  [
                {
                    "text": p, "bbox": [0, 0, 0, 0],
                    "word_texts": p.split(), "word_bboxes": [],
                    "type": "heading" if is_heading(p) else "body",
                }
                for p in group
            ],
            "width":  0.0,
            "height": 0.0,
        }
        for i, group in enumerate(page_groups)
    ]


# EPUB → PDF
def epub_to_pdf_and_extract(epub_bytes: bytes) -> tuple[bytes, list[dict], bytes | None, str, int]:
    """Convert EPUB to A5 PDF via PyMuPDF, extract pages/paragraphs.

    Returns (pdf_bytes, pages, thumbnail_bytes, full_text, word_count).
    """
    epub_doc = fitz.open(stream=epub_bytes, filetype="epub")
    epub_doc.layout(width=421, height=595, fontsize=13)  # A5 in points
    pdf_bytes = epub_doc.convert_to_pdf()
    epub_doc.close()

    pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[dict] = []
    total_word_count = 0

    for i, page in enumerate(pdf_doc):
        paragraphs = words_to_paragraphs(page.get_text("words"))
        total_word_count += sum(len(p["word_texts"]) for p in paragraphs)
        pages.append({
            "page_number": i + 1,
            "text":        "\n\n".join(p["text"] for p in paragraphs),
            "paragraphs":  paragraphs,
            "width":       page.rect.width,
            "height":      page.rect.height,
        })

    full_text       = "\n\n".join(p["text"] for p in pages)
    thumbnail_bytes = render_thumbnail(pdf_doc)
    pdf_doc.close()
    return pdf_bytes, pages, thumbnail_bytes, full_text, total_word_count


def upload_classic_pdf(
    pdf_bytes: bytes,
    thumbnail_bytes: bytes | None,
    base_path: str,
    filename: str,
) -> tuple[str | None, str | None]:
    """Upload classic PDF and thumbnail to MinIO. Returns (pdf_key, thumb_key)."""
    pdf_key   = upload_pdf(pdf_bytes, f"{base_path}/{filename}")
    thumb_key = None
    if thumbnail_bytes:
        thumb_key = upload_file(thumbnail_bytes, f"{base_path}/thumbnail.jpg", content_type="image/jpeg")
    return pdf_key, thumb_key
