from __future__ import annotations

import time
import uuid

import chromadb
from chromadb.utils import embedding_functions
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import Settings
from app.model_stack import build_chat_llm
from app.schemas import RagEvalSample

SYSTEM = """You are a careful assistant. Answer only using the provided context.
If the context does not contain the answer, say you do not have enough information.
Be concise."""


def _kb_texts() -> list[str]:
    return [
        "Chunking strategy: fixed-size splits are fast but may cut sentences; "
        "recursive splitting respects document structure; semantic chunking uses embeddings to find natural boundaries.",
        "Hybrid retrieval combines BM25 keyword search with dense vector search, often improving recall on rare tokens.",
        "Cross-encoder re-ranking scores each (query, passage) pair with a small transformer; it is slower but sharpens precision.",
        "Sentence-window retrieval stores small embeddings per sentence but expands to neighboring sentences at inference time.",
        "Latency in RAG includes retrieval, optional re-ranking, and LLM generation; streaming reduces perceived latency.",
        "LangSmith traces show each LLM and retriever step, which helps debug faithfulness issues in production.",
    ]


def _chroma_embedding_function(settings: Settings):
    if settings.openai_api_key.strip():
        return embedding_functions.OpenAIEmbeddingFunction(
            api_key=settings.openai_api_key.strip(),
            model_name=settings.openai_embedding_model,
        )
    return embedding_functions.HuggingFaceEmbeddingFunction(model_name=settings.hf_embedding_model)


def run_demo_eval(*, settings: Settings, top_k: int = 3) -> tuple[list[RagEvalSample], list[str]]:
    """In-memory Chroma + chat LLM (Groq or OpenAI); returns samples and the queries used."""
    queries = [
        "When should I use hybrid retrieval instead of vectors only?",
        "What is sentence-window retrieval good for?",
        "How does cross-encoder re-ranking affect latency and quality?",
    ]

    ef = _chroma_embedding_function(settings)
    client = chromadb.Client()
    coll_name = f"demo_kb_{uuid.uuid4().hex[:10]}"
    coll = client.create_collection(coll_name, embedding_function=ef)
    docs = _kb_texts()
    coll.add(documents=docs, ids=[f"d{i}" for i in range(len(docs))])

    llm = build_chat_llm(settings)
    samples: list[RagEvalSample] = []

    ground_truths = [
        "Hybrid retrieval mixes BM25 with dense vectors and often helps on rare tokens and exact matches.",
        "Sentence-window retrieval keeps small embeddings per sentence but expands context at query time for better coherence.",
        "Cross-encoder re-ranking improves precision but adds latency because each passage is rescored with a transformer.",
    ]

    for q, gt in zip(queries, ground_truths, strict=False):
        t0 = time.perf_counter()
        res = coll.query(query_texts=[q], n_results=top_k)
        ctx_list: list[str] = list((res.get("documents") or [[]])[0] or [])
        context_block = "\n\n".join(f"- {c}" for c in ctx_list)
        messages = [
            SystemMessage(content=SYSTEM),
            HumanMessage(
                content=f"Context:\n{context_block}\n\nQuestion: {q}",
            ),
        ]
        resp = llm.invoke(messages)
        latency_ms = (time.perf_counter() - t0) * 1000.0
        samples.append(
            RagEvalSample(
                question=q,
                answer=str(resp.content).strip(),
                contexts=ctx_list,
                ground_truth_answer=gt,
                latency_ms=latency_ms,
            )
        )

    try:
        client.delete_collection(coll_name)
    except Exception:
        pass

    return samples, queries
