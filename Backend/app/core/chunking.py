"""
core/chunking.py

Three chunking strategies for comparison in the RAG Eval Dashboard.
Each strategy returns a list of LangChain Document objects ready for ChromaDB.

Strategies:
  1. fixed_size     — naive fixed token window, fast but ignores sentence boundaries
  2. recursive      — LangChain's recursive splitter, respects paragraph > sentence > word hierarchy
  3. semantic       — groups sentences by embedding similarity (most expensive, best quality)

Usage:
    from app.core.chunking import chunk_documents, ChunkStrategy

    chunks = chunk_documents(docs, strategy=ChunkStrategy.SEMANTIC)
"""

import logging
from enum import Enum
from typing import Optional

from langchain.schema import Document
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
)
from langchain_experimental.text_splitter import SemanticChunker
from app.core.embeddings import get_embedding_model

logger = logging.getLogger(__name__)


class ChunkStrategy(str, Enum):
    FIXED = "fixed"
    RECURSIVE = "recursive"
    SEMANTIC = "semantic"


# ── Strategy 1: Fixed-size ──────────────────────────────────────────────────────

def fixed_size_chunks(
    docs: list[Document],
    chunk_size: int = 512,
    chunk_overlap: int = 0,
) -> list[Document]:
    """
    Splits text into fixed-size windows with no overlap by default.
    Fastest strategy. Ignores sentence/paragraph boundaries entirely.
    Baseline to beat — your other strategies should score higher on RAGAS.

    Weakness: can cut mid-sentence, hurting context precision.
    """
    splitter = CharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separator=" ",           # split on spaces, not arbitrary chars
    )
    chunks = splitter.split_documents(docs)
    logger.info(f"[fixed] {len(docs)} docs → {len(chunks)} chunks (size={chunk_size})")
    return chunks


# ── Strategy 2: Recursive character split ──────────────────────────────────────

def recursive_chunks(
    docs: list[Document],
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> list[Document]:
    """
    LangChain's RecursiveCharacterTextSplitter.
    Tries to split on: paragraph breaks → sentences → words → characters.
    Much better than fixed-size at preserving meaning within each chunk.

    The 64-token overlap helps maintain context across chunk boundaries —
    important for multi-sentence answers that span two chunks.

    This is the recommended default for most RAG use cases.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    logger.info(f"[recursive] {len(docs)} docs → {len(chunks)} chunks (size={chunk_size}, overlap={chunk_overlap})")
    return chunks


# ── Strategy 3: Semantic chunking ──────────────────────────────────────────────

def semantic_chunks(
    docs: list[Document],
    breakpoint_threshold_type: str = "percentile",
    breakpoint_threshold_amount: float = 95.0,
) -> list[Document]:
    """
    Groups sentences together based on embedding similarity.
    Only splits when the semantic meaning shifts significantly.

    How it works:
      1. Splits text into individual sentences
      2. Embeds each sentence with provider-aware embeddings
      3. Computes cosine similarity between adjacent sentences
      4. Inserts a chunk boundary when similarity drops below threshold

    Result: each chunk contains a coherent unit of meaning.
    Best for: technical documents, research papers, structured reports.
    Cost: slower and more expensive due to embedding API calls.

    breakpoint_threshold_type options: "percentile", "standard_deviation", "interquartile"
    """
    emb = get_embedding_model()
    splitter = SemanticChunker(
        embeddings=emb,
        breakpoint_threshold_type=breakpoint_threshold_type,
        breakpoint_threshold_amount=breakpoint_threshold_amount,
    )
    chunks = splitter.split_documents(docs)
    logger.info(f"[semantic] {len(docs)} docs → {len(chunks)} chunks")
    return chunks


# ── Unified entrypoint ──────────────────────────────────────────────────────────

def chunk_documents(
    docs: list[Document],
    strategy: ChunkStrategy = ChunkStrategy.RECURSIVE,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> list[Document]:
    """
    Route to the right chunking strategy.
    Attaches strategy name to each chunk's metadata for traceability.
    """
    if strategy == ChunkStrategy.FIXED:
        chunks = fixed_size_chunks(docs, chunk_size, 0)
    elif strategy == ChunkStrategy.RECURSIVE:
        chunks = recursive_chunks(docs, chunk_size, chunk_overlap)
    elif strategy == ChunkStrategy.SEMANTIC:
        chunks = semantic_chunks(docs)
    else:
        raise ValueError(f"Unknown strategy: {strategy}")

    # Tag every chunk so we can trace which strategy produced it
    for chunk in chunks:
        chunk.metadata["chunk_strategy"] = strategy.value
        chunk.metadata["chunk_size_setting"] = chunk_size

    return chunks


# ── Comparison runner ───────────────────────────────────────────────────────────

async def compare_chunking_strategies(
    docs: list[Document],
    build_pipeline_fn,           # callable(chunks) → RetrievalQA pipeline
    test_dataset: list[dict],    # [{"question": str, "ground_truth": str}]
    eval_fn,                     # async callable(question, answer, contexts, ground_truth) → (scores, latency)
    strategies: Optional[list[ChunkStrategy]] = None,
    chunk_size: int = 512,
) -> dict[str, dict]:
    """
    Runs every chunking strategy against the same test dataset.
    Returns a dict of strategy_name → { "scores": RAGASScores, "chunk_count": int, "avg_latency_ms": float }

    This is the function that powers the "Chunking Lab" view in the dashboard.

    Example output:
    {
      "fixed":     { "scores": {...}, "chunk_count": 142, "avg_latency_ms": 380 },
      "recursive": { "scores": {...}, "chunk_count": 118, "avg_latency_ms": 290 },
      "semantic":  { "scores": {...}, "chunk_count": 89,  "avg_latency_ms": 520 },
    }
    """
    import asyncio
    from app.core.ragas_runner import aggregate_scores
    from app.schemas.eval_schema import QuestionResult

    if strategies is None:
        strategies = list(ChunkStrategy)

    results = {}

    for strategy in strategies:
        logger.info(f"Running chunking comparison: strategy={strategy.value}")

        # 1. Chunk the documents with this strategy
        chunks = chunk_documents(docs, strategy=strategy, chunk_size=chunk_size)

        # 2. Build a fresh RAG pipeline with these chunks
        pipeline = build_pipeline_fn(chunks)

        # 3. Run the full test dataset through it
        question_results = []
        for item in test_dataset:
            question = item["question"]
            ground_truth = item["ground_truth"]

            rag_output = await asyncio.get_event_loop().run_in_executor(
                None, lambda: pipeline({"query": question})
            )
            answer = rag_output["result"]
            contexts = [doc.page_content for doc in rag_output["source_documents"]]

            scores, latency = await eval_fn(question, answer, contexts, ground_truth)
            question_results.append(QuestionResult(
                question=question,
                answer=answer,
                ground_truth=ground_truth,
                scores=scores,
                latency_ms=latency,
            ))

        agg = aggregate_scores(question_results)
        avg_latency = sum(r.latency_ms for r in question_results) / len(question_results)

        results[strategy.value] = {
            "scores": agg.model_dump(),
            "overall": agg.overall,
            "chunk_count": len(chunks),
            "avg_latency_ms": round(avg_latency, 2),
        }

    return results