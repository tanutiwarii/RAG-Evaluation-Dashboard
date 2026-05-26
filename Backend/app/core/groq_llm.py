"""
Simple Groq LLM wrapper for use with LangChain-style interfaces.
This implementation calls Groq's Responses API and exposes a minimal `.generate()`
and `.__call__()` compatible with LangChain chain expectations.

It is intentionally small — if you have an official Groq provider for LangChain
installed you can replace this with the provider class.
"""

import json
import logging
from typing import Any, Dict

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class GroqLLM:
    """Minimal Groq LLM wrapper.

    Usage:
        llm = GroqLLM()
        out = llm("Tell me a joke")  # returns a string
    """

    def __init__(self, model: str = "groq-1"):
        self.model = model
        self.url = settings.GROQ_API_URL.strip() if settings.GROQ_API_URL else ""
        self.api_key = settings.GROQ_API_KEY.strip() if settings.GROQ_API_KEY else ""

    def _payload(self, prompt: str) -> Dict[str, Any]:
        # Groq Responses API expects a JSON payload; adapting to a minimal form
        return {
            "model": self.model,
            "input": prompt,
            "max_output_tokens": 512,
        }

    def generate(self, prompt: str) -> Dict[str, Any]:
        """Synchronous wrapper for simpler usage in current codebase.
        Uses httpx sync client to call the Groq API.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(self.url, headers=headers, json=self._payload(prompt))
                res.raise_for_status()
                data = res.json()
        except Exception as e:  # pragma: no cover
            logger.exception("Groq API request failed")
            raise

        # Normalize — this depends on Groq response shape; adjust if needed
        # Prefer `output_text` or look into `output` fields
        txt = None
        if isinstance(data, dict):
            if "output" in data and isinstance(data["output"], list):
                # heuristic: join text from output list
                parts = []
                for item in data["output"]:
                    if isinstance(item, dict) and "content" in item:
                        parts.append(item["content"])  # may need adjustment
                txt = "\n".join(parts).strip()
            elif "output_text" in data:
                txt = data.get("output_text")
            elif "text" in data:
                txt = data.get("text")

        if txt is None:
            # fallback to raw JSON string
            txt = json.dumps(data)

        return {"text": txt, "raw": data}

    def __call__(self, prompt: str) -> str:
        return self.generate(prompt)["text"]

    # LangChain compatibility shim: `ChatOpenAI`-like interface often uses `generate` with messages
    def generate_messages(self, messages: list[dict]):
        # join messages to a single prompt
        prompt = "\n".join([f"{m.get('role','user')}: {m.get('content','')}" for m in messages])
        return self.generate(prompt)
