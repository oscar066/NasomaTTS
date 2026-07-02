"""
Singleton initializers for expensive AI objects.
Call get_*() anywhere — each object is created once and reused.
Pre-warm all of them at app startup via warm_up().
"""
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

from ...utils.config import settings
from ...utils.logger import setup_logger

logger = setup_logger("nasoma.ai.init")

_llm: ChatOpenAI = None
_embeddings: OpenAIEmbeddings = None
_pinecone: Pinecone = None
_vector_stores: dict[str, PineconeVectorStore] = {}


def get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        logger.info("Initializing LLM: %s", settings.openai_model)
        _llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            streaming=True,
            temperature=0.3,
        )
    return _llm


def get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        logger.info("Initializing OpenAI embeddings (text-embedding-3-small)")
        _embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=settings.openai_api_key,
        )
    return _embeddings


def get_pinecone() -> Pinecone:
    global _pinecone
    if _pinecone is None:
        logger.info("Initializing Pinecone client")
        _pinecone = Pinecone(api_key=settings.pinecone_api_key)
    return _pinecone


def get_vector_store(document_id: str) -> PineconeVectorStore:
    """Returns a cached PineconeVectorStore scoped to the document's namespace."""
    if document_id not in _vector_stores:
        logger.info("Initializing vector store for document %s", document_id)
        pc = get_pinecone()
        _vector_stores[document_id] = PineconeVectorStore(
            index=pc.Index(settings.pinecone_index),
            embedding=get_embeddings(),
            namespace=document_id,
        )
    return _vector_stores[document_id]


def namespace_exists(document_id: str) -> bool:
    pc = get_pinecone()
    stats = pc.Index(settings.pinecone_index).describe_index_stats()
    namespaces = stats.namespaces or {}
    return document_id in namespaces


def delete_namespace(document_id: str) -> None:
    """Delete all vectors for a document namespace from Pinecone."""
    pc = get_pinecone()
    pc.Index(settings.pinecone_index).delete(delete_all=True, namespace=document_id)
    # Evict cached store so a future re-upload gets a fresh one
    _vector_stores.pop(document_id, None)


async def warm_up() -> None:
    """Pre-warm singletons at app startup so the first request is fast."""
    logger.info("Pre-warming AI singletons...")
    get_llm()
    get_embeddings()
    get_pinecone()
    logger.info("AI singletons ready")
