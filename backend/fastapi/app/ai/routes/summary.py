from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...auth.setup import current_active_user
from ...models.document import NasomaDocument
from ...models.user import User
from ..services.llm import stream_summary
from ..sse import SSE_DONE, sse_data

router = APIRouter(prefix="/summary", tags=["ai"])


class SummaryRequest(BaseModel):
    document_id: str
    force: bool = False  # bypass the cached summary and regenerate


async def _replay_cached(text: str):
    yield sse_data(text)
    yield SSE_DONE


@router.post("")
async def summary(body: SummaryRequest, user: User = Depends(current_active_user)):
    doc = await NasomaDocument.get(body.document_id)
    if not doc or doc.author != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.summary and not body.force:
        return StreamingResponse(_replay_cached(doc.summary), media_type="text/event-stream")

    async def event_stream():
        chunks: list[str] = []
        async for token in stream_summary(doc.content):
            chunks.append(token)
            yield sse_data(token)
        await doc.set({
            NasomaDocument.summary: "".join(chunks),
            NasomaDocument.updated_at: datetime.utcnow(),
        })
        yield SSE_DONE

    return StreamingResponse(event_stream(), media_type="text/event-stream")
