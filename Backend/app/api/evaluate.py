"""
api/evaluate.py

Three core endpoints:

  POST /api/evaluate              — evaluate a single Q/A pair, returns scores immediately
  POST /api/evaluate/batch        — start a background batch eval job, returns job_id
  GET  /api/evaluate/stream/{id}  — SSE stream: pushes live progress for a batch job
  GET  /api/evaluate/history      — returns all past completed runs from the database

Pattern:
  1. POST /batch    → creates job, fires BackgroundTask, returns job_id instantly
  2. Client opens   GET /stream/{job_id} using EventSource
  3. Background task evaluates each question, pushes progress events to job_store queue
  4. SSE generator reads from queue and yields events to the client
  5. On completion, final event type="complete" carries the full BatchEvalResult
"""

import json
import time
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.schemas.eval_schema import (
    SingleEvalRequest, SingleEvalResponse,
    BatchEvalRequest, BatchJobResponse,
    BatchEvalResult, RAGASScores,
)
from app.core.ragas_runner import evaluate_single, evaluate_batch, aggregate_scores
from app.core.job_store import job_store
from app.core.rag_pipeline import build_pipeline
from app.db.database import get_db
from app.db.models import EvalRun
import sqlalchemy as sa

logger = logging.getLogger(__name__)
router = APIRouter(tags=["evaluate"])
limiter = Limiter(key_func=get_remote_address)


# ── Helpers ─────────────────────────────────────────────────────────────────────

def _sse_format(event_type: str, data: dict) -> str:
    """
    Formats a dict as a valid SSE message string.
    The browser's EventSource API reads this format natively.

    Output looks like:
        event: progress
        data: {"job_id": "...", "completed": 3, "total": 10, ...}

        (blank line terminates the event)
    """
    payload = json.dumps(data)
    return f"event: {event_type}\ndata: {payload}\n\n"


async def _batch_eval_task(job_id: str, pipeline_name: str, test_dataset: list[dict]):
    """
    Background task that runs the full evaluation loop.
    Pushes SSE-ready events into job_store as each question completes.
    """
    job_store.set_status(job_id, "running")
    total = len(test_dataset)

    # Load the RAG pipeline once for the whole batch
    pipeline = build_pipeline(pipeline_name=pipeline_name)

    # Progress callback — called after each question evaluates
    async def on_progress(completed: int, total: int, question: str, scores: RAGASScores):
        await job_store.push_event(job_id, {
            "event": "progress",
            "job_id": job_id,
            "completed": completed,
            "total": total,
            "current_question": question,
            "current_scores": scores.model_dump(),
        })

    try:
        question_results = await evaluate_batch(
            pipeline=pipeline,
            test_dataset=test_dataset,
            progress_callback=on_progress,
        )

        agg_scores = aggregate_scores(question_results)
        total_latency = sum(r.latency_ms for r in question_results)

        result = BatchEvalResult(
            job_id=job_id,
            pipeline_name=pipeline_name,
            completed_at=datetime.now(timezone.utc),
            question_results=question_results,
            aggregate_scores=agg_scores,
            overall_score=agg_scores.overall,
            total_latency_ms=round(total_latency, 2),
        )

        # Persist to database
        async with get_db() as db:
            db.add(EvalRun(
                job_id=job_id,
                pipeline_name=pipeline_name,
                completed_at=result.completed_at,
                aggregate_scores=agg_scores.model_dump(),
                overall_score=result.overall_score,
                total_latency_ms=result.total_latency_ms,
                question_results=[qr.model_dump() for qr in question_results],
            ))
            await db.commit()

        job_store.set_result(job_id, result.model_dump())

        # Final SSE event — client stops EventSource on receiving this
        await job_store.push_event(job_id, {
            "event": "complete",
            "job_id": job_id,
            "completed": total,
            "total": total,
            "result": result.model_dump(mode="json"),
        })

    except Exception as e:
        logger.exception(f"Batch eval job {job_id} failed: {e}")
        job_store.set_error(job_id, str(e))
        await job_store.push_event(job_id, {
            "event": "error",
            "job_id": job_id,
            "error": str(e),
        })


# ── POST /api/evaluate ──────────────────────────────────────────────────────────

