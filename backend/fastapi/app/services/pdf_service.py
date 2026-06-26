"""PDF extraction and thumbnail rendering (CPU-bound, run via asyncio.to_thread)."""

import uuid
from statistics import median as _median

import fitz

from .storage_service import upload_file, upload_pdf
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.services.pdf")

THUMBNAIL_SCALE   = 3.0
THUMBNAIL_QUALITY = 85


def words_to_paragraphs(raw_words: list) -> list[dict]:
    """Reconstruct paragraphs from PyMuPDF word tuples using vertical gap detection."""
    words = [w for w in raw_words if w[4].strip()]
    if not words:
        return []

    block_map: dict[int, list] = {}
    for w in words:
        block_map.setdefault(w[5], []).append(w)

    sorted_blocks = sorted(
        block_map.values(),
        key=lambda ws: (
            sum(w[1] for w in ws) / len(ws),
            sum(w[0] for w in ws) / len(ws),
        ),
    )

    paragraphs: list[dict] = []

    for block_words in sorted_blocks:
        line_map: dict[int, list] = {}
        for w in block_words:
            line_map.setdefault(w[6], []).append(w)

        lines = [
            sorted(line_map[ln], key=lambda w: w[0])
            for ln in sorted(line_map, key=lambda ln: min(w[1] for w in line_map[ln]))
        ]
        if not lines:
            continue

        heights = [max(w[3] - w[1] for w in ln) for ln in lines]
        gap_threshold = _median(heights) * 0.8 if heights else 9.6

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
                    min(w[0] for w in flat), min(w[1] for w in flat),
                    max(w[2] for w in flat), max(w[3] for w in flat),
                ],
                "word_texts":  [w[4] for w in flat],
                "word_bboxes": [[w[0], w[1], w[2], w[3]] for w in flat],
            })

    return paragraphs


def render_thumbnail(fitz_doc: fitz.Document) -> bytes | None:
    """Render page 0 of a PDF as a JPEG thumbnail."""
    try:
        mat = fitz.Matrix(THUMBNAIL_SCALE, THUMBNAIL_SCALE)
        pix = fitz_doc[0].get_pixmap(matrix=mat, alpha=False)
        return pix.tobytes("jpeg", jpg_quality=THUMBNAIL_QUALITY)
    except Exception as e:
        logger.warning("Thumbnail render failed: %s", e)
        return None


def extract_pdf_sync(content: bytes) -> tuple[list, bytes | None, str, int]:
    """Parse a PDF and return (pages, thumbnail_bytes, full_text, word_count)."""
    fitz_doc = fitz.open(stream=content, filetype="pdf")
    pages: list[dict] = []
    total_word_count = 0

    for i, page in enumerate(fitz_doc):
        raw_words  = page.get_text("words")
        paragraphs = words_to_paragraphs(raw_words)
        total_word_count += sum(len(p["word_texts"]) for p in paragraphs)
        pages.append({
            "page_number": i + 1,
            "text":        "\n\n".join(p["text"] for p in paragraphs),
            "paragraphs":  paragraphs,
            "width":       page.rect.width,
            "height":      page.rect.height,
        })

    full_text       = "\n\n".join(p["text"] for p in pages)
    thumbnail_bytes = render_thumbnail(fitz_doc)
    fitz_doc.close()
    return pages, thumbnail_bytes, full_text, total_word_count


def upload_pdf_and_thumb(
    content: bytes,
    thumbnail_bytes: bytes | None,
    base_path: str,
    filename: str,
) -> tuple[str | None, str | None]:
    """Upload PDF and thumbnail to MinIO. Returns (pdf_key, thumbnail_key)."""
    pdf_key       = upload_pdf(content, f"{base_path}/{filename}")
    thumbnail_key = None
    if thumbnail_bytes:
        thumbnail_key = upload_file(
            thumbnail_bytes,
            f"{base_path}/thumbnail.jpg",
            content_type="image/jpeg",
        )
    return pdf_key, thumbnail_key
