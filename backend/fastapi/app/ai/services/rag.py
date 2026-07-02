"""Indexes document content into Pinecone (one namespace per document)."""
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from ...utils.logger import setup_logger
from .initializers import get_vector_store, namespace_exists

logger = setup_logger("nasoma.ai.rag")

_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


async def index_document(document_id: str, content: str) -> None:
    """Chunk and embed document content into Pinecone. Skips if already indexed."""
    if namespace_exists(document_id):
        logger.info("Document %s already indexed — skipping", document_id)
        return

    chunks = _splitter.split_text(content)
    docs = [
        Document(page_content=chunk, metadata={"document_id": document_id, "chunk_index": i})
        for i, chunk in enumerate(chunks)
    ]
    store = get_vector_store(document_id)
    store.add_documents(docs)
    logger.info("Indexed document %s — %d chunks", document_id, len(chunks))
