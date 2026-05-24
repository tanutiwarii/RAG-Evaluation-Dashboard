"""
core/job_store.py

In-memory store for background evaluation jobs.
Maps job_id -> job state dict.

For production at scale, swap this out for Redis.
For this project, in-memory is fine and keeps setup simple.
"""

import uuid
from typing import Optional
from asyncio import Queue


class JobStore:
    def __init__(self):
        # { job_id: { "status": str, "queue": asyncio.Queue, "result": dict | None } }
        self._jobs: dict[str, dict] = {}

    def create_job(self) -> str:
        """Creates a new job entry. Returns the job_id."""
        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {
            "status": "queued",
            "queue": Queue(),
            "result": None,
            "error": None,
        }
        return job_id

    def get_job(self, job_id: str) -> Optional[dict]:
        return self._jobs.get(job_id)

    def set_status(self, job_id: str, status: str):
        if job_id in self._jobs:
            self._jobs[job_id]["status"] = status

    def set_result(self, job_id: str, result: dict):
        if job_id in self._jobs:
            self._jobs[job_id]["result"] = result
            self._jobs[job_id]["status"] = "complete"

    def set_error(self, job_id: str, error: str):
        if job_id in self._jobs:
            self._jobs[job_id]["error"] = error
            self._jobs[job_id]["status"] = "error"

    async def push_event(self, job_id: str, event: dict):
        """Push a progress event into the job's queue (consumed by SSE stream)."""
        job = self._jobs.get(job_id)
        if job:
            await job["queue"].put(event)

    async def pop_event(self, job_id: str) -> Optional[dict]:
        """Pop the next event from the queue. Blocks until available."""
        job = self._jobs.get(job_id)
        if job:
            return await job["queue"].get()
        return None


# Singleton instance shared across the app
job_store = JobStore()