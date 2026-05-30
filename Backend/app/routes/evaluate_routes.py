from fastapi import APIRouter, BackgroundTasks

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


router = APIRouter()


@router.post("/evaluate/single")
async def evaluate_single(request: dict):

    result = await run_single_evaluation(request)

    return result


async def run_batch_job(job_id: str, items: list):

    update_job(
        job_id,
        status="running",
        total=len(items),
        progress=0
    )

    result = await run_batch_evaluation(
        items,
        job_id=job_id
    )

    finish_job(
        job_id,
        result
    )


@router.post("/evaluate/batch")
async def evaluate_batch(
    request: dict,
    background_tasks: BackgroundTasks
):

    items = request.get("items", [])

    job_id = create_job()

    update_job(
        job_id,
        total=len(items)
    )

    background_tasks.add_task(
        run_batch_job,
        job_id,
        items
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