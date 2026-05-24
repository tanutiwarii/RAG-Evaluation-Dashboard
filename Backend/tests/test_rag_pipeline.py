"""
tests/test_rag_pipeline.py

Unit tests for backend/app/core/rag_pipeline.py

Covers:
  - load_documents()           — PDF loading, page count, metadata
  - build_vectordb()           — ChromaDB creation, collection naming, chunk count
  - build_pipeline()           — all 3 retriever modes, chunking strategies, error paths
  - compare_pipeline_variants() — runs all variants, returns correct shape

All LangChain / ChromaDB / OpenAI calls are mocked.
No real API keys or files needed to run these tests.

Run with:
    pytest backend/tests/test_rag_pipeline.py -v
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock, call
from langchain.schema import Document

from app.core.rag_pipeline import (
    load_documents,
    build_vectordb,
    build_pipeline,
    compare_pipeline_variants,
    RETRIEVER_MODES,
)
from app.core.chunking import ChunkStrategy


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_docs():
    """Three mock Documents simulating a 3-page PDF."""
    return [
        Document(page_content="RAG combines retrieval with generation.", metadata={"source": "doc.pdf", "page": 0}),
        Document(page_content="ChromaDB stores vector embeddings for fast lookup.", metadata={"source": "doc.pdf", "page": 1}),
        Document(page_content="RAGAS evaluates faithfulness and context precision.", metadata={"source": "doc.pdf", "page": 2}),
    ]


@pytest.fixture
def sample_chunks(sample_docs):
    """Six small chunks split from sample_docs."""
    return [
        Document(page_content="RAG combines retrieval", metadata={"source": "doc.pdf", "chunk_strategy": "recursive"}),
        Document(page_content="with generation.", metadata={"source": "doc.pdf", "chunk_strategy": "recursive"}),
        Document(page_content="ChromaDB stores vector embeddings", metadata={"source": "doc.pdf", "chunk_strategy": "recursive"}),
        Document(page_content="for fast lookup.", metadata={"source": "doc.pdf", "chunk_strategy": "recursive"}),
        Document(page_content="RAGAS evaluates faithfulness", metadata={"source": "doc.pdf", "chunk_strategy": "recursive"}),
        Document(page_content="and context precision.", metadata={"source": "doc.pdf", "chunk_strategy": "recursive"}),
    ]


@pytest.fixture
def mock_vectordb(sample_chunks):
    """Mock ChromaDB instance."""
    vdb = MagicMock()
    vdb.similarity_search.return_value = sample_chunks[:4]
    vdb.as_retriever.return_value = MagicMock()
    return vdb


@pytest.fixture
def mock_chain():
    """Mock LangChain RetrievalQA chain."""
    chain = MagicMock()
    chain.return_value = {
        "result": "RAG is retrieval-augmented generation.",
        "source_documents": [
            Document(page_content="RAG combines retrieval with generation.", metadata={})
        ],
    }
    return chain


# ── load_documents() ──────────────────────────────────────────────────────────

class TestLoadDocuments:
    def test_returns_list_of_documents(self, sample_docs):
        with patch("app.core.rag_pipeline.PyPDFLoader") as MockLoader:
            MockLoader.return_value.load.return_value = sample_docs
            docs = load_documents("fake/path/doc.pdf")

        assert isinstance(docs, list)
        assert len(docs) == 3
        assert all(isinstance(d, Document) for d in docs)

    def test_calls_pypdf_loader_with_correct_path(self):
        with patch("app.core.rag_pipeline.PyPDFLoader") as MockLoader:
            MockLoader.return_value.load.return_value = []
            load_documents("some/path/file.pdf")

        MockLoader.assert_called_once_with("some/path/file.pdf")

    def test_preserves_page_metadata(self, sample_docs):
        with patch("app.core.rag_pipeline.PyPDFLoader") as MockLoader:
            MockLoader.return_value.load.return_value = sample_docs
            docs = load_documents("doc.pdf")

        assert docs[0].metadata["page"] == 0
        assert docs[2].metadata["page"] == 2

    def test_returns_empty_list_for_empty_pdf(self):
        with patch("app.core.rag_pipeline.PyPDFLoader") as MockLoader:
            MockLoader.return_value.load.return_value = []
            docs = load_documents("empty.pdf")

        assert docs == []

    def test_propagates_loader_exception(self):
        with patch("app.core.rag_pipeline.PyPDFLoader") as MockLoader:
            MockLoader.return_value.load.side_effect = FileNotFoundError("PDF not found")
            with pytest.raises(FileNotFoundError, match="PDF not found"):
                load_documents("nonexistent.pdf")


# ── build_vectordb() ──────────────────────────────────────────────────────────

class TestBuildVectordb:
    def test_creates_chroma_with_correct_collection_name(self, sample_chunks):
        with patch("app.core.rag_pipeline.Chroma") as MockChroma, \
             patch("app.core.rag_pipeline.OpenAIEmbeddings"):
            build_vectordb(sample_chunks, collection_name="test_collection")

        call_kwargs = MockChroma.from_documents.call_args.kwargs
        assert call_kwargs["collection_name"] == "test_collection"

    def test_passes_all_chunks_to_chroma(self, sample_chunks):
        with patch("app.core.rag_pipeline.Chroma") as MockChroma, \
             patch("app.core.rag_pipeline.OpenAIEmbeddings"):
            build_vectordb(sample_chunks)

        call_args = MockChroma.from_documents.call_args
        passed_docs = call_args.kwargs.get("documents") or call_args.args[0]
        assert len(passed_docs) == len(sample_chunks)

    def test_uses_settings_persist_dir_by_default(self, sample_chunks):
        with patch("app.core.rag_pipeline.Chroma") as MockChroma, \
             patch("app.core.rag_pipeline.OpenAIEmbeddings"), \
             patch("app.core.rag_pipeline.settings") as mock_settings:
            mock_settings.CHROMA_PERSIST_DIR = "/tmp/test_chroma"
            build_vectordb(sample_chunks)

        call_kwargs = MockChroma.from_documents.call_args.kwargs
        assert call_kwargs["persist_directory"] == "/tmp/test_chroma"

    def test_accepts_explicit_persist_dir(self, sample_chunks):
        with patch("app.core.rag_pipeline.Chroma") as MockChroma, \
             patch("app.core.rag_pipeline.OpenAIEmbeddings"):
            build_vectordb(sample_chunks, persist_dir="/custom/dir")

        call_kwargs = MockChroma.from_documents.call_args.kwargs
        assert call_kwargs["persist_directory"] == "/custom/dir"

    def test_returns_chroma_instance(self, sample_chunks):
        mock_vdb = MagicMock()
        with patch("app.core.rag_pipeline.Chroma") as MockChroma, \
             patch("app.core.rag_pipeline.OpenAIEmbeddings"):
            MockChroma.from_documents.return_value = mock_vdb
            result = build_vectordb(sample_chunks)

        assert result is mock_vdb


# ── build_pipeline() ─────────────────────────────────────────────────────────

class TestBuildPipeline:

    def _patch_all(self):
        """Context manager that patches all external dependencies."""
        return [
            patch("app.core.rag_pipeline.load_documents"),
            patch("app.core.rag_pipeline.chunk_documents"),
            patch("app.core.rag_pipeline.build_vectordb"),
            patch("app.core.rag_pipeline.ChatOpenAI"),
            patch("app.core.rag_pipeline.RetrievalQA"),
            patch("app.core.rag_pipeline.build_reranking_retriever"),
            patch("app.core.rag_pipeline.build_hybrid_retriever"),
        ]

    def test_raises_if_neither_pdf_nor_chunks_provided(self):
        with pytest.raises(ValueError, match="Either pdf_path or chunks must be provided"):
            build_pipeline()

    def test_loads_pdf_when_pdf_path_given(self, sample_docs, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.load_documents", return_value=sample_docs) as mock_load, \
             patch("app.core.rag_pipeline.chunk_documents", return_value=sample_chunks), \
             patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(pdf_path="doc.pdf")

        mock_load.assert_called_once_with("doc.pdf")

    def test_skips_loading_when_chunks_provided(self, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.load_documents") as mock_load, \
             patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks)

        mock_load.assert_not_called()

    # ── Retriever mode tests ──────────────────────────────────────────────────

    def test_vector_mode_uses_as_retriever(self, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA:
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks, retriever_mode="vector")

        mock_vectordb.as_retriever.assert_called_once()

    def test_rerank_mode_calls_build_reranking_retriever(self, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever") as mock_rerank:
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks, retriever_mode="rerank")

        mock_rerank.assert_called_once()

    def test_hybrid_mode_calls_build_hybrid_retriever(self, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_hybrid_retriever") as mock_hybrid:
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks, retriever_mode="hybrid")

        mock_hybrid.assert_called_once()

    def test_invalid_retriever_mode_raises(self, sample_chunks, mock_vectordb):
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"):
            with pytest.raises(ValueError, match="Unknown retriever_mode"):
                build_pipeline(chunks=sample_chunks, retriever_mode="nonexistent")

    def test_all_retriever_modes_are_valid(self):
        """Smoke test: RETRIEVER_MODES constant matches what build_pipeline accepts."""
        assert set(RETRIEVER_MODES) == {"vector", "rerank", "hybrid"}

    # ── Chunking strategy tests ───────────────────────────────────────────────

    def test_chunking_strategy_passed_to_chunk_documents(self, sample_docs, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.load_documents", return_value=sample_docs), \
             patch("app.core.rag_pipeline.chunk_documents", return_value=sample_chunks) as mock_chunk, \
             patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(pdf_path="doc.pdf", chunk_strategy=ChunkStrategy.SEMANTIC)

        call_kwargs = mock_chunk.call_args.kwargs
        assert call_kwargs["strategy"] == ChunkStrategy.SEMANTIC

    def test_chunk_size_passed_to_chunk_documents(self, sample_docs, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.load_documents", return_value=sample_docs), \
             patch("app.core.rag_pipeline.chunk_documents", return_value=sample_chunks) as mock_chunk, \
             patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(pdf_path="doc.pdf", chunk_size=256)

        call_kwargs = mock_chunk.call_args.kwargs
        assert call_kwargs["chunk_size"] == 256

    # ── LLM config tests ──────────────────────────────────────────────────────

    def test_llm_temperature_is_zero(self, sample_chunks, mock_vectordb, mock_chain):
        """Temperature must be 0 for deterministic, reproducible evals."""
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI") as MockLLM, \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks)

        call_kwargs = MockLLM.call_args.kwargs
        assert call_kwargs["temperature"] == 0

    def test_custom_llm_model_passed_through(self, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI") as MockLLM, \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks, llm_model="gpt-4o")

        call_kwargs = MockLLM.call_args.kwargs
        assert call_kwargs["model"] == "gpt-4o"

    def test_return_source_documents_is_true(self, sample_chunks, mock_vectordb, mock_chain):
        """source_documents must be True — RAGAS needs them for context extraction."""
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks)

        call_kwargs = MockQA.from_chain_type.call_args.kwargs
        assert call_kwargs["return_source_documents"] is True

    def test_returns_retrieval_qa_chain(self, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            result = build_pipeline(chunks=sample_chunks)

        assert result is mock_chain

    # ── Collection name uniqueness ────────────────────────────────────────────

    def test_collection_name_includes_pipeline_name_and_strategy(self, sample_chunks, mock_vectordb, mock_chain):
        with patch("app.core.rag_pipeline.build_vectordb", return_value=mock_vectordb) as mock_vdb_fn, \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks, pipeline_name="my-pipe", chunk_strategy=ChunkStrategy.RECURSIVE)

        call_kwargs = mock_vdb_fn.call_args.kwargs
        collection = call_kwargs["collection_name"]
        assert "my" in collection
        assert "recursive" in collection

    def test_two_different_pipeline_names_produce_different_collections(self, sample_chunks, mock_vectordb, mock_chain):
        collections = []

        def capture_collection(**kwargs):
            collections.append(kwargs["collection_name"])
            return mock_vectordb

        with patch("app.core.rag_pipeline.build_vectordb", side_effect=capture_collection), \
             patch("app.core.rag_pipeline.ChatOpenAI"), \
             patch("app.core.rag_pipeline.RetrievalQA") as MockQA, \
             patch("app.core.rag_pipeline.build_reranking_retriever"):
            MockQA.from_chain_type.return_value = mock_chain
            build_pipeline(chunks=sample_chunks, pipeline_name="pipe-a")
            build_pipeline(chunks=sample_chunks, pipeline_name="pipe-b")

        assert collections[0] != collections[1]


# ── compare_pipeline_variants() ──────────────────────────────────────────────

class TestComparePipelineVariants:

    @pytest.mark.asyncio
    async def test_returns_result_for_each_default_variant(self, sample_chunks, mock_chain):
        """Default variants are vector, rerank, hybrid."""
        from app.schemas.eval_schema import RAGASScores

        mock_scores = RAGASScores(
            faithfulness=0.85, answer_relevancy=0.88,
            context_precision=0.80, context_recall=0.78, answer_correctness=0.83,
        )

        async def mock_eval_fn(q, a, ctx, gt):
            return mock_scores, 150.0

        with patch("app.core.rag_pipeline.build_pipeline") as mock_bp, \
             patch("app.core.rag_pipeline.load_documents", return_value=sample_chunks):
            mock_bp.return_value = mock_chain

            test_dataset = [
                {"question": "What is RAG?", "ground_truth": "RAG is retrieval-augmented generation."}
            ]

            results = await compare_pipeline_variants(
                pdf_path="doc.pdf",
                test_dataset=test_dataset,
                eval_fn=mock_eval_fn,
            )

        assert "vector" in results
        assert "rerank" in results
        assert "hybrid" in results

    @pytest.mark.asyncio
    async def test_each_result_has_scores_overall_and_latency(self, sample_chunks, mock_chain):
        from app.schemas.eval_schema import RAGASScores

        mock_scores = RAGASScores(
            faithfulness=0.9, answer_relevancy=0.9,
            context_precision=0.9, context_recall=0.9, answer_correctness=0.9,
        )

        async def mock_eval_fn(q, a, ctx, gt):
            return mock_scores, 200.0

        with patch("app.core.rag_pipeline.build_pipeline") as mock_bp, \
             patch("app.core.rag_pipeline.load_documents", return_value=sample_chunks):
            mock_bp.return_value = mock_chain

            results = await compare_pipeline_variants(
                pdf_path="doc.pdf",
                test_dataset=[{"question": "q", "ground_truth": "gt"}],
                eval_fn=mock_eval_fn,
            )

        for variant_result in results.values():
            assert "scores" in variant_result
            assert "overall" in variant_result
            assert "avg_latency_ms" in variant_result

    @pytest.mark.asyncio
    async def test_overall_score_is_mean_of_five_metrics(self, sample_chunks, mock_chain):
        from app.schemas.eval_schema import RAGASScores

        mock_scores = RAGASScores(
            faithfulness=1.0, answer_relevancy=1.0,
            context_precision=1.0, context_recall=1.0, answer_correctness=1.0,
        )

        async def mock_eval_fn(q, a, ctx, gt):
            return mock_scores, 100.0

        with patch("app.core.rag_pipeline.build_pipeline") as mock_bp, \
             patch("app.core.rag_pipeline.load_documents", return_value=sample_chunks):
            mock_bp.return_value = mock_chain

            results = await compare_pipeline_variants(
                pdf_path="doc.pdf",
                test_dataset=[{"question": "q", "ground_truth": "gt"}],
                eval_fn=mock_eval_fn,
            )

        for variant_result in results.values():
            assert variant_result["overall"] == 1.0

    @pytest.mark.asyncio
    async def test_build_pipeline_called_once_per_variant(self, sample_chunks, mock_chain):
        from app.schemas.eval_schema import RAGASScores

        mock_scores = RAGASScores(
            faithfulness=0.8, answer_relevancy=0.8,
            context_precision=0.8, context_recall=0.8, answer_correctness=0.8,
        )

        async def mock_eval_fn(q, a, ctx, gt):
            return mock_scores, 100.0

        with patch("app.core.rag_pipeline.build_pipeline") as mock_bp, \
             patch("app.core.rag_pipeline.load_documents", return_value=sample_chunks):
            mock_bp.return_value = mock_chain

            await compare_pipeline_variants(
                pdf_path="doc.pdf",
                test_dataset=[{"question": "q", "ground_truth": "gt"}],
                eval_fn=mock_eval_fn,
            )

        # 3 default variants → build_pipeline called 3 times
        assert mock_bp.call_count == 3

    @pytest.mark.asyncio
    async def test_custom_variants_respected(self, sample_chunks, mock_chain):
        from app.schemas.eval_schema import RAGASScores

        mock_scores = RAGASScores(
            faithfulness=0.75, answer_relevancy=0.75,
            context_precision=0.75, context_recall=0.75, answer_correctness=0.75,
        )

        async def mock_eval_fn(q, a, ctx, gt):
            return mock_scores, 120.0

        custom_variants = [
            {"name": "only-rerank", "retriever_mode": "rerank", "chunk_strategy": ChunkStrategy.RECURSIVE},
        ]

        with patch("app.core.rag_pipeline.build_pipeline") as mock_bp, \
             patch("app.core.rag_pipeline.load_documents", return_value=sample_chunks):
            mock_bp.return_value = mock_chain

            results = await compare_pipeline_variants(
                pdf_path="doc.pdf",
                test_dataset=[{"question": "q", "ground_truth": "gt"}],
                eval_fn=mock_eval_fn,
                variants=custom_variants,
            )

        assert "only-rerank" in results
        assert len(results) == 1
        assert mock_bp.call_count == 1

    @pytest.mark.asyncio
    async def test_avg_latency_is_correct_average(self, sample_chunks, mock_chain):
        from app.schemas.eval_schema import RAGASScores
        import asyncio

        mock_scores = RAGASScores(
            faithfulness=0.8, answer_relevancy=0.8,
            context_precision=0.8, context_recall=0.8, answer_correctness=0.8,
        )
        latencies = [100.0, 200.0, 300.0]
        latency_iter = iter(latencies)

        async def mock_eval_fn(q, a, ctx, gt):
            return mock_scores, next(latency_iter)

        # Build a chain that returns 3 questions worth of results
        mock_chain.return_value = {
            "result": "answer",
            "source_documents": [Document(page_content="ctx", metadata={})],
        }

        with patch("app.core.rag_pipeline.build_pipeline") as mock_bp, \
             patch("app.core.rag_pipeline.load_documents", return_value=sample_chunks):
            mock_bp.return_value = mock_chain

            results = await compare_pipeline_variants(
                pdf_path="doc.pdf",
                test_dataset=[
                    {"question": "q1", "ground_truth": "gt1"},
                    {"question": "q2", "ground_truth": "gt2"},
                    {"question": "q3", "ground_truth": "gt3"},
                ],
                eval_fn=mock_eval_fn,
                variants=[{"name": "vector", "retriever_mode": "vector", "chunk_strategy": ChunkStrategy.RECURSIVE}],
            )

        # avg of 100, 200, 300 = 200
        assert results["vector"]["avg_latency_ms"] == 200.0

    @pytest.mark.asyncio
    async def test_eval_fn_called_for_every_question_in_every_variant(self, sample_chunks, mock_chain):
        from app.schemas.eval_schema import RAGASScores

        mock_scores = RAGASScores(
            faithfulness=0.8, answer_relevancy=0.8,
            context_precision=0.8, context_recall=0.8, answer_correctness=0.8,
        )
        call_count = 0

        async def counting_eval_fn(q, a, ctx, gt):
            nonlocal call_count
            call_count += 1
            return mock_scores, 100.0

        test_dataset = [
            {"question": f"q{i}", "ground_truth": f"gt{i}"} for i in range(4)
        ]

        with patch("app.core.rag_pipeline.build_pipeline") as mock_bp, \
             patch("app.core.rag_pipeline.load_documents", return_value=sample_chunks):
            mock_bp.return_value = mock_chain

            await compare_pipeline_variants(
                pdf_path="doc.pdf",
                test_dataset=test_dataset,
                eval_fn=counting_eval_fn,
                # 2 variants × 4 questions = 8 eval calls
                variants=[
                    {"name": "vector", "retriever_mode": "vector", "chunk_strategy": ChunkStrategy.RECURSIVE},
                    {"name": "rerank", "retriever_mode": "rerank", "chunk_strategy": ChunkStrategy.RECURSIVE},
                ],
            )

        assert call_count == 8