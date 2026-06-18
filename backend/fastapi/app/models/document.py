from datetime import datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class NasomaDocument(Document):
    title: str
    content: str
    pdf_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    pages: Optional[list] = None
    current_page: int = 0
    author: PydanticObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "documents"
