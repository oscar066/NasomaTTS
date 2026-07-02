"""Server-Sent Events helpers shared by the streaming AI routes."""
import json
from typing import Any


def sse_data(payload: Any) -> str:
    """Encode a single SSE event.  JSON-encoding the payload keeps it on one line so
    embedded newlines (e.g. paragraph breaks from the LLM) can't corrupt the
    line-based frame the client parses.
    """
    return f"data: {json.dumps(payload)}\n\n"


SSE_DONE = sse_data("[DONE]")
