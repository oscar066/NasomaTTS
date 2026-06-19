from datetime import datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..utils.cache import TTL_DOC_LIST, TTL_DOCUMENT, cache_del, cache_get, cache_set
from ..models.document import NasomaDocument
from ..models.user import User
from ..utils.deps import get_current_user
from ..schemas.schema import DocumentCreate, DocumentRename, ProgressUpdate, StatusUpdate
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.documents")
router = APIRouter(prefix="/documents", tags=["documents"])


def _fmt_author(user: User) -> dict:
    return {"id": str(user.id), "username": user.username, "email": user.email}


def _fmt_doc(doc: NasomaDocument, author: dict) -> dict:
    return {
        "id": str(doc.id),
        "title": doc.title,
        "content": doc.content,
        "pdf_url": doc.pdf_url,
        "thumbnail_url": doc.thumbnail_url,
        "pages": doc.pages,
        "current_page": doc.current_page,
        "reading_status": doc.reading_status,
        "author": author,
        "createdAt": doc.created_at,
        "updatedAt": doc.updated_at,
    }


@router.get("")
async def list_documents():
    docs = []
    for doc in await NasomaDocument.find_all().to_list():
        author = await User.get(doc.author)
        docs.append(_fmt_doc(doc, _fmt_author(author) if author else {"id": str(doc.author), "username": "deleted", "email": ""}))
    return docs


@router.get("/me")
async def my_documents(current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    cache_key = f"cache:docs:user:{user_id}"

    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    docs = [
        _fmt_doc(doc, _fmt_author(current_user))
        for doc in await NasomaDocument.find(NasomaDocument.author == current_user.id).to_list()
    ]

    await cache_set(cache_key, docs, TTL_DOC_LIST)
    return docs


@router.get("/by-author/{email}")
async def documents_by_author(email: str):
    user = await User.find_one(User.email == email.lower())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return [
        _fmt_doc(doc, _fmt_author(user))
        for doc in await NasomaDocument.find(NasomaDocument.author == user.id).to_list()
    ]


@router.get("/{doc_id}")
async def get_document(doc_id: str):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    cache_key = f"cache:doc:{doc_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    doc = await NasomaDocument.get(oid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    author = await User.get(doc.author)
    result = _fmt_doc(doc, _fmt_author(author) if author else {"id": str(doc.author), "username": "deleted", "email": ""})
    await cache_set(cache_key, result, TTL_DOCUMENT)
    return result


@router.post("")
async def create_document(data: DocumentCreate, current_user: User = Depends(get_current_user)):
    if not data.title or not data.content:
        raise HTTPException(status_code=400, detail="Title and content are required")
    if len(data.title) > 200:
        raise HTTPException(status_code=400, detail="Title too long (max 200 characters)")

    doc = await NasomaDocument(
        title=data.title,
        content=data.content,
        pdf_url=data.pdf_url,
        thumbnail_url=data.thumbnail_url,
        pages=data.pages,
        author=current_user.id,
    ).insert()

    logger.info("Document created: id=%s title=%r user=%s", doc.id, doc.title, current_user.id)
    await cache_del(f"cache:docs:user:{str(current_user.id)}")
    return _fmt_doc(doc, _fmt_author(current_user))


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: User = Depends(get_current_user)):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await NasomaDocument.get(oid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.author != current_user.id:
        logger.warning("Unauthorized delete attempt: user=%s doc=%s", current_user.id, doc_id)
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    await doc.delete()
    await cache_del(f"cache:doc:{doc_id}", f"cache:docs:user:{str(current_user.id)}")
    logger.info("Document deleted: id=%s by user=%s", doc_id, current_user.id)
    return {"success": True}


@router.patch("/{doc_id}/rename")
async def rename_document(doc_id: str, data: DocumentRename, current_user: User = Depends(get_current_user)):
    if not data.title or not data.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    if len(data.title) > 200:
        raise HTTPException(status_code=400, detail="Title too long (max 200 characters)")

    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await NasomaDocument.get(oid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.author != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to rename this document")

    new_title = data.title.strip()
    await doc.set({NasomaDocument.title: new_title, NasomaDocument.updated_at: datetime.utcnow()})
    await cache_del(f"cache:doc:{doc_id}", f"cache:docs:user:{str(current_user.id)}")
    logger.info("Document renamed: id=%s title=%r user=%s", doc_id, new_title, current_user.id)
    return {"success": True, "title": new_title}


@router.patch("/{doc_id}/progress")
async def update_progress(doc_id: str, data: ProgressUpdate, current_user: User = Depends(get_current_user)):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await NasomaDocument.get(oid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.author != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this document")

    await doc.set({NasomaDocument.current_page: data.current_page, NasomaDocument.updated_at: datetime.utcnow()})
    # Only bust the list cache — the full document cache stays warm during a reading session.
    await cache_del(f"cache:docs:user:{str(current_user.id)}")
    logger.debug("Progress saved: doc=%s page=%d user=%s", doc_id, data.current_page, current_user.id)
    return {"success": True, "current_page": data.current_page}


@router.patch("/{doc_id}/status")
async def update_status(doc_id: str, data: StatusUpdate, current_user: User = Depends(get_current_user)):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await NasomaDocument.get(oid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.author != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this document")

    await doc.set({NasomaDocument.reading_status: data.reading_status, NasomaDocument.updated_at: datetime.utcnow()})
    await cache_del(f"cache:docs:user:{str(current_user.id)}")
    return {"success": True, "reading_status": data.reading_status}
