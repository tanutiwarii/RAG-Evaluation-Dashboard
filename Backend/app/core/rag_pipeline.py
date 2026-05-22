"""
core/rag_pipeline.py

Builds a LangChain RetrievalQA pipeline with a pluggable retriever.
Supports three retriever modes selectable at runtime:
  - "vector"   : standard ChromaDB similarity search (baseline)
  - "rerank"   : vector search + cross-encoder re-ranking
  - "hybrid"   : BM25 + vector + optional cross-encoder re-ranking

Used by:
  - api/evaluate.py      for single and batch evaluation
  - core/chunking.py     for strategy comparison runs
  - api/compare.py       for pipeline variant side-by-side comparison
"""

import logging
import os
from functools import partial

from langchain.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.schema import Document

from app.core.chunking import chunk_documents, ChunkStrategy
from app.core.reranker import build_reranking_retriever, build_hybrid_retriever
from app.config import settings

logger = logging.getLogger(__name__)

# Supported retriever modes
RETRIEVER_MODES = ("vector", "rerank", "hybrid")


def load_documents(pdf_path: str) -> list[Document]:
    """Loads a PDF and returns a list of LangChain Document objects (one per page)."""
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    logger.info(f"Loaded {len(docs)} pages from {pdf_path}")
    return docs


def build_vectordb(
    chunks: list[Document],
    collection_name: str = "rag_eval",
    persist_dir: str = None,
) -> Chroma:
    """
    Embeds chunks and stores them in ChromaDB.
    If persist_dir is set, ChromaDB will save to disk so you don't re-embed on restart.
    """
    persist_dir = persist_dir or settings.CHROMA_PERSIST_DIR

    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=OpenAIEmbeddings(),
        collection_name=collection_name,
        persist_directory=persist_dir,
    )
    logger.info(f"ChromaDB built: {len(chunks)} chunks in collection '{collection_name}'")
    return vectordb


def build_pipeline(
    pdf_path: str = None,
    chunks: list[Document] = None,
    pipeline_name: str = "default",
    chunk_strategy: ChunkStrategy = ChunkStrategy.RECURSIVE,
    chunk_size: int = 512,
    retriever_mode: str = "rerank",
    top_k_fetch: int = 20,
    top_n_return: int = 4,
    llm_model: str = "gpt-4o-mini",
) -> RetrievalQA:
    """
    Builds and returns a LangChain RetrievalQA pipeline.

    Call with either pdf_path (for ingestion) or pre-built chunks
    (for the chunking comparison flow where chunks are built externally).

    Args:
        pdf_path       : path to the PDF to ingest (used if chunks not provided)
        chunks         : pre-built LangChain Document chunks (skips chunking step)
        pipeline_name  : label for this pipeline variant (used in ChromaDB collection name)
        chunk_strategy : ChunkStrategy.FIXED | RECURSIVE | SEMANTIC
        chunk_size     : token window size (not used for semantic strategy)
        retriever_mode : "vector" | "rerank" | "hybrid"
        top_k_fetch    : how many candidates to fetch before re-ranking
        top_n_return   : how many chunks to pass to the LLM as context
        llm_model      : OpenAI model name for generation

    Returns:
        A LangChain RetrievalQA chain with return_source_documents=True
    """
    # ── 1. Load and chunk ─────────────────────────────────────────────────────
    if chunks is None:
        if pdf_path is None:
            raise ValueError("Either pdf_path or chunks must be provided")
        docs = load_documents(pdf_path)
        chunks = chunk_documents(docs, strategy=chunk_strategy, chunk_size=chunk_size)

    # ── 2. Build vector store ─────────────────────────────────────────────────
    # Unique collection name per pipeline variant keeps experiments isolated
    collection_name = f"rag_eval_{pipeline_name}_{chunk_strategy.value}".replace("-", "_")
    vectordb = build_vectordb(chunks, collection_name=collection_name)

    # ── 3. Build retriever ────────────────────────────────────────────────────
    if retriever_mode == "vector":
        # Baseline: pure cosine similarity from ChromaDB
        retriever = vectordb.as_retriever(search_kwargs={"k": top_n_return})
        logger.info(f"Retriever: vector (k={top_n_return})")

    elif retriever_mode == "rerank":
        # Fetch more candidates, re-rank with cross-encoder
        retriever = build_reranking_retriever(
            vectordb=vectordb,
            top_k_fetch=top_k_fetch,
            top_n_return=top_n_return,
        )
        logger.info(f"Retriever: rerank (fetch={top_k_fetch}, return={top_n_return})")

    elif retriever_mode == "hybrid":
        # BM25 + vector fusion + optional cross-encoder re-ranking
        retriever = build_hybrid_retriever(
            chunks=chunks,
            vectordb=vectordb,
            top_k=top_k_fetch,
            top_n_return=top_n_return,
            rerank=True,
        )
        logger.info(f"Retriever: hybrid BM25+vector+rerank (fetch={top_k_fetch}, return={top_n_return})")

    else:
        raise ValueError(f"Unknown retriever_mode: '{retriever_mode}'. Choose from {RETRIEVER_MODES}")

    # ── 4. Build LLM + chain ──────────────────────────────────────────────────
    llm = ChatOpenAI(
        model=llm_model,
        temperature=0,          # Deterministic — important for reproducible eval
        openai_api_key=settings.OPENAI_API_KEY,
    )

    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,   # Required for RAGAS context extraction
    )

    logger.info(
        f"Pipeline built: name={pipeline_name} | strategy={chunk_strategy.value} | "
        f"retriever={retriever_mode} | llm={llm_model}"
    )
    return chain


