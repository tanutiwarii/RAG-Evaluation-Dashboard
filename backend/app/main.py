from __future__ import annotations

import asyncio
import json
import math
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)
    _SLOWAPI = True
except ModuleNotFoundError:
    class _NoLimiter:
        def limit(self, *_args, **_kwargs):
            def decorator(fn):
                return fn

            return decorator

    limiter = _NoLimiter()
    _SLOWAPI = False

from app.config import get_settings
from app.demo_pipeline import run_demo_eval
from app.model_stack import llm_configured
from app.ragas_eval import build_response_models, run_ragas_evaluation
from app.run_store import append_run, list_runs, utcnow_iso
from app.schemas import DemoRunResponse, EvaluateRequest, EvaluateResponse, MetricAggregate, RunSummary


def _clean_agg(d: dict[str, float]) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for k, v in d.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            out[k] = None
        else:
            out[k] = float(v) if isinstance(v, (int, float)) else None
    return out


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, default=str)}\n\n"


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="LLM Quality Monitor", version="0.1.0")
    app.state.limiter = limiter
    if _SLOWAPI:
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        s = get_settings()
        has_groq = bool(s.groq_api_key.strip())
        has_oai = bool(s.openai_api_key.strip())
        if has_groq:
            llm = "groq"
        elif has_oai:
            llm = "openai"
        else:
            llm = "unset"
        if has_oai:
            emb = "openai"
        elif has_groq:
            emb = "hf"
        else:
            emb = "unset"
        try:
            import ragas  # noqa: F401, PLC0415

            ragas_pkg = "ok"
        except ModuleNotFoundError:
            ragas_pkg = "missing"
        return {
            "status": "ok",
            "service": "llm-quality-monitor",
            "llm": llm,
            "embeddings": emb,
            "ragas": ragas_pkg,
        }

    @app.post("/api/evaluate", response_model=EvaluateResponse)
    @limiter.limit("30/minute")
    async def evaluate_endpoint(request: Request, body: EvaluateRequest) -> EvaluateResponse:
        settings = get_settings()
        if not llm_configured(settings):
            raise HTTPException(
                status_code=503,
                detail="Set GROQ_API_KEY or OPENAI_API_KEY on the server for the evaluation LLM.",
            )
        run_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc)

        try:
            aggregates_raw, per_row, warnings = await asyncio.to_thread(
                run_ragas_evaluation,
                body.samples,
                settings=settings,
            )
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        metric_agg, rows_out = build_response_models(aggregates_raw, per_row, body.samples)

        cleaned = _clean_agg(aggregates_raw)
        append_run(
            {
                "run_id": run_id,
                "created_at": utcnow_iso(),
                "label": body.run_label,
                "aggregates": metric_agg.model_dump(),
                "n_samples": len(body.samples),
            }
        )

        return EvaluateResponse(
            run_id=run_id,
            created_at=created_at,
            aggregates=metric_agg,
            rows=rows_out,
            warnings=warnings,
            raw_ragas_columns=cleaned,
        )

    @app.post("/api/evaluate/stream")
    @limiter.limit("20/minute")
    async def evaluate_stream(request: Request, body: EvaluateRequest) -> StreamingResponse:
        settings = get_settings()

        async def gen() -> AsyncIterator[str]:
            run_id = str(uuid.uuid4())
            created_at = datetime.now(timezone.utc)
            yield _sse({"event": "started", "run_id": run_id, "created_at": created_at.isoformat()})
            if not llm_configured(settings):
                yield _sse(
                    {
                        "event": "error",
                        "detail": "Set GROQ_API_KEY or OPENAI_API_KEY on the server for the evaluation LLM.",
                    }
                )
                return
            yield _sse({"event": "evaluating", "message": "Running RAGAS metrics (LLM calls)…"})
            try:
                aggregates_raw, per_row, warnings = await asyncio.to_thread(
                    run_ragas_evaluation,
                    body.samples,
                    settings=settings,
                )
                metric_agg, rows_out = build_response_models(aggregates_raw, per_row, body.samples)
                cleaned = _clean_agg(aggregates_raw)
                append_run(
                    {
                        "run_id": run_id,
                        "created_at": utcnow_iso(),
                        "label": body.run_label,
                        "aggregates": metric_agg.model_dump(),
                        "n_samples": len(body.samples),
                    }
                )
                payload = {
                    "event": "complete",
                    "run_id": run_id,
                    "created_at": created_at.isoformat(),
                    "aggregates": metric_agg.model_dump(),
                    "rows": [r.model_dump() for r in rows_out],
                    "warnings": warnings,
                    "raw_ragas_columns": cleaned,
                }
                yield _sse(payload)
            except Exception as e:
                yield _sse({"event": "error", "detail": str(e)})

        return StreamingResponse(gen(), media_type="text/event-stream")

    @app.get("/api/runs", response_model=list[RunSummary])
    async def runs(limit: int = 50) -> list[RunSummary]:
        raw = list_runs(limit=limit)
        out: list[RunSummary] = []
        for r in raw:
            agg = MetricAggregate(**r["aggregates"])
            out.append(
                RunSummary(
                    run_id=r["run_id"],
                    created_at=datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")),
                    label=r.get("label"),
                    aggregates=agg,
                )
            )
        return out

    @app.post("/api/demo/run", response_model=DemoRunResponse)
    @limiter.limit("10/minute")
    async def demo_run(request: Request) -> DemoRunResponse:
        settings = get_settings()
        if not llm_configured(settings):
            raise HTTPException(
                status_code=503,
                detail="Set GROQ_API_KEY or OPENAI_API_KEY on the server for the evaluation LLM.",
            )
        run_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc)
        samples, queries = await asyncio.to_thread(run_demo_eval, settings=settings)
        try:
            aggregates_raw, per_row, warnings = await asyncio.to_thread(
                run_ragas_evaluation,
                samples,
                settings=settings,
            )
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        metric_agg, rows_out = build_response_models(aggregates_raw, per_row, samples)
        cleaned = _clean_agg(aggregates_raw)
        append_run(
            {
                "run_id": run_id,
                "created_at": utcnow_iso(),
                "label": "demo_chroma",
                "aggregates": metric_agg.model_dump(),
                "n_samples": len(samples),
            }
        )
        return DemoRunResponse(
            run_id=run_id,
            created_at=created_at,
            aggregates=metric_agg,
            rows=rows_out,
            warnings=warnings,
            raw_ragas_columns=cleaned,
            demo_queries=queries,
        )

    return app


app = create_app()
