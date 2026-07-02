from datetime import datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class NasomaDocument(Document):
    title: str
    content: str
    pdf_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    page_count: Optional[int] = None
    total_word_count: Optional[int] = None
    current_page: int = 0
    reading_status: Optional[str] = None
    summary: Optional[str] = None
    author: PydanticObjectId
    gutenberg_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "documents"
