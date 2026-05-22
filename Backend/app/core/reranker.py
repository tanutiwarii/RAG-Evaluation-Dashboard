"""
core/reranker.py

Two retrieval upgrades for your RAG pipeline:

  1. Cross-encoder re-ranking
     — Takes the top-K chunks from vector search, re-scores every one
       against the query using a cross-encoder model, returns the
       top-N highest-scoring chunks.
     — More accurate than bi-encoder (dot product) similarity alone.
     — Model used: cross-encoder/ms-marco-MiniLM-L-6-v2 (fast, free, local)

  2. Hybrid search (BM25 + vector)
     — Combines keyword-based BM25 scores with dense vector similarity
       using Reciprocal Rank Fusion (RRF).
     — Catches cases where exact keyword matches matter (e.g. "ISO 27001")
       that pure semantic search misses.

Usage:
    # Drop-in replacement for vectordb.as_retriever()
    from app.core.reranker import build_reranking_retriever, build_hybrid_retriever

    # Cross-encoder only
    retriever = build_reranking_retriever(vectordb, top_k_fetch=20, top_n_return=4)

    # Hybrid BM25 + vector + optional re-ranking
    retriever = build_hybrid_retriever(chunks, vectordb, top_k=4, rerank=True)
"""

import logging
from functools import lru_cache
from typing import Optional

from langchain.schema import Document, BaseRetriever
from langchain_community.vectorstores import Chroma
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from sentence_transformers import CrossEncoder
from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)


# ── Cross-encoder model (loaded once, cached) ───────────────────────────────────

