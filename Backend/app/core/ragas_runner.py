"""
core/ragas_runner.py

Wraps the RAGAS evaluation library in an async-friendly interface.
RAGAS itself is synchronous, so we run it in a thread pool executor
to avoid blocking the FastAPI event loop.
"""

import asyncio
import time
import logging
from functools import partial
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    answer_correctness,
)

from app.schemas.eval_schema import RAGASScores, QuestionResult

logger = logging.getLogger(__name__)

# The 5 metrics we evaluate on — order matters for logging
METRICS = [
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    answer_correctness,
]


def _run_ragas_sync(
    question: str,
    answer: str,
    contexts: list[str],
    ground_truth: str,
) -> dict:
    """
    Synchronous RAGAS call. Runs in a thread pool via run_in_executor.
    Returns a flat dict of metric name -> score.
    """
    dataset = Dataset.from_dict({
        "question":    [question],
        "answer":      [answer],
        "contexts":    [contexts],
        "ground_truth":[ground_truth],
    })

    result = evaluate(dataset=dataset, metrics=METRICS)
    # result.to_pandas() gives a single-row DataFrame
    row = result.to_pandas().iloc[0].to_dict()
    return row


async def evaluate_single(
    question: str,
    answer: str,
    contexts: list[str],
    ground_truth: str,
) -> tuple[RAGASScores, float]:
    """
    Async wrapper around RAGAS. Returns (RAGASScores, latency_ms).

    Usage:
        scores, latency = await evaluate_single(q, a, ctx, gt)
    """
    loop = asyncio.get_event_loop()
    start = time.perf_counter()

    try:
        # Run blocking RAGAS in a separate thread — keeps FastAPI responsive
        raw = await loop.run_in_executor(
            None,
            partial(_run_ragas_sync, question, answer, contexts, ground_truth),
        )
    except Exception as e:
        logger.error(f"RAGAS evaluation failed: {e}")
        raise

    latency_ms = round((time.perf_counter() - start) * 1000, 2)

    scores = RAGASScores(
        faithfulness=round(float(raw.get("faithfulness", 0.0)), 4),
        answer_relevancy=round(float(raw.get("answer_relevancy", 0.0)), 4),
        context_precision=round(float(raw.get("context_precision", 0.0)), 4),
        context_recall=round(float(raw.get("context_recall", 0.0)), 4),
        answer_correctness=round(float(raw.get("answer_correctness", 0.0)), 4),
    )

    logger.info(
        f"Evaluated | faithfulness={scores.faithfulness} "
        f"relevancy={scores.answer_relevancy} latency={latency_ms}ms"
    )

    return scores, latency_ms


async def evaluate_batch(
    pipeline,          # the RAG pipeline (LangChain RetrievalQA instance)
    test_dataset: list[dict],
    progress_callback=None,  # async callable(completed, total, question, scores)
) -> list[QuestionResult]:
    """
    Runs every question in test_dataset through the pipeline, then evaluates.
    Calls progress_callback after each question so SSE can stream updates.

    Each item in test_dataset must have:
        { "question": str, "ground_truth": str }
    """
    results = []
    total = len(test_dataset)

    for idx, item in enumerate(test_dataset):
        question = item["question"]
        ground_truth = item["ground_truth"]

        # 1. Get answer + retrieved context from the RAG pipeline
        rag_start = time.perf_counter()
        rag_output = await asyncio.get_event_loop().run_in_executor(
            None, partial(pipeline, {"query": question})
        )
        rag_latency = (time.perf_counter() - rag_start) * 1000

        answer = rag_output["result"]
        contexts = [doc.page_content for doc in rag_output["source_documents"]]

        # 2. Evaluate with RAGAS
        scores, eval_latency = await evaluate_single(question, answer, contexts, ground_truth)

        result = QuestionResult(
            question=question,
            answer=answer,
            ground_truth=ground_truth,
            scores=scores,
            latency_ms=round(rag_latency + eval_latency, 2),
        )
        results.append(result)

        # 3. Fire progress callback so SSE can push an update
        if progress_callback:
            await progress_callback(
                completed=idx + 1,
                total=total,
                question=question,
                scores=scores,
            )

    return results


def aggregate_scores(results: list[QuestionResult]) -> RAGASScores:
    """
    Averages RAGAS scores across all questions in a batch run.
    """
    n = len(results)
    if n == 0:
        return RAGASScores(
            faithfulness=0, answer_relevancy=0,
            context_precision=0, context_recall=0, answer_correctness=0
        )

    return RAGASScores(
        faithfulness=round(sum(r.scores.faithfulness for r in results) / n, 4),
        answer_relevancy=round(sum(r.scores.answer_relevancy for r in results) / n, 4),
        context_precision=round(sum(r.scores.context_precision for r in results) / n, 4),
        context_recall=round(sum(r.scores.context_recall for r in results) / n, 4),
        answer_correctness=round(sum(r.scores.answer_correctness for r in results) / n, 4),
    )