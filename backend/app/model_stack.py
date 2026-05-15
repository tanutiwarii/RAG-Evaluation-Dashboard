"""Build LangChain chat + embedding clients from settings (OpenAI and/or Groq)."""

from __future__ import annotations

from langchain_core.embeddings import Embeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import Settings

GROQ_OPENAI_BASE = "https://api.groq.com/openai/v1"


def llm_configured(settings: Settings) -> bool:
    return bool(settings.groq_api_key.strip() or settings.openai_api_key.strip())


def build_chat_llm(settings: Settings) -> ChatOpenAI:
    if settings.groq_api_key.strip():
        return ChatOpenAI(
            model=settings.groq_model,
            temperature=0,
            api_key=settings.groq_api_key.strip(),
            base_url=GROQ_OPENAI_BASE,
        )
    if settings.openai_api_key.strip():
        return ChatOpenAI(
            model=settings.openai_chat_model,
            temperature=0,
            api_key=settings.openai_api_key.strip(),
        )
    raise ValueError("Set GROQ_API_KEY or OPENAI_API_KEY for the evaluation LLM.")


def build_embeddings(settings: Settings) -> Embeddings:
    if settings.openai_api_key.strip():
        return OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            api_key=settings.openai_api_key.strip(),
        )
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
    except ImportError as e:
        raise RuntimeError(
            "Groq-only mode needs local embeddings. Install: pip install langchain-huggingface sentence-transformers"
        ) from e
    return HuggingFaceEmbeddings(model_name=settings.hf_embedding_model)
