"""
tests/test_evaluate.py

Unit tests for:
  - RAGASScores model validation and .overall property
  - evaluate_single (mocked — no real LLM calls in tests)
  - POST /api/evaluate endpoint
  - POST /api/evaluate/batch endpoint
  - GET /api/evaluate/stream SSE output

Run with:  pytest backend/tests/ -v
"""

import json
import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.schemas.eval_schema import RAGASScores, SingleEvalRequest


# ── Schema tests ────────────────────────────────────────────────────────────────

class TestRAGASScores:
    def test_overall_is_mean_of_five(self):
        scores = RAGASScores(
            faithfulness=0.8,
            answer_relevancy=0.9,
            context_precision=0.7,
            context_recall=0.6,
            answer_correctness=0.75,
        )
        expected = round((0.8 + 0.9 + 0.7 + 0.6 + 0.75) / 5, 4)
        assert scores.overall == expected

    def test_perfect_scores_give_overall_one(self):
        scores = RAGASScores(
            faithfulness=1.0,
            answer_relevancy=1.0,
            context_precision=1.0,
            context_recall=1.0,
            answer_correctness=1.0,
        )
        assert scores.overall == 1.0

    def test_scores_must_be_between_0_and_1(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            RAGASScores(
                faithfulness=1.5,  # invalid
                answer_relevancy=0.9,
                context_precision=0.7,
                context_recall=0.6,
                answer_correctness=0.75,
            )


# ── ragas_runner unit tests (mocked) ───────────────────────────────────────────

class TestEvaluateSingle:
    @pytest.mark.asyncio
    async def test_evaluate_single_returns_scores_and_latency(self):
        """evaluate_single should return a RAGASScores object and a positive latency."""
        mock_raw = {
            "faithfulness": 0.85,
            "answer_relevancy": 0.90,
            "context_precision": 0.78,
            "context_recall": 0.82,
            "answer_correctness": 0.88,
        }

        with patch("app.core.ragas_runner._run_ragas_sync", return_value=mock_raw):
            from app.core.ragas_runner import evaluate_single
            scores, latency = await evaluate_single(
                question="What is RAG?",
                answer="RAG stands for Retrieval-Augmented Generation.",
                contexts=["RAG combines retrieval with LLM generation."],
                ground_truth="RAG stands for Retrieval-Augmented Generation.",
            )

        assert isinstance(scores, RAGASScores)
        assert scores.faithfulness == 0.85
        assert scores.answer_relevancy == 0.90
        assert latency > 0

    @pytest.mark.asyncio
    async def test_evaluate_single_raises_on_ragas_failure(self):
        """Should propagate exceptions from the RAGAS runner."""
        with patch("app.core.ragas_runner._run_ragas_sync", side_effect=RuntimeError("RAGAS failed")):
            from app.core.ragas_runner import evaluate_single
            with pytest.raises(RuntimeError, match="RAGAS failed"):
                await evaluate_single("q", "a", ["ctx"], "gt")


# ── API endpoint tests ──────────────────────────────────────────────────────────

@pytest.fixture
def mock_scores():
    return RAGASScores(
        faithfulness=0.85,
        answer_relevancy=0.90,
        context_precision=0.78,
        context_recall=0.82,
        answer_correctness=0.88,
    )


@pytest.mark.asyncio
class TestEvaluateEndpoint:
    async def test_single_eval_returns_200_with_scores(self, mock_scores):
        with patch("app.api.evaluate.evaluate_single", new_callable=AsyncMock) as mock_eval:
            mock_eval.return_value = (mock_scores, 142.5)

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/evaluate", json={
                    "question": "What is RAG?",
                    "answer": "RAG is Retrieval-Augmented Generation.",
                    "contexts": ["RAG combines retrieval with generation."],
                    "ground_truth": "RAG stands for Retrieval-Augmented Generation.",
                    "pipeline_name": "test-pipeline",
                })

        assert response.status_code == 200
        data = response.json()
        assert data["pipeline_name"] == "test-pipeline"
        assert data["scores"]["faithfulness"] == 0.85
        assert data["latency_ms"] == 142.5
        assert "overall_score" in data

    async def test_single_eval_validates_empty_question(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/evaluate", json={
                "question": "",          # invalid — min_length=1
                "answer": "some answer",
                "contexts": ["ctx"],
                "ground_truth": "gt",
            })
        assert response.status_code == 422

    async def test_single_eval_validates_empty_contexts(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/evaluate", json={
                "question": "What is RAG?",
                "answer": "some answer",
                "contexts": [],          # invalid — min_items=1
                "ground_truth": "gt",
            })
        assert response.status_code == 422


@pytest.mark.asyncio
class TestBatchEndpoint:
    async def test_batch_returns_job_id_immediately(self, tmp_path):
        dataset_file = tmp_path / "test_dataset.json"
        dataset_file.write_text(json.dumps([
            {"question": "What is RAG?", "ground_truth": "RAG is retrieval-augmented generation."}
        ]))

        with patch("app.api.evaluate._batch_eval_task", new_callable=AsyncMock):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/evaluate/batch", json={
                    "pipeline_name": "test-pipeline",
                    "test_dataset_path": str(dataset_file),
                })

        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"

    async def test_batch_returns_404_for_missing_dataset(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/evaluate/batch", json={
                "pipeline_name": "test",
                "test_dataset_path": "/nonexistent/path.json",
            })
        assert response.status_code == 404


@pytest.mark.asyncio
class TestSSEStream:
    async def test_stream_returns_404_for_unknown_job(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/evaluate/stream/nonexistent-job-id")
        assert response.status_code == 404

    async def test_stream_yields_progress_and_complete_events(self, mock_scores):
        """Push fake events into job_store and verify SSE output format."""
        from app.core.job_store import job_store

        job_id = job_store.create_job()

        # Pre-fill the queue with one progress + one complete event
        await job_store.push_event(job_id, {
            "event": "progress",
            "job_id": job_id,
            "completed": 1,
            "total": 1,
            "current_question": "What is RAG?",
            "current_scores": mock_scores.model_dump(),
        })
        await job_store.push_event(job_id, {
            "event": "complete",
            "job_id": job_id,
            "completed": 1,
            "total": 1,
            "result": {},
        })

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/evaluate/stream/{job_id}")

        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        text = response.text
        assert "event: progress" in text
        assert "event: complete" in text
        assert job_id in text