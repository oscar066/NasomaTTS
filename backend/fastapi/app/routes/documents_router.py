"""Document CRUD and progress routes."""

from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..models.document import NasomaDocument
from ..models.document_page import NasomaDocumentPage
from ..models.reading_activity import ReadingActivity
from ..models.user import User
from ..schemas.document import DocumentCreate, DocumentRename, ProgressUpdate, StatusUpdate
from ..services.document_service import fmt_author, fmt_doc
from ..utils.cache import TTL_DOC_LIST, TTL_DOCUMENT, cache_del, cache_get, cache_set
from ..utils.deps import get_current_user
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.documents")
router = APIRouter(prefix="/documents", tags=["documents"])

FREE_DOCUMENT_LIMIT = 5
TTL_PAGES = 86400


@router.get("")
async def list_documents():
    docs = []
    for doc in await NasomaDocument.find_all().to_list():
        author = await User.get(doc.author)
        docs.append(fmt_doc(doc, fmt_author(author) if author else {"id": str(doc.author), "username": "deleted", "email": ""}))
    return docs


@router.get("/me")
async def my_documents(current_user: User = Depends(get_current_user)):
    cache_key = f"cache:docs:user:{str(current_user.id)}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached
    docs = [fmt_doc(doc, fmt_author(current_user))
            for doc in await NasomaDocument.find(NasomaDocument.author == current_user.id).to_list()]
    await cache_set(cache_key, docs, TTL_DOC_LIST)
    return docs


@router.get("/by-author/{email}")
async def documents_by_author(email: str):
    user = await User.find_one(User.email == email.lower())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return [fmt_doc(doc, fmt_author(user))
            for doc in await NasomaDocument.find(NasomaDocument.author == user.id).to_list()]


@router.get("/{doc_id}/pages")
async def get_document_pages(doc_id: str):
    try:
        oid = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    cache_key = f"cache:pages:{doc_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    pages = await NasomaDocumentPage.find(
        NasomaDocumentPage.doc_id == oid
    ).sort("+page_number").to_list()

    result = [
        {"page_number": p.page_number, "text": p.text,
         "paragraphs": p.paragraphs, "width": p.width, "height": p.height}
        for p in pages
    ]
    await cache_set(cache_key, result, TTL_PAGES)
    return result


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
    result = fmt_doc(doc, fmt_author(author) if author else {"id": str(doc.author), "username": "deleted", "email": ""})
    await cache_set(cache_key, result, TTL_DOCUMENT)
    return result


@router.post("")
async def create_document(data: DocumentCreate, current_user: User = Depends(get_current_user)):
    if not data.title or not data.content:
        raise HTTPException(status_code=400, detail="Title and content are required")
    if len(data.title) > 200:
        raise HTTPException(status_code=400, detail="Title too long (max 200 characters)")

    if current_user.plan == "free":
        count = await NasomaDocument.find(NasomaDocument.author == current_user.id).count()
        if count >= FREE_DOCUMENT_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan limit reached ({FREE_DOCUMENT_LIMIT} documents). Upgrade to Pro for unlimited uploads.",
            )

    doc = await NasomaDocument(
        title=data.title,
        content=data.content,
        pdf_url=data.pdf_url,
        thumbnail_url=data.thumbnail_url,
        page_count=len(data.pages) if data.pages else None,
        total_word_count=data.total_word_count,
        author=current_user.id,
    ).insert()

    if data.pages:
        try:
            await NasomaDocumentPage.insert_many([
                NasomaDocumentPage(
                    doc_id=doc.id,
                    page_number=page["page_number"],
                    text=page.get("text", ""),
                    paragraphs=page.get("paragraphs", []),
                    width=page.get("width", 0.0),
                    height=page.get("height", 0.0),
                )
                for page in data.pages
            ])
        except Exception as e:
            logger.error("Failed to save pages for doc %s: %s", doc.id, e)

    logger.info("Document created: id=%s title=%r user=%s", doc.id, doc.title, current_user.id)
    await cache_del(f"cache:docs:user:{str(current_user.id)}")
    return fmt_doc(doc, fmt_author(current_user))


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
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    await NasomaDocumentPage.find(NasomaDocumentPage.doc_id == oid).delete()
    await doc.delete()
    await cache_del(
        f"cache:doc:{doc_id}",
        f"cache:pages:{doc_id}",
        f"cache:docs:user:{str(current_user.id)}",
    )
    logger.info("Document deleted: id=%s user=%s", doc_id, current_user.id)
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

    old_page = doc.current_page
    await doc.set({NasomaDocument.current_page: data.current_page, NasomaDocument.updated_at: datetime.utcnow()})

    if data.current_page > old_page:
        new_pages = await NasomaDocumentPage.find(
            NasomaDocumentPage.doc_id == oid,
            NasomaDocumentPage.page_number > (old_page + 1),
            NasomaDocumentPage.page_number <= (data.current_page + 1),
        ).to_list()
        words_gained = sum(len(p.text.split()) for p in new_pages)
        if words_gained > 0:
            await current_user.inc({User.words_read: words_gained})
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            await ReadingActivity.get_motor_collection().update_one(
                {"user_id": current_user.id, "date": today},
                {"$inc": {"words_read": words_gained}},
                upsert=True,
            )

    await cache_del(f"cache:docs:user:{str(current_user.id)}")
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
