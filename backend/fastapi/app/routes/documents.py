from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..db.database import get_db
from ..deps import get_current_user
from ..schemas.schema import DocumentCreate
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


def _fmt_author(user: dict) -> dict:
    return {"id": str(user["_id"]), "username": user["username"], "email": user["email"]}


def _fmt_doc(doc: dict, author: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "content": doc["content"],
        "author": author,
        "createdAt": doc["createdAt"],
        "updatedAt": doc["updatedAt"],
    }


@router.get("/")
async def list_documents(db=Depends(get_db)):
    docs = []
    async for doc in db.documents.find():
        author = await db.users.find_one({"_id": doc["author"]})
        docs.append(_fmt_doc(doc, _fmt_author(author) if author else {"id": str(doc["author"])}))
    return docs


@router.get("/me")
async def my_documents(current_user=Depends(get_current_user), db=Depends(get_db)):
    docs = []
    async for doc in db.documents.find({"author": current_user["_id"]}):
        docs.append(_fmt_doc(doc, _fmt_author(current_user)))
    return docs


@router.get("/by-author/{email}")
async def documents_by_author(email: str, db=Depends(get_db)):
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    docs = []
    async for doc in db.documents.find({"author": user["_id"]}):
        docs.append(_fmt_doc(doc, _fmt_author(user)))
    return docs


@router.get("/{doc_id}")
async def get_document(doc_id: str, db=Depends(get_db)):
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
    if not data.title or not data.content:
        raise HTTPException(status_code=400, detail="Title and content are required")
    if len(data.title) > 200:
        raise HTTPException(status_code=400, detail="Title too long (max 200 characters)")

    now = datetime.utcnow()
    result = await db.documents.insert_one(
        {
            "title": data.title,
            "content": data.content,
            "author": current_user["_id"],
            "createdAt": now,
            "updatedAt": now,
        }
    )
    logger.info("Document created: id=%s title=%r user=%s", result.inserted_id, data.title, current_user["_id"])
    doc = await db.documents.find_one({"_id": result.inserted_id})
    return _fmt_doc(doc, _fmt_author(current_user))


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    try:
        oid = ObjectId(doc_id)
    except Exception:
        logger.warning("Invalid document ID in delete request: %s", doc_id)
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await db.documents.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc["author"] != current_user["_id"]:
        logger.warning("Unauthorized delete attempt: user=%s doc=%s", current_user["_id"], doc_id)
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    await db.documents.delete_one({"_id": oid})
    logger.info("Document deleted: id=%s by user=%s", doc_id, current_user["_id"])
    return {"success": True}
