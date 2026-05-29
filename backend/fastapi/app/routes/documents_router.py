"""
Document management routes.

Handles CRUD operations for user documents.  A document can represent either
a plain-text file or a PDF (in which case ``pdf_url`` holds the MinIO object
key and ``pages`` holds the per-page text extracted at upload time).

Routes
------
GET    /documents/                  — List all documents (public).
GET    /documents/me                — List the authenticated user's documents.
GET    /documents/by-author/{email} — List documents by a specific author.
GET    /documents/{doc_id}          — Retrieve a single document by ID.
POST   /documents/                  — Create a new document (authenticated).
DELETE /documents/{doc_id}          — Delete a document (owner only).
"""

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..db.database import get_db
from ..deps import get_current_user
from ..schemas.schema import DocumentCreate
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.documents")
router = APIRouter(prefix="/documents", tags=["documents"])


def _fmt_author(user: dict) -> dict:
    """Extract the public author fields from a raw MongoDB user document."""
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
    }


def _fmt_doc(doc: dict, author: dict) -> dict:
    """Serialize a raw MongoDB document into the API response shape.

    Args:
        doc: Raw MongoDB document from the ``documents`` collection.
        author: Pre-formatted author dict produced by :func:`_fmt_author`.

    Returns:
        A JSON-serialisable dict suitable for returning directly from a route.
    """
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "content": doc["content"],
        "pdf_url": doc.get("pdf_url"),
        "thumbnail_url": doc.get("thumbnail_url"),
        # ``pages`` is None for legacy/text-only documents uploaded before
        # per-page server extraction was introduced.
        "pages": doc.get("pages"),
        "author": author,
        "createdAt": doc["createdAt"],
        "updatedAt": doc["updatedAt"],
    }


@router.get("/")
async def list_documents(db=Depends(get_db)):
    """Return all documents in the database (public, no authentication required).

    Each document is joined with its author's profile.  Author data is fetched
    per-document (N+1 queries), which is acceptable at the current scale.
    """
    docs = []
    async for doc in db.documents.find():
        author = await db.users.find_one({"_id": doc["author"]})
        docs.append(_fmt_doc(doc, _fmt_author(author) if author else {"id": str(doc["author"])}))
    return docs


@router.get("/me")
async def my_documents(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Return all documents belonging to the authenticated user."""
    docs = []
    async for doc in db.documents.find({"author": current_user["_id"]}):
        docs.append(_fmt_doc(doc, _fmt_author(current_user)))
    return docs


@router.get("/by-author/{email}")
async def documents_by_author(email: str, db=Depends(get_db)):
    """Return all documents authored by the user with the given email address.

    Raises:
        HTTPException 404: If no user with that email exists.
    """
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    docs = []
    async for doc in db.documents.find({"author": user["_id"]}):
        docs.append(_fmt_doc(doc, _fmt_author(user)))
    return docs


@router.get("/{doc_id}")
async def get_document(doc_id: str, db=Depends(get_db)):
    """Return a single document by its MongoDB ObjectId.

    Raises:
        HTTPException 400: If ``doc_id`` is not a valid ObjectId.
        HTTPException 404: If no document with that ID exists.
    """
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await db.documents.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    author = await db.users.find_one({"_id": doc["author"]})
    return _fmt_doc(doc, _fmt_author(author) if author else {"id": str(doc["author"])})


@router.post("/")
async def create_document(
    data: DocumentCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Save a new document and return it.

    Called by the client after parsing a PDF or submitting plain text.  The
    ``pdf_url`` field (MinIO object key) and ``pages`` list are optional — they
    are only present for PDF documents.

    Raises:
        HTTPException 400: If title or content is empty, or the title exceeds
            the 200-character limit.
    """
    if not data.title or not data.content:
        raise HTTPException(status_code=400, detail="Title and content are required")
    if len(data.title) > 200:
        raise HTTPException(status_code=400, detail="Title too long (max 200 characters)")

    now = datetime.utcnow()
    result = await db.documents.insert_one(
        {
            "title": data.title,
            "content": data.content,
            "pdf_url": data.pdf_url,
            "thumbnail_url": data.thumbnail_url,
            "pages": data.pages,
            "author": current_user["_id"],
            "createdAt": now,
            "updatedAt": now,
        }
    )
    logger.info(
        "Document created: id=%s title=%r user=%s",
        result.inserted_id,
        data.title,
        current_user["_id"],
    )
    doc = await db.documents.find_one({"_id": result.inserted_id})
    return _fmt_doc(doc, _fmt_author(current_user))


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a document by ID.

    Only the document's author may delete it.  The associated MinIO PDF binary
    is NOT deleted here — add a cleanup task if storage reclamation is required.

    Raises:
        HTTPException 400: If ``doc_id`` is not a valid ObjectId.
        HTTPException 404: If no document with that ID exists.
        HTTPException 403: If the authenticated user is not the document's author.
    """
    try:
        oid = ObjectId(doc_id)
    except Exception:
        logger.warning("Invalid document ID in delete request: %s", doc_id)
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await db.documents.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc["author"] != current_user["_id"]:
        logger.warning(
            "Unauthorized delete attempt: user=%s doc=%s",
            current_user["_id"],
            doc_id,
        )
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    await db.documents.delete_one({"_id": oid})
    logger.info("Document deleted: id=%s by user=%s", doc_id, current_user["_id"])
    return {"success": True}
