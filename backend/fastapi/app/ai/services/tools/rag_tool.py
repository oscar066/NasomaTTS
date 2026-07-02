"""
RAG tool factory.

Returns a @tool scoped to a specific document's Pinecone namespace.
The LLM decides when to call it — it's not hardwired into every message.
"""
from langchain_core.tools import tool

from ....utils.logger import setup_logger
from ..initializers import get_vector_store

logger = setup_logger("nasoma.ai.rag_tool")


def make_rag_tool(document_id: str):
    """
    Returns a LangChain tool that retrieves relevant passages
    from the given document's Pinecone namespace.
    """

    @tool
    async def get_rag_answer(question: str) -> str:
        """
        Search the document for passages relevant to the question.
        Use this whenever the user asks about specific content, characters,
        events, themes, or details from their document.
        """
        logger.info("[RAG Tool] Retrieving context for: '%s'", question)
        store = get_vector_store(document_id)
        results = store.similarity_search(question, k=6)
        if not results:
            return "No relevant passages found in the document for this question."
        context = "\n\n---\n\n".join(r.page_content for r in results)
        logger.info("[RAG Tool] Retrieved %d chunks", len(results))
        return context

    return get_rag_answer