@router.post("/evaluate", response_model=SingleEvalResponse)
@limiter.limit("30/minute")
async def evaluate_single_endpoint(request: Request, body: SingleEvalRequest):
    """
    Evaluates a single question/answer pair using RAGAS.
    Returns all 5 metric scores plus total latency.

    Use this to:
    - Test a specific question interactively
    - Debug why a particular answer scored poorly
    - Compare two answers for the same question

    Example request body:
    {
        "question": "What is RAG?",
        "answer": "RAG stands for Retrieval-Augmented Generation...",
        "contexts": ["...chunk 1...", "...chunk 2..."],
        "ground_truth": "RAG combines retrieval with LLM generation...",
        "pipeline_name": "recursive-512"
    }
    """
    start = time.perf_counter()

    try:
        scores, latency_ms = await evaluate_single(
            question=body.question,
            answer=body.answer,
            contexts=body.contexts,
            ground_truth=body.ground_truth,
        )
    except Exception as e:
        logger.error(f"Single eval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

    return SingleEvalResponse(
        pipeline_name=body.pipeline_name,
        question=body.question,
        scores=scores,
        overall_score=scores.overall,
        latency_ms=latency_ms,
    )


# ── POST /api/evaluate/batch ────────────────────────────────────────────────────

@router.post("/evaluate/batch", response_model=BatchJobResponse)
@limiter.limit("10/minute")
async def evaluate_batch_endpoint(
    request: Request,
    body: BatchEvalRequest,
    background_tasks: BackgroundTasks,
):
    """
    Starts a background batch evaluation job.
    Returns a job_id immediately — don't wait for evaluation to finish.

    The client should then open:
        GET /api/evaluate/stream/{job_id}
    to receive live progress via Server-Sent Events.
    """
    # Load test dataset from disk
    import aiofiles
    try:
        async with aiofiles.open(body.test_dataset_path, "r") as f:
            raw = await f.read()
        test_dataset = json.loads(raw)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Test dataset not found: {body.test_dataset_path}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Test dataset is not valid JSON")

    if not test_dataset:
        raise HTTPException(status_code=422, detail="Test dataset is empty")

    job_id = job_store.create_job()
    logger.info(f"Batch eval job {job_id} created for pipeline '{body.pipeline_name}'")

    # Fire the background task — returns immediately
    background_tasks.add_task(
        _batch_eval_task,
        job_id=job_id,
        pipeline_name=body.pipeline_name,
        test_dataset=test_dataset,
    )

    return BatchJobResponse(
        job_id=job_id,
        status="queued",
        message=f"Batch evaluation started. Connect to /api/evaluate/stream/{job_id} for live updates.",
    )


# ── GET /api/evaluate/stream/{job_id} ──────────────────────────────────────────

@router.get("/evaluate/stream/{job_id}")
async def stream_eval_progress(job_id: str):
    """
    Server-Sent Events stream for a batch evaluation job.

    Connect with the browser's EventSource API:

        const es = new EventSource(`/api/evaluate/stream/${jobId}`);

        es.addEventListener("progress", (e) => {
            const data = JSON.parse(e.data);
            console.log(`${data.completed}/${data.total} done`);
            console.log("Latest scores:", data.current_scores);
        });

        es.addEventListener("complete", (e) => {
            const data = JSON.parse(e.data);
            console.log("Final result:", data.result);
            es.close(); // Always close when done
        });

        es.addEventListener("error", (e) => {
            console.error("Eval failed:", JSON.parse(e.data).error);
            es.close();
        });

    Events emitted:
        progress — one event per evaluated question
        complete  — final event with full BatchEvalResult
        error     — if the background task crashes
    """
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    async def event_generator():
        """
        Reads events from the job's async queue and yields SSE-formatted strings.
        Exits when it sees an event of type "complete" or "error".
        """
        while True:
            # Blocks here until the background task pushes a new event
            event = await job_store.pop_event(job_id)
            if event is None:
                break

            event_type = event.get("event", "progress")

            # Yield the formatted SSE message
            yield _sse_format(event_type, event)

            # Stop streaming after terminal events
            if event_type in ("complete", "error"):
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",       # Disable Nginx buffering
            "Connection": "keep-alive",
        },
    )


# ── GET /api/evaluate/history ───────────────────────────────────────────────────

@router.get("/evaluate/history")
async def get_eval_history(limit: int = 20, pipeline_name: str = None):
    """
    Returns past completed evaluation runs from the database.
    Optional filter by pipeline_name.

    Query params:
        limit          — max number of runs to return (default 20)
        pipeline_name  — filter to a specific pipeline variant
    """
    async with get_db() as db:
        query = sa.select(EvalRun).order_by(EvalRun.completed_at.desc()).limit(limit)
        if pipeline_name:
            query = query.where(EvalRun.pipeline_name == pipeline_name)
        result = await db.execute(query)
        runs = result.scalars().all()

    return [
        {
            "job_id": run.job_id,
            "pipeline_name": run.pipeline_name,
            "completed_at": run.completed_at.isoformat(),
            "overall_score": run.overall_score,
            "aggregate_scores": run.aggregate_scores,
            "total_latency_ms": run.total_latency_ms,
        }
        for run in runs
    ]