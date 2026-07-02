from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...auth.setup import current_active_user
from ...models.document import NasomaDocument
from ...models.user import User
from ..services.llm import stream_recap
from ..sse import SSE_DONE, sse_data

router = APIRouter(prefix="/recap", tags=["ai"])


class RecapRequest(BaseModel):
    document_id: str


@router.post("")
async def recap(body: RecapRequest, user: User = Depends(current_active_user)):
    doc = await NasomaDocument.get(body.document_id)
    if not doc or doc.author != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    async def event_stream():
        async for token in stream_recap(doc.content, doc.current_page):
            yield sse_data(token)
        yield SSE_DONE

    return StreamingResponse(event_stream(), media_type="text/event-stream")
