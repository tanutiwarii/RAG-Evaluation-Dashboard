from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RagEvalSample(BaseModel):
    """One RAG turn: plug in outputs from any pipeline (LangChain, LlamaIndex, custom)."""

    question: str = Field(..., description="User query")
    answer: str = Field(..., description="Generated answer")
    contexts: list[str] = Field(default_factory=list, description="Retrieved chunks / passages")
    ground_truth_answer: str | None = Field(
        default=None,
        description="Reference answer for context_recall (and stronger retrieval eval)",
    )
    reference_contexts: list[str] | None = Field(
        default=None,
        description="Optional gold supporting passages (RAGAS reference_contexts)",
    )
    latency_ms: float | None = Field(
        default=None,
        description="End-to-end pipeline latency for this sample (measured externally)",
    )


class EvaluateRequest(BaseModel):
    samples: list[RagEvalSample] = Field(..., min_length=1, max_length=200)
    run_label: str | None = None


class MetricAggregate(BaseModel):
    faithfulness: float | None
    answer_relevance: float | None
    context_precision: float | None
    context_recall: float | None
    latency_ms_mean: float | None
    latency_ms_p50: float | None


class RowScores(BaseModel):
    index: int
    faithfulness: float | None = None
    answer_relevance: float | None = None
    context_precision: float | None = None
    context_recall: float | None = None
    latency_ms: float | None = None


class EvaluateResponse(BaseModel):
    run_id: str
    created_at: datetime
    aggregates: MetricAggregate
    rows: list[RowScores]
    warnings: list[str] = Field(default_factory=list)
    raw_ragas_columns: dict[str, float | None] | None = Field(
        default=None,
        description="Raw mean keys as returned by RAGAS metric names",
    )


class RunSummary(BaseModel):
    run_id: str
    created_at: datetime
    label: str | None
    aggregates: MetricAggregate


class DemoRunResponse(EvaluateResponse):
    demo_queries: list[str] = Field(default_factory=list)