@lru_cache(maxsize=1)
def _load_cross_encoder(model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2") -> CrossEncoder:
    """
    Loads the cross-encoder model once and caches it in memory.
    On first call this downloads ~80MB — subsequent calls are instant.

    Why ms-marco-MiniLM-L-6-v2?
    - Trained specifically for passage re-ranking (MS MARCO dataset)
    - Fast enough for real-time use (~50ms for 20 passages)
    - Free, runs locally — no API cost per query
    - Strong baseline; upgrade to 'cross-encoder/ms-marco-MiniLM-L-12-v2' for +2-3% accuracy
    """
    logger.info(f"Loading cross-encoder model: {model_name}")
    return CrossEncoder(model_name)


def rerank_documents(
    query: str,
    documents: list[Document],
    top_n: int = 4,
    model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
) -> list[Document]:
    """
    Re-scores a list of candidate documents against a query using a cross-encoder.

    Cross-encoder vs bi-encoder:
    - Bi-encoder (used in ChromaDB): encodes query and doc separately, compares embeddings.
      Fast but misses fine-grained interactions between query and document tokens.
    - Cross-encoder: feeds BOTH query and document into the model at once.
      Sees every token interaction — far more accurate, but slower.

    Typical workflow: bi-encoder fetches top-20, cross-encoder re-ranks to top-4.
    This gives you accuracy close to re-ranking all chunks, at a fraction of the cost.

    Args:
        query:     The user's question
        documents: Candidate chunks from vector search (fetch more than you need)
        top_n:     How many to return after re-ranking
        model_name: HuggingFace cross-encoder model name

    Returns:
        Top-N documents sorted by cross-encoder relevance score (highest first)
    """
    if not documents:
        return []

    cross_encoder = _load_cross_encoder(model_name)

    # Build (query, passage) pairs — the cross-encoder needs both together
    pairs = [(query, doc.page_content) for doc in documents]

    # Score all pairs in one batch call — much faster than one-by-one
    scores = cross_encoder.predict(pairs)  # returns numpy array of floats

    # Attach scores to documents and sort descending
    scored_docs = sorted(
        zip(scores, documents),
        key=lambda x: x[0],
        reverse=True,
    )

    # Tag each doc with its re-rank score for debugging/logging
    top_docs = []
    for score, doc in scored_docs[:top_n]:
        doc.metadata["rerank_score"] = round(float(score), 4)
        top_docs.append(doc)

    logger.info(
        f"Re-ranked {len(documents)} docs → top {top_n} | "
        f"scores: {[round(float(s), 3) for s, _ in scored_docs[:top_n]]}"
    )

    return top_docs


# ── LangChain-compatible re-ranking retriever ───────────────────────────────────

class ReRankingRetriever(BaseRetriever):
    """
    Drop-in LangChain retriever that:
      1. Fetches top_k_fetch candidates from ChromaDB (bi-encoder)
      2. Re-ranks them with a cross-encoder
      3. Returns the top_n_return most relevant

    Use exactly like vectordb.as_retriever() — plug it into any LangChain chain.
    """

    vectordb: Chroma
    top_k_fetch: int = 20
    top_n_return: int = 4
    model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    class Config:
        arbitrary_types_allowed = True

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> list[Document]:
        # Step 1: Broad fetch from vector store
        candidates = self.vectordb.similarity_search(query, k=self.top_k_fetch)

        # Step 2: Cross-encoder re-ranking
        return rerank_documents(
            query=query,
            documents=candidates,
            top_n=self.top_n_return,
            model_name=self.model_name,
        )


def build_reranking_retriever(
    vectordb: Chroma,
    top_k_fetch: int = 20,
    top_n_return: int = 4,
) -> ReRankingRetriever:
    """
    Factory function. Returns a ReRankingRetriever ready to use in a LangChain chain.

    Example:
        retriever = build_reranking_retriever(vectordb, top_k_fetch=20, top_n_return=4)
        qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever, ...)
    """
    return ReRankingRetriever(
        vectordb=vectordb,
        top_k_fetch=top_k_fetch,
        top_n_return=top_n_return,
    )


# ── BM25 keyword index ──────────────────────────────────────────────────────────

class BM25Index:
    """
    Wraps rank_bm25's BM25Okapi with LangChain Document support.
    Used as the keyword search component in hybrid retrieval.

    BM25Okapi is the standard probabilistic keyword ranking algorithm.
    It scores documents based on term frequency + inverse document frequency,
    with length normalization. Ideal for exact keyword matches.
    """

    def __init__(self, documents: list[Document]):
        self.documents = documents
        # Tokenize by whitespace — simple but effective for BM25
        tokenized = [doc.page_content.lower().split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized)
        logger.info(f"BM25 index built: {len(documents)} documents")

    def search(self, query: str, top_k: int = 20) -> list[tuple[float, Document]]:
        """
        Returns top_k (score, document) tuples sorted by BM25 score descending.
        """
        tokens = query.lower().split()
        scores = self.bm25.get_scores(tokens)

        # Pair scores with documents and sort
        scored = sorted(
            zip(scores, self.documents),
            key=lambda x: x[0],
            reverse=True,
        )
        return scored[:top_k]


# ── Hybrid retriever (BM25 + vector + optional re-ranking) ──────────────────────

class HybridRetriever(BaseRetriever):
    """
    Combines BM25 keyword search with ChromaDB vector search
    using Reciprocal Rank Fusion (RRF).

    Why hybrid?
    - Vector search: great at semantic similarity ("what does RAG stand for")
    - BM25: great at exact matches ("ISO 27001 clause 6.1.2")
    - Together: catches both cases and consistently outperforms either alone

    Reciprocal Rank Fusion formula:
        RRF(d) = Σ  1 / (k + rank_i(d))
    where k=60 is a smoothing constant and rank_i is document d's rank in list i.
    Result: documents that appear highly ranked in BOTH lists score highest.
    """

    vectordb: Chroma
    bm25_index: BM25Index
    top_k: int = 20
    top_n_return: int = 4
    rerank: bool = True
    rrf_k: int = 60               # RRF smoothing constant — 60 is standard
    rerank_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    class Config:
        arbitrary_types_allowed = True

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> list[Document]:
        # ── 1. Get vector search results ─────────────────────────────────────
        vector_results = self.vectordb.similarity_search(query, k=self.top_k)
        # Map content → rank position (0-indexed)
        vector_ranks = {doc.page_content: idx for idx, doc in enumerate(vector_results)}

        # ── 2. Get BM25 keyword search results ────────────────────────────────
        bm25_results = self.bm25_index.search(query, top_k=self.top_k)
        bm25_ranks = {doc.page_content: idx for idx, (_, doc) in enumerate(bm25_results)}

        # ── 3. Reciprocal Rank Fusion ─────────────────────────────────────────
        # Collect all unique documents from both lists
        all_docs: dict[str, Document] = {}
        for doc in vector_results:
            all_docs[doc.page_content] = doc
        for _, doc in bm25_results:
            all_docs[doc.page_content] = doc

        # Compute RRF score for each document
        rrf_scores: dict[str, float] = {}
        for content, doc in all_docs.items():
            score = 0.0
            if content in vector_ranks:
                score += 1.0 / (self.rrf_k + vector_ranks[content])
            if content in bm25_ranks:
                score += 1.0 / (self.rrf_k + bm25_ranks[content])
            rrf_scores[content] = score

        # Sort by RRF score descending
        fused = sorted(all_docs.values(), key=lambda d: rrf_scores[d.page_content], reverse=True)

        # Tag with fusion score
        for doc in fused:
            doc.metadata["rrf_score"] = round(rrf_scores[doc.page_content], 6)

        # ── 4. Optional cross-encoder re-ranking on top candidates ────────────
        candidates = fused[:self.top_k]
        if self.rerank:
            return rerank_documents(
                query=query,
                documents=candidates,
                top_n=self.top_n_return,
                model_name=self.rerank_model,
            )

        return candidates[:self.top_n_return]


def build_hybrid_retriever(
    chunks: list[Document],
    vectordb: Chroma,
    top_k: int = 20,
    top_n_return: int = 4,
    rerank: bool = True,
) -> HybridRetriever:
    """
    Factory function. Builds BM25 index from chunks + wraps vectordb.
    Returns a HybridRetriever ready to use in any LangChain chain.

    Example:
        retriever = build_hybrid_retriever(chunks, vectordb, rerank=True)
        qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever, ...)
    """
    bm25_index = BM25Index(chunks)
    return HybridRetriever(
        vectordb=vectordb,
        bm25_index=bm25_index,
        top_k=top_k,
        top_n_return=top_n_return,
        rerank=rerank,
    )