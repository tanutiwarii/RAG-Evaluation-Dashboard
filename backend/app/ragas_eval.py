from __future__ import annotations

import math
import statistics
from typing import Any

import numpy as np

from app.config import Settings
from app.model_stack import build_chat_llm, build_embeddings
from app.schemas import MetricAggregate, RagEvalSample, RowScores


def _nanmean(values: list[float | None]) -> float | None:
    nums = [v for v in values if v is not None and not (isinstance(v, float) and math.isnan(v))]
    if not nums:
        return None
    return float(np.nanmean(np.array(nums, dtype=float)))


def _p50(values: list[float | None]) -> float | None:
    nums = sorted(v for v in values if v is not None)
    if not nums:
        return None
    return float(statistics.median(nums))


def samples_to_ragas_rows(samples: list[RagEvalSample]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for s in samples:
        row: dict[str, Any] = {
            "user_input": s.question,
            "response": s.answer,
            "retrieved_contexts": list(s.contexts) if s.contexts else [],
        }
        if s.ground_truth_answer:
            row["reference"] = s.ground_truth_answer
        else:
            row["reference"] = s.answer
        if s.reference_contexts:
            row["reference_contexts"] = list(s.reference_contexts)
        rows.append(row)
    return rows


def run_ragas_evaluation(
    samples: list[RagEvalSample],
    *,
    settings: Settings,
) -> tuple[dict[str, float], list[dict[str, float | None]], list[str]]:
    """Returns (aggregate_means_raw, per_row_scores, warnings)."""
    try:
        from ragas import EvaluationDataset, evaluate
        from ragas.metrics.collections import (
            answer_relevancy,
            context_precision,
            context_recall,
            faithfulness,
        )
    except ModuleNotFoundError as e:
        raise RuntimeError(
            "The 'ragas' package is missing in the Python environment that is running Uvicorn. "
            "From the backend folder: python3 -m venv .venv && source .venv/bin/activate && "
            "pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000. "
            "Or run: bash run_dev.sh"
        ) from e

    rows = samples_to_ragas_rows(samples)
    include_recall = all(bool(s.ground_truth_answer) for s in samples)
    warnings: list[str] = []
    if not include_recall:
        warnings.append(
            "context_recall was skipped because ground_truth_answer was missing on at least one sample."
        )

    dataset = EvaluationDataset.from_list(rows)

    llm = build_chat_llm(settings)
    embeddings = build_embeddings(settings)

    metrics: list[Any] = [faithfulness, answer_relevancy, context_precision]
    if include_recall:
        metrics.append(context_recall)

    result = evaluate(
        dataset,
        metrics=metrics,
        llm=llm,
        embeddings=embeddings,
        show_progress=False,
        raise_exceptions=False,
    )

    score_rows: list[dict[str, Any]] = list(result.scores)
    metric_keys = list(score_rows[0].keys()) if score_rows else []

    aggregates: dict[str, float] = {}
    for k in metric_keys:
        col = [row.get(k) for row in score_rows]
        vals: list[float] = []
        for v in col:
            if v is None:
                continue
            if isinstance(v, float) and math.isnan(v):
                continue
            try:
                vals.append(float(v))
            except (TypeError, ValueError):
                continue
        aggregates[k] = float(np.nanmean(np.array(vals, dtype=float))) if vals else float("nan")

    per_row: list[dict[str, float | None]] = []
    for i, row in enumerate(score_rows):
        def pick(name: str) -> float | None:
            v = row.get(name)
            if v is None or (isinstance(v, float) and math.isnan(v)):
                return None
            try:
                return float(v)
            except (TypeError, ValueError):
                return None

        per_row.append(
            {
                "faithfulness": pick("faithfulness"),
                "answer_relevance": pick("answer_relevancy"),
                "context_precision": pick("context_precision"),
                "context_recall": pick("context_recall") if include_recall else None,
            }
        )

    return aggregates, per_row, warnings


def build_response_models(
    aggregates_raw: dict[str, float],
    per_row: list[dict[str, float | None]],
    samples: list[RagEvalSample],
) -> tuple[MetricAggregate, list[RowScores]]:
    latencies = [s.latency_ms for s in samples]
    rows_out: list[RowScores] = []
    for i, pr in enumerate(per_row):
        rows_out.append(
            RowScores(
                index=i,
                faithfulness=pr.get("faithfulness"),
                answer_relevance=pr.get("answer_relevance"),
                context_precision=pr.get("context_precision"),
                context_recall=pr.get("context_recall"),
                latency_ms=samples[i].latency_ms if i < len(samples) else None,
            )
        )

    def agg(name_ragas: str) -> float | None:
        v = aggregates_raw.get(name_ragas)
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return None
        return float(v)

    metric_agg = MetricAggregate(
        faithfulness=agg("faithfulness"),
        answer_relevance=agg("answer_relevancy"),
        context_precision=agg("context_precision"),
        context_recall=agg("context_recall"),
        latency_ms_mean=_nanmean(latencies),
        latency_ms_p50=_p50(latencies),
    )
    return metric_agg, rows_out
