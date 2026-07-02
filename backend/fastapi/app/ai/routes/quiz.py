from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...auth.setup import current_active_user
from ...models.document import NasomaDocument
from ...models.user import User
from ..services.llm import generate_quiz

router = APIRouter(prefix="/quiz", tags=["ai"])


class QuizRequest(BaseModel):
    document_id: str


@router.post("")
async def quiz(body: QuizRequest, user: User = Depends(current_active_user)):
    doc = await NasomaDocument.get(body.document_id)
    if not doc or doc.author != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return await generate_quiz(doc.content)
