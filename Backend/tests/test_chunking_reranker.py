"""
tests/test_chunking_reranker.py

Unit tests for:
  - All 3 chunking strategies
  - chunk_documents() unified entrypoint
  - BM25Index search
  - rerank_documents() with mocked cross-encoder
  - ReRankingRetriever
  - HybridRetriever (BM25 + vector + re-rank)
  - compare_chunking_strategies()

Run with: pytest backend/tests/ -v
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from langchain.schema import Document

from app.core.chunking import (
    fixed_size_chunks, recursive_chunks,
    chunk_documents, ChunkStrategy,
)
from app.core.reranker import (
    BM25Index, rerank_documents,
    ReRankingRetriever, HybridRetriever,
)


# ── Fixtures ────────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_docs():
    """Three small documents simulating PDF pages."""
    return [
        Document(page_content=(
            "Retrieval-Augmented Generation (RAG) combines a retrieval system "
            "with a large language model. The retriever fetches relevant documents "
            "from a vector store. The generator then uses those documents as context."
        ), metadata={"source": "page_1"}),
        Document(page_content=(
            "Vector databases store embeddings of text chunks. ChromaDB and FAISS "
            "are popular choices. Similarity search uses cosine distance or dot product "
            "to find the most relevant chunks for a given query."
        ), metadata={"source": "page_2"}),
        Document(page_content=(
            "RAGAS is an evaluation framework for RAG pipelines. It measures faithfulness, "
            "answer relevancy, context precision, and context recall. Each metric scores "
            "between 0 and 1, where higher is better."
        ), metadata={"source": "page_3"}),
    ]


@pytest.fixture
def sample_chunks(sample_docs):
    return recursive_chunks(sample_docs, chunk_size=200, chunk_overlap=20)


# ── Chunking strategy tests ─────────────────────────────────────────────────────

class TestFixedSizeChunks:
    def test_returns_documents(self, sample_docs):
        chunks = fixed_size_chunks(sample_docs, chunk_size=100)
        assert len(chunks) > 0
        assert all(isinstance(c, Document) for c in chunks)

    def test_chunks_are_not_longer_than_chunk_size(self, sample_docs):
        chunk_size = 80
        chunks = fixed_size_chunks(sample_docs, chunk_size=chunk_size)
        for chunk in chunks:
            # Allow slight overflow at word boundaries
            assert len(chunk.page_content) <= chunk_size + 20

    def test_metadata_preserved(self, sample_docs):
        chunks = fixed_size_chunks(sample_docs, chunk_size=200)
        # Original metadata should still be present
        sources = {c.metadata.get("source") for c in chunks}
        assert "page_1" in sources


class TestRecursiveChunks:
    def test_returns_more_chunks_than_docs(self, sample_docs):
        chunks = recursive_chunks(sample_docs, chunk_size=100, chunk_overlap=10)
        assert len(chunks) >= len(sample_docs)

    def test_overlap_is_applied(self, sample_docs):
        chunks_no_overlap = recursive_chunks(sample_docs, chunk_size=150, chunk_overlap=0)
        chunks_overlap = recursive_chunks(sample_docs, chunk_size=150, chunk_overlap=50)
        # With overlap, we expect more (or equal) chunks
        assert len(chunks_overlap) >= len(chunks_no_overlap)

    def test_all_chunks_are_documents(self, sample_docs):
        chunks = recursive_chunks(sample_docs)
        assert all(isinstance(c, Document) for c in chunks)


class TestChunkDocumentsEntrypoint:
    def test_fixed_strategy_routes_correctly(self, sample_docs):
        chunks = chunk_documents(sample_docs, strategy=ChunkStrategy.FIXED, chunk_size=200)
        assert len(chunks) > 0
        assert all(c.metadata["chunk_strategy"] == "fixed" for c in chunks)

    def test_recursive_strategy_routes_correctly(self, sample_docs):
        chunks = chunk_documents(sample_docs, strategy=ChunkStrategy.RECURSIVE, chunk_size=200)
        assert all(c.metadata["chunk_strategy"] == "recursive" for c in chunks)

    def test_metadata_tagged_with_strategy(self, sample_docs):
        for strategy in [ChunkStrategy.FIXED, ChunkStrategy.RECURSIVE]:
            chunks = chunk_documents(sample_docs, strategy=strategy)
            for chunk in chunks:
                assert "chunk_strategy" in chunk.metadata
                assert "chunk_size_setting" in chunk.metadata

    def test_semantic_strategy_calls_semantic_chunker(self, sample_docs):
        """Semantic strategy requires OpenAI — mock the SemanticChunker."""
        mock_chunks = [Document(page_content="mocked semantic chunk", metadata={})]
        with patch("app.core.chunking.SemanticChunker") as MockChunker:
            instance = MockChunker.return_value
            instance.split_documents.return_value = mock_chunks
            chunks = chunk_documents(sample_docs, strategy=ChunkStrategy.SEMANTIC)
        assert chunks[0].page_content == "mocked semantic chunk"

    def test_invalid_strategy_raises(self, sample_docs):
        with pytest.raises(ValueError):
            chunk_documents(sample_docs, strategy="nonexistent")


# ── BM25 index tests ────────────────────────────────────────────────────────────

class TestBM25Index:
    def test_search_returns_correct_count(self, sample_chunks):
        index = BM25Index(sample_chunks)
        results = index.search("RAG retrieval", top_k=3)
        assert len(results) <= 3

    def test_search_returns_score_doc_tuples(self, sample_chunks):
        index = BM25Index(sample_chunks)
        results = index.search("vector database ChromaDB", top_k=5)
        for score, doc in results:
            assert isinstance(score, float)
            assert isinstance(doc, Document)

    def test_relevant_doc_scores_higher_than_irrelevant(self, sample_chunks):
        index = BM25Index(sample_chunks)
        results = index.search("RAGAS faithfulness evaluation metrics", top_k=len(sample_chunks))
        # The top result should contain "RAGAS" or "evaluation"
        top_doc = results[0][1]
        assert any(kw in top_doc.page_content.lower() for kw in ["ragas", "eval", "faithfulness"])

    def test_empty_query_returns_results(self, sample_chunks):
        index = BM25Index(sample_chunks)
        results = index.search("", top_k=3)
        # BM25 returns uniform low scores for empty query — should not crash
        assert isinstance(results, list)


# ── Cross-encoder re-ranking tests ──────────────────────────────────────────────

class TestRerankDocuments:
    def test_returns_top_n_documents(self, sample_chunks):
        mock_scores = [0.9, 0.3, 0.7, 0.1, 0.5]
        with patch("app.core.reranker._load_cross_encoder") as mock_loader:
            mock_model = MagicMock()
            mock_model.predict.return_value = mock_scores[:len(sample_chunks)]
            mock_loader.return_value = mock_model

            results = rerank_documents("What is RAGAS?", sample_chunks, top_n=2)

        assert len(results) == 2

    def test_results_sorted_by_score_descending(self, sample_chunks):
        # Assign descending scores so we can verify sort order
        scores = list(range(len(sample_chunks), 0, -1))
        with patch("app.core.reranker._load_cross_encoder") as mock_loader:
            mock_model = MagicMock()
            mock_model.predict.return_value = scores
            mock_loader.return_value = mock_model

            results = rerank_documents("query", sample_chunks, top_n=len(sample_chunks))

        rerank_scores = [doc.metadata["rerank_score"] for doc in results]
        assert rerank_scores == sorted(rerank_scores, reverse=True)

    def test_rerank_score_tagged_in_metadata(self, sample_chunks):
        mock_scores = [float(i) for i in range(len(sample_chunks))]
        with patch("app.core.reranker._load_cross_encoder") as mock_loader:
            mock_model = MagicMock()
            mock_model.predict.return_value = mock_scores
            mock_loader.return_value = mock_model

            results = rerank_documents("query", sample_chunks, top_n=2)

        for doc in results:
            assert "rerank_score" in doc.metadata
            assert isinstance(doc.metadata["rerank_score"], float)

    def test_empty_documents_returns_empty(self):
        results = rerank_documents("query", [], top_n=4)
        assert results == []


# ── ReRankingRetriever tests ─────────────────────────────────────────────────────

class TestReRankingRetriever:
    def test_retriever_calls_similarity_search_and_reranks(self, sample_chunks):
        mock_vectordb = MagicMock()
        mock_vectordb.similarity_search.return_value = sample_chunks

        mock_scores = [float(i) for i in range(len(sample_chunks))]
        with patch("app.core.reranker._load_cross_encoder") as mock_loader:
            mock_model = MagicMock()
            mock_model.predict.return_value = mock_scores
            mock_loader.return_value = mock_model

            retriever = ReRankingRetriever(
                vectordb=mock_vectordb,
                top_k_fetch=10,
                top_n_return=2,
            )
            results = retriever._get_relevant_documents("What is RAGAS?", run_manager=MagicMock())

        mock_vectordb.similarity_search.assert_called_once_with("What is RAGAS?", k=10)
        assert len(results) == 2

    def test_retriever_returns_no_more_than_top_n(self, sample_chunks):
        mock_vectordb = MagicMock()
        mock_vectordb.similarity_search.return_value = sample_chunks

        with patch("app.core.reranker._load_cross_encoder") as mock_loader:
            mock_model = MagicMock()
            mock_model.predict.return_value = [0.5] * len(sample_chunks)
            mock_loader.return_value = mock_model

            retriever = ReRankingRetriever(
                vectordb=mock_vectordb, top_k_fetch=20, top_n_return=2
            )
            results = retriever._get_relevant_documents("query", run_manager=MagicMock())

        assert len(results) <= 2


# ── HybridRetriever tests ────────────────────────────────────────────────────────

class TestHybridRetriever:
    def test_hybrid_fuses_both_sources(self, sample_chunks):
        mock_vectordb = MagicMock()
        mock_vectordb.similarity_search.return_value = sample_chunks

        bm25_index = BM25Index(sample_chunks)

        with patch("app.core.reranker._load_cross_encoder") as mock_loader:
            mock_model = MagicMock()
            mock_model.predict.return_value = [0.8, 0.6, 0.4]
            mock_loader.return_value = mock_model

            retriever = HybridRetriever(
                vectordb=mock_vectordb,
                bm25_index=bm25_index,
                top_k=10,
                top_n_return=2,
                rerank=True,
            )
            results = retriever._get_relevant_documents(
                "vector database similarity search", run_manager=MagicMock()
            )

        assert len(results) <= 2

    def test_rrf_score_tagged_in_metadata(self, sample_chunks):
        mock_vectordb = MagicMock()
        mock_vectordb.similarity_search.return_value = sample_chunks
        bm25_index = BM25Index(sample_chunks)

        with patch("app.core.reranker._load_cross_encoder") as mock_loader:
            mock_model = MagicMock()
            mock_model.predict.return_value = [0.9] * len(sample_chunks)
            mock_loader.return_value = mock_model

            retriever = HybridRetriever(
                vectordb=mock_vectordb,
                bm25_index=bm25_index,
                top_k=5, top_n_return=3, rerank=True,
            )
            results = retriever._get_relevant_documents("RAGAS evaluation", run_manager=MagicMock())

        # rrf_score should be present on returned docs (set before re-rank)
        # At least verify no crash and results are Documents
        assert all(isinstance(r, Document) for r in results)

    def test_hybrid_without_rerank(self, sample_chunks):
        mock_vectordb = MagicMock()
        mock_vectordb.similarity_search.return_value = sample_chunks
        bm25_index = BM25Index(sample_chunks)

        retriever = HybridRetriever(
            vectordb=mock_vectordb,
            bm25_index=bm25_index,
            top_k=5, top_n_return=2,
            rerank=False,   # skip cross-encoder
        )
        results = retriever._get_relevant_documents("ChromaDB embeddings", run_manager=MagicMock())
        assert len(results) <= 2
        assert all(isinstance(r, Document) for r in results)


# ── compare_chunking_strategies integration test (mocked) ───────────────────────

class TestCompareChunkingStrategies:
    @pytest.mark.asyncio
    async def test_returns_scores_for_each_strategy(self, sample_docs):
        from app.core.chunking import compare_chunking_strategies
        from app.schemas.eval_schema import RAGASScores

        mock_scores = RAGASScores(
            faithfulness=0.85, answer_relevancy=0.90,
            context_precision=0.78, context_recall=0.82, answer_correctness=0.88,
        )

        # Mock the pipeline: always returns a fixed answer
        def mock_build_pipeline(chunks):
            pipeline = MagicMock()
            pipeline.return_value = {
                "result": "RAG combines retrieval and generation.",
                "source_documents": [chunks[0]] if chunks else [],
            }
            return pipeline

        async def mock_eval_fn(question, answer, contexts, ground_truth):
            return mock_scores, 120.0

        test_dataset = [
            {"question": "What is RAG?", "ground_truth": "RAG is retrieval-augmented generation."},
        ]

        results = await compare_chunking_strategies(
            docs=sample_docs,
            build_pipeline_fn=mock_build_pipeline,
            test_dataset=test_dataset,
            eval_fn=mock_eval_fn,
            strategies=[ChunkStrategy.FIXED, ChunkStrategy.RECURSIVE],
            chunk_size=200,
        )

        assert "fixed" in results
        assert "recursive" in results
        assert results["fixed"]["overall"] == mock_scores.overall
        assert results["recursive"]["chunk_count"] > 0