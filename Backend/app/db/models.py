from sqlalchemy import Column, String, Float, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()


class EvalRun(Base):
    """Stores every evaluation run result in PostgreSQL."""
    __tablename__ = "eval_runs"

    run_id = Column(String, primary_key=True, index=True)
    pipeline_name = Column(String, index=True, nullable=False)
    question = Column(String, nullable=False)

    # RAGAS scores stored individually for easy querying and charting
    faithfulness = Column(Float, nullable=False)
    answer_relevancy = Column(Float, nullable=False)
    context_precision = Column(Float, nullable=False)
    context_recall = Column(Float, nullable=False)
    answer_correctness = Column(Float, nullable=False)

    latency_ms = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Store full request payload for replay / debugging
    raw_payload = Column(JSON, nullable=True)