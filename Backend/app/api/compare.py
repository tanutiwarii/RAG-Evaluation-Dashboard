"""
api/compare.py

Two endpoints that power the "Chunking Lab" and "Pipeline Comparison" views:

  POST /api/compare/chunking   — runs all 3 chunk strategies, returns scores per strategy
  POST /api/compare/pipelines  — runs vector vs rerank vs hybrid, returns side-by-side scores

Both run as background jobs with SSE streaming — same pattern as /api/evaluate/batch.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.core.chunking import compare_chunking_strategies, ChunkStrategy
from app.core.rag_pipeline import build_pipeline, compare_pipeline_variants, load_documents
from app.core.ragas_runner import evaluate_single
from app.core.job_store import job_store

logger = logging.getLogger(__name__)
router = APIRouter(tags=["compare"])


# ── Request schemas ─────────────────────────────────────────────────────────────

class ChunkingCompareRequest(BaseModel):
    pdf_path: str
    test_dataset_path: str = "eval/test_dataset.json"
    chunk_size: int = 512
    strategies: Optional[list[str]] = None   # None = run all 3


class PipelineCompareRequest(BaseModel):
    pdf_path: str
    test_dataset_path: str = "eval/test_dataset.json"


# ── SSE helper ──────────────────────────────────────────────────────────────────

def _sse(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


# ── Background tasks ─────────────────────────────────────────────────────────────

async def _run_chunking_compare(job_id: str, pdf_path: str, test_dataset: list[dict], chunk_size: int, strategies: list):
    job_store.set_status(job_id, "running")
    try:
        docs = load_documents(pdf_path)

        # Notify frontend that docs are loaded
        await job_store.push_event(job_id, {
            "event": "progress",
            "job_id": job_id,
            "message": f"Loaded {len(docs)} pages. Running {len(strategies)} strategies...",
            "stage": "loaded",
        })

        def build_pipeline_fn(chunks):
            return build_pipeline(chunks=chunks, retriever_mode="rerank")

        results = await compare_chunking_strategies(
            docs=docs,
            build_pipeline_fn=build_pipeline_fn,
            test_dataset=test_dataset,
            eval_fn=evaluate_single,
            strategies=[ChunkStrategy(s) for s in strategies],
            chunk_size=chunk_size,
        )

        await job_store.push_event(job_id, {
            "event": "complete",
            "job_id": job_id,
            "results": results,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        job_store.set_result(job_id, results)

    except Exception as e:
        logger.exception(f"Chunking compare job {job_id} failed: {e}")
        job_store.set_error(job_id, str(e))
        await job_store.push_event(job_id, {"event": "error", "job_id": job_id, "error": str(e)})


async def _run_pipeline_compare(job_id: str, pdf_path: str, test_dataset: list[dict]):
    job_store.set_status(job_id, "running")
    try:
        await job_store.push_event(job_id, {
            "event": "progress",
            "job_id": job_id,
            "message": "Running vector, rerank, and hybrid pipeline variants...",
        })

        results = await compare_pipeline_variants(
            pdf_path=pdf_path,
            test_dataset=test_dataset,
            eval_fn=evaluate_single,
        )

        await job_store.push_event(job_id, {
            "event": "complete",
            "job_id": job_id,
            "results": results,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        job_store.set_result(job_id, results)

    except Exception as e:
        logger.exception(f"Pipeline compare job {job_id} failed: {e}")
        job_store.set_error(job_id, str(e))
        await job_store.push_event(job_id, {"event": "error", "job_id": job_id, "error": str(e)})


# ── POST /api/compare/chunking ──────────────────────────────────────────────────

@router.post("/compare/chunking")
async def compare_chunking(body: ChunkingCompareRequest, background_tasks: BackgroundTasks):
    """
    Runs all 3 chunking strategies (or a subset) against the same test dataset.
    Returns a job_id immediately. Stream progress via /api/evaluate/stream/{job_id}.

    Response example:
    {
      "fixed":     { "scores": {...}, "overall": 0.71, "chunk_count": 142 },
      "recursive": { "scores": {...}, "overall": 0.83, "chunk_count": 118 },
      "semantic":  { "scores": {...}, "overall": 0.89, "chunk_count": 89  },
    }
    """
    import aiofiles

    try:
        async with aiofiles.open(body.test_dataset_path) as f:
            test_dataset = json.loads(await f.read())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Test dataset not found")

    strategies = body.strategies or [s.value for s in ChunkStrategy]
    job_id = job_store.create_job()

    background_tasks.add_task(
        _run_chunking_compare,
        job_id=job_id,
        pdf_path=body.pdf_path,
        test_dataset=test_dataset,
        chunk_size=body.chunk_size,
        strategies=strategies,
    )

    return {
        "job_id": job_id,
        "status": "queued",
        "strategies": strategies,
        "message": f"Chunking comparison started. Stream at /api/evaluate/stream/{job_id}",
    }


# ── POST /api/compare/pipelines ─────────────────────────────────────────────────

@router.post("/compare/pipelines")
async def compare_pipelines(body: PipelineCompareRequest, background_tasks: BackgroundTasks):
    """
    Runs vector, rerank, and hybrid retriever variants side by side.
    Returns a job_id immediately. Stream progress via /api/evaluate/stream/{job_id}.

    This is the key experiment that shows the interviewer you understand
    the tradeoff between retrieval speed and accuracy.
    """
    import aiofiles

    try:
        async with aiofiles.open(body.test_dataset_path) as f:
            test_dataset = json.loads(await f.read())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Test dataset not found")

    job_id = job_store.create_job()

    background_tasks.add_task(
        _run_pipeline_compare,
        job_id=job_id,
        pdf_path=body.pdf_path,
        test_dataset=test_dataset,
    )

    return {
        "job_id": job_id,
        "status": "queued",
        "message": f"Pipeline comparison started. Stream at /api/evaluate/stream/{job_id}",
    }