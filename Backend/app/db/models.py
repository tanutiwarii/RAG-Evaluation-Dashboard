"""
db/models.py

SQLAlchemy ORM model for storing evaluation run results.
One row per completed batch eval run.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Float, DateTime, JSON


class Base(DeclarativeBase):
    pass


class EvalRun(Base):
    """
    Stores every completed batch evaluation run.
    This is what populates the History view in the React dashboard.
    """
    __tablename__ = "eval_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    pipeline_name: Mapped[str] = mapped_column(String(100), index=True)

    # When the run completed
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Aggregate RAGAS scores (stored as JSON dict)
    aggregate_scores: Mapped[dict] = mapped_column(JSON)

    # Mean of all 5 dimensions — useful for quick sorting/filtering
    overall_score: Mapped[float] = mapped_column(Float)

    # Total time spent (RAG pipeline + RAGAS evaluation) across all questions
    total_latency_ms: Mapped[float] = mapped_column(Float)

    # Full per-question breakdown — stored as JSON list
    # Each item: { question, answer, ground_truth, scores, latency_ms }
    question_results: Mapped[list] = mapped_column(JSON)

    def __repr__(self):
        return (
            f"<EvalRun job_id={self.job_id} pipeline={self.pipeline_name} "
            f"score={self.overall_score:.3f}>"
        )