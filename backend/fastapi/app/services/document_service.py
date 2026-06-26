"""Document formatting helpers shared across routers."""

from ..models.document import NasomaDocument
from ..models.user import User


def fmt_author(user: User) -> dict:
    return {"id": str(user.id), "username": user.username, "email": user.email}


def fmt_doc(doc: NasomaDocument, author: dict) -> dict:
    return {
        "id":               str(doc.id),
        "title":            doc.title,
        "content":          doc.content,
        "pdf_url":          doc.pdf_url,
        "thumbnail_url":    doc.thumbnail_url,
        "page_count":       doc.page_count,
        "total_word_count": doc.total_word_count,
        "current_page":     doc.current_page,
        "reading_status":   doc.reading_status,
        "author":           author,
        "createdAt":        doc.created_at,
        "updatedAt":        doc.updated_at,
    }
