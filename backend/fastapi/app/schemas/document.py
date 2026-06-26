from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str
    content: str
    pdf_url: str | None = None
    thumbnail_url: str | None = None
    pages: list | None = None
    page_count: int | None = None
    total_word_count: int | None = None


class DocumentRename(BaseModel):
    title: str


class ProgressUpdate(BaseModel):
    current_page: int


class StatusUpdate(BaseModel):
    reading_status: str | None = None
