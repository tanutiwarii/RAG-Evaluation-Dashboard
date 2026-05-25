# RAGeval — LLM Quality Monitor

> Automatically evaluate any RAG pipeline across 5 quality dimensions with live streaming results.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)
![RAGAS](https://img.shields.io/badge/RAGAS-0.1.10-purple?style=flat-square)

## What it does

- Evaluates RAG pipelines on **5 RAGAS metrics**: faithfulness, answer relevancy, context precision, context recall, answer correctness
- Supports both local internal LangChain pipelines and external RAG service endpoints via `external_pipeline_url`
- **Live SSE streaming** — see scores update question-by-question in real time
- **Chunking Lab** — compare fixed, recursive, and semantic chunking side-by-side
- **Pipeline comparison** — vector vs re-rank vs hybrid retrieval
- **MLflow tracking** — every run logged as an experiment for trend analysis

## Architecture

```
React dashboard → FastAPI (async) → RAGAS eval engine
                                  → LangChain + ChromaDB (RAG pipeline)
                                  → LangSmith (tracing)
                                  → PostgreSQL (eval history)
                                  → MLflow (metric tracking)
```

## Quick start

```bash
# 1. Clone and configure
cp .env.example .env
# Fill in OPENAI_API_KEY and LANGCHAIN_API_KEY

# 2. One-command startup
make docker-up

# 3. Open the dashboard
open http://localhost:3000

# 4. MLflow UI
open http://localhost:5000
```

## Development setup

```bash
# Backend
make install
make dev          # runs FastAPI on :8000

# Frontend
make Frontend-install
make Frontend-dev  # runs React on :3000

# Tests
make test
```

## Project structure

```
rag-eval-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── core/         # RAG pipeline, RAGAS runner, chunking, re-ranking
│   │   ├── db/           # SQLAlchemy models + async session
│   │   └── schemas/      # Pydantic request/response models
│   └── tests/
├── Frontend/
│   └── src/
│       ├── components/   # RadarChart, ScoreCard, EvalProgress, HistoryTable
│       └── pages/        # Upload, Evaluate, History
├── eval/
│   └── test_dataset.json # Ground-truth Q&A pairs
└── .github/workflows/    # CI pipeline
```

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/evaluate` | Single Q/A eval, returns 5 RAGAS scores |
| POST | `/api/evaluate/batch` | Start batch eval job, returns `job_id` |
| GET | `/api/evaluate/stream/{job_id}` | SSE stream of live progress |
| GET | `/api/evaluate/history` | Past runs from PostgreSQL |
| POST | `/api/compare/chunking` | Compare 3 chunk strategies |
| POST | `/api/compare/pipelines` | Compare vector vs rerank vs hybrid |