from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Request bodies ─────────────────────────────────────────────────────────────

class SingleEvalRequest(BaseModel):
    """One question evaluated against a RAG pipeline response."""
    question: str = Field(..., min_length=1, description="The question asked")
    answer: str = Field(..., min_length=1, description="The LLM-generated answer")
    contexts: list[str] = Field(..., min_items=1, description="Retrieved context chunks")
    ground_truth: str = Field(..., min_length=1, description="Expected correct answer")
    pipeline_name: str = Field(default="default", description="Label for this pipeline variant")


class BatchEvalRequest(BaseModel):
    """Run a full test dataset through the pipeline for evaluation."""
    pipeline_name: str = Field(..., description="Name/label for this run (e.g. 'recursive-512')")
    test_dataset_path: Optional[str] = Field(
        default="eval/test_dataset.json",
        description="Path to the JSON test dataset file"
    )


# ── Score shapes ───────────────────────────────────────────────────────────────

class RAGASScores(BaseModel):
    """The 5 RAGAS quality dimensions — all values between 0 and 1."""
    faithfulness: float = Field(..., ge=0.0, le=1.0, description="Is the answer grounded in the context?")
    answer_relevancy: float = Field(..., ge=0.0, le=1.0, description="Does the answer address the question?")
    context_precision: float = Field(..., ge=0.0, le=1.0, description="Is the retrieved context relevant?")
    context_recall: float = Field(..., ge=0.0, le=1.0, description="Does context cover the ground truth?")
    answer_correctness: float = Field(..., ge=0.0, le=1.0, description="Is the answer factually correct?")

    @property
    def overall(self) -> float:
        """Simple mean across all 5 dimensions."""
        return round(
            (self.faithfulness + self.answer_relevancy +
             self.context_precision + self.context_recall +
             self.answer_correctness) / 5, 4
        )


class QuestionResult(BaseModel):
    """Result for a single question in a batch run."""
    question: str
    answer: str
    ground_truth: str
    scores: RAGASScores
    latency_ms: float


# ── Response bodies ────────────────────────────────────────────────────────────

class SingleEvalResponse(BaseModel):
    """Response for /api/evaluate (single question)."""
    pipeline_name: str
    question: str
    scores: RAGASScores
    overall_score: float
    latency_ms: float


class BatchJobResponse(BaseModel):
    """Immediately returned when a batch job is started."""
    job_id: str
    status: str = "queued"
    message: str


class BatchEvalResult(BaseModel):
    """Final result stored in DB after a batch run completes."""
    job_id: str
    pipeline_name: str
    completed_at: datetime
    question_results: list[QuestionResult]
    aggregate_scores: RAGASScores
    overall_score: float
    total_latency_ms: float


# ── SSE event shapes ───────────────────────────────────────────────────────────

class SSEProgressEvent(BaseModel):
    """Streamed during batch eval — one event per completed question."""
    event: str                    # "progress" | "complete" | "error"
    job_id: str
    completed: int                # how many questions done so far
    total: int
    current_question: Optional[str] = None
    current_scores: Optional[RAGASScores] = None
    result: Optional[BatchEvalResult] = None  # only on event="complete"
    error: Optional[str] = None               # only on event="error"