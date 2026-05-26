import logging

from app.config import settings

logger = logging.getLogger(__name__)

try:
    from langchain.embeddings import SentenceTransformerEmbeddings
except ImportError:  # pragma: no cover
    SentenceTransformerEmbeddings = None


def get_embedding_model():
    """Return the correct embedding provider for the configured LLM backend."""
    provider = settings.LLM_PROVIDER.lower()

    if provider != "groq":
        raise RuntimeError(f"Unsupported LLM_PROVIDER '{provider}'; only 'groq' is supported.")

    if SentenceTransformerEmbeddings is None:
        raise RuntimeError("SentenceTransformerEmbeddings is required for Groq provider")
    logger.info("Using SentenceTransformerEmbeddings for Groq provider")
    return SentenceTransformerEmbeddings(model_name=settings.SENTENCE_TRANSFORMER_MODEL)
