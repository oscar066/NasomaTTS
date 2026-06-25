from beanie import Document, PydanticObjectId
from pymongo import ASCENDING, IndexModel
from pydantic import Field


class NasomaDocumentPage(Document):
    """One page of a document's extracted content.

    Stored in a separate collection so the parent NasomaDocument stays small
    regardless of how many pages or words a document contains.  Word-level
    bounding boxes (word_bboxes inside each paragraph) are the heaviest part
    of the payload — keeping them here prevents the 16 MB MongoDB document
    limit from ever being hit by the main documents collection.

    Indexed on (doc_id, page_number) for O(1) single-page lookups and
    efficient bulk fetches of all pages for a given document.
    """

    doc_id: PydanticObjectId
    page_number: int         # 1-based, matches PyMuPDF page index + 1
    text: str = ""
    paragraphs: list = Field(default_factory=list)
    width: float = 0.0       # native PDF page width in points (72 DPI)
    height: float = 0.0      # native PDF page height in points (72 DPI)

    class Settings:
        name = "document_pages"
        indexes = [
            IndexModel(
                [("doc_id", ASCENDING), ("page_number", ASCENDING)],
                name="doc_page_unique",
                unique=True,
            ),
        ]
