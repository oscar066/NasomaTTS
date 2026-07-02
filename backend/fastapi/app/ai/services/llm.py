"""LLM calls for summary, quiz, and recap."""
import json
from typing import AsyncIterator

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ...utils.config import settings

_llm = ChatOpenAI(
    model=settings.openai_model,
    api_key=settings.openai_api_key,
    streaming=True,
    temperature=0.4,
)

_llm_json = ChatOpenAI(
    model=settings.openai_model,
    api_key=settings.openai_api_key,
    temperature=0.3,
    model_kwargs={"response_format": {"type": "json_object"}},
)

_TRUNCATE_CHARS = 80_000  # ~20k tokens


def _truncate(content: str) -> str:
    return content[:_TRUNCATE_CHARS] if len(content) > _TRUNCATE_CHARS else content


async def stream_summary(content: str) -> AsyncIterator[str]:
    messages = [
        SystemMessage(content=(
            "You are a literary assistant. Write a clear, well-structured summary of the document. "
            "Cover the main themes, key events, and important characters. "
            "Use plain prose, 3-5 paragraphs. Do not use bullet points. "
            "Separate each paragraph with a blank line (double newline, markdown style) — "
            "never merge them into a single block of text."
        )),
        HumanMessage(content=f"Document:\n\n{_truncate(content)}"),
    ]
    async for chunk in _llm.astream(messages):
        if chunk.content:
            yield chunk.content


async def stream_recap(content: str, current_page: int) -> AsyncIterator[str]:
    # The document text is identical across recap calls for the same document
    progress = f"\n\nThe reader is currently on page {current_page}." if current_page else ""
    messages = [
        SystemMessage(content=(
            "You are a reading companion. Write a friendly recap of what has happened "
            "so far in the document — covering the main events, character developments, and where "
            "things currently stand. Write in 2-4 paragraphs as if reminding someone who took a break. "
            "Separate each paragraph with a blank line (double newline, markdown style) — "
            "never merge them into a single block of text."
        )),
        HumanMessage(content=f"Document:\n\n{_truncate(content)}{progress}"),
    ]
    async for chunk in _llm.astream(messages):
        if chunk.content:
            yield chunk.content


async def generate_quiz(content: str) -> dict:
    messages = [
        SystemMessage(content=(
            "You are a quiz creator. Generate exactly 5 multiple-choice questions to test comprehension "
            "of the document. Each question must have exactly 4 options and a correct answer index (0-3). "
            'Return ONLY valid JSON: {"questions": [{"question": "...", "options": ["A","B","C","D"], "correct": 0}]}'
        )),
        HumanMessage(content=f"Document:\n\n{_truncate(content)}"),
    ]
    response = await _llm_json.ainvoke(messages)
    return json.loads(response.content)
