import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...auth.setup import current_active_user
from ...models.document import NasomaDocument
from ...models.user import User
from ..services.agent import stream_chat
from ..services.rag import index_document
from ..sse import SSE_DONE, sse_data

router = APIRouter(prefix="/chat", tags=["ai"])


class ChatRequest(BaseModel):
    document_id: str
    message: str
    thread_id: str | None = None  # omit on first message; server generates and returns one


@router.post("")
async def chat(body: ChatRequest, user: User = Depends(current_active_user)):
    doc = await NasomaDocument.get(body.document_id)
    if not doc or doc.author != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not doc.content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Document has no text content")

    await index_document(str(doc.id), doc.content)

    thread_id = body.thread_id or str(uuid.uuid4())

    async def event_stream():
        # First event carries the thread_id so the client can persist it
        yield sse_data({"thread_id": thread_id})

        async for token in stream_chat(
            document_id=str(doc.id),
            question=body.message,
            thread_id=thread_id,
        ):
            yield sse_data(token)

        yield SSE_DONE

    return StreamingResponse(event_stream(), media_type="text/event-stream")
