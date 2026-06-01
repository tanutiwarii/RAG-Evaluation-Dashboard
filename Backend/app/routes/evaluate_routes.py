import asyncio
import json
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, BackgroundTasks
from app.utils.history_store import save_run
from datetime import datetime

from app.services.batch_eval_service import (
    run_single_evaluation,
    run_batch_evaluation
)

from app.services.job_manager import (
    create_job,
    update_job,
    finish_job,
    get_job
)
from app.schemas.evaluation_schema import (
    SingleEvaluationRequest,
    BatchEvaluationRequest
)
from app.core.rag_instance import get_rag_pipeline

router = APIRouter()


@router.post("/evaluate/single")
async def evaluate_single(request: SingleEvaluationRequest):

    result = await run_single_evaluation(
        request.model_dump()
    )

    history_entry = {
        "run_id": f"single_{datetime.now().timestamp()}",
        "timestamp": datetime.now().isoformat(),
        "question": result["question"],
        "ground_truth": result["ground_truth"],
        "chunk_size": None,
        "chunk_overlap": None,
        "winner": "Single Evaluation",
        "strategies": {
            "single": result
        }
    }

    save_run(history_entry)

    return result

async def run_batch_job(job_id: str, items: list, mode: str):

    update_job(
        job_id,
        status="running",
        total=len(items),
        progress=0
    )

    result = await run_batch_evaluation(
        items,
        job_id=job_id,
        mode=mode
    )

    history_entry = {
        "run_id": job_id,
        "timestamp": datetime.now().isoformat(),
        "question": f"Batch Evaluation - {len(items)} items",
        "ground_truth": "Batch evaluation dataset",
        "chunk_size": None,
        "chunk_overlap": None,
        "winner": "Batch Evaluation",
        "strategies": {
            "batch": result
        }
    }

    save_run(history_entry)

    finish_job(
        job_id,
        result
    )


@router.post("/evaluate/batch")
async def evaluate_batch(
    request: BatchEvaluationRequest,
    background_tasks: BackgroundTasks
):

    items = request.items
    mode = request.mode

    if mode == "pipeline":
        rag_pipeline = get_rag_pipeline()

        if rag_pipeline is None:
            return {
                "error": "Pipeline mode is disabled in free deployment. Use manual evaluation mode."
            }

    job_id = create_job()

    update_job(
        job_id,
        total=len(items)
    )

    background_tasks.add_task(
        run_batch_job,
        job_id,
        items, mode
    )

    return {
        "job_id": job_id,
        "status": "started",
        "total": len(items)
    }


@router.get("/evaluate/batch/{job_id}/result")
async def get_batch_result(job_id: str):

    job = get_job(job_id)

    if not job:
        return {
            "error": "Job not found"
        }

    return job

@router.get("/evaluate/batch/{job_id}/stream")
async def stream_batch_progress(job_id: str):

    async def event_generator():

        while True:

            job = get_job(job_id)

            if not job:
                yield (
                    "event: error\n"
                    "data: {\"message\": \"Job not found\"}\n\n"
                )
                break

            yield (
                "event: progress\n"
                f"data: {json.dumps(job)}\n\n"
            )

            if job["status"] == "completed":
                break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