# ── Pipeline comparison helper ──────────────────────────────────────────────────

async def compare_pipeline_variants(
    pdf_path: str,
    test_dataset: list[dict],
    eval_fn,
    variants: list[dict] = None,
) -> dict[str, dict]:
    """
    Runs multiple pipeline configurations against the same test dataset.
    Returns scores per variant — powers the side-by-side comparison view.

    Default variants compare all 3 retriever modes with recursive chunking.

    Example output:
    {
      "vector":  { "scores": {...}, "overall": 0.71, "avg_latency_ms": 210 },
      "rerank":  { "scores": {...}, "overall": 0.84, "avg_latency_ms": 390 },
      "hybrid":  { "scores": {...}, "overall": 0.87, "avg_latency_ms": 450 },
    }
    """
    import asyncio
    from app.core.ragas_runner import aggregate_scores
    from app.schemas.eval_schema import QuestionResult

    if variants is None:
        variants = [
            {"name": "vector",  "retriever_mode": "vector",  "chunk_strategy": ChunkStrategy.RECURSIVE},
            {"name": "rerank",  "retriever_mode": "rerank",  "chunk_strategy": ChunkStrategy.RECURSIVE},
            {"name": "hybrid",  "retriever_mode": "hybrid",  "chunk_strategy": ChunkStrategy.RECURSIVE},
        ]

    results = {}

    for variant in variants:
        name = variant["name"]
        logger.info(f"Evaluating pipeline variant: {name}")

        pipeline = build_pipeline(
            pdf_path=pdf_path,
            pipeline_name=name,
            chunk_strategy=variant.get("chunk_strategy", ChunkStrategy.RECURSIVE),
            retriever_mode=variant.get("retriever_mode", "rerank"),
        )

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
                question=question, answer=answer,
                ground_truth=ground_truth, scores=scores, latency_ms=latency,
            ))

        agg = aggregate_scores(question_results)
        results[name] = {
            "scores": agg.model_dump(),
            "overall": agg.overall,
            "avg_latency_ms": round(
                sum(r.latency_ms for r in question_results) / len(question_results), 2
            ),
        }

    return results