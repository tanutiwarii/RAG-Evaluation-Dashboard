"""
core/langsmith_tracer.py

Pulls trace data from LangSmith API for a given run.
Used to attach latency and token cost to each eval result.

Set LANGCHAIN_TRACING_V2=true in .env — LangChain auto-traces
every LLM call from that point on. This module just reads those traces back.
"""

import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

LANGSMITH_BASE = "https://api.smith.langchain.com"


async def get_run_traces(run_id: str) -> dict:
    """
    Fetches a LangSmith run by ID and returns latency + token usage.
    Returns empty dict if tracing is disabled or run not found.
    """
    if not settings.LANGCHAIN_API_KEY:
        return {}

    headers = {"x-api-key": settings.LANGCHAIN_API_KEY}
    url = f"{LANGSMITH_BASE}/runs/{run_id}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url, headers=headers)
            res.raise_for_status()
            data = res.json()
            return {
                "latency_ms": data.get("latency_p50"),
                "total_tokens": data.get("total_tokens"),
                "prompt_tokens": data.get("prompt_tokens"),
                "completion_tokens": data.get("completion_tokens"),
            }
    except Exception as e:
        logger.warning(f"LangSmith trace fetch failed for run {run_id}: {e}")
        return {}