from datetime import datetime

jobs = {}


def create_job():

    job_id = (
        f"job_{datetime.now().timestamp()}"
    )

    jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "total": 0,
        "current_question": "",
        "result": None
    }

    return job_id


def get_job(job_id):

    return jobs.get(job_id)


def update_job(
    job_id,
    **kwargs
):

    if job_id in jobs:

        jobs[job_id].update(kwargs)


def finish_job(
    job_id,
    result
):

    if job_id in jobs:

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = result
        jobs[job_id]["progress"] = jobs[job_id]["total"]