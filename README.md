# RAG Evaluation Dashboard

A full-stack dashboard for experimenting with retrieval-augmented generation (RAG), evaluating answer quality, comparing chunking strategies, and tracking evaluation history.

The app combines a FastAPI backend with a React/Vite frontend. The backend runs a local RAG pipeline with vector retrieval, BM25 retrieval, reranking, LLM generation, and RAG-style metrics. The frontend provides workflows for single evaluation, batch evaluation, chunking comparison, PDF knowledge-base management, and historical analysis.

## Features

- Single-question RAG evaluation with answer, contexts, ground truth, and metric scoring.
- Batch evaluation with manual mode and pipeline mode.
- Live batch progress via server-sent events.
- Export batch results as JSON or CSV.
- Download a sample pipeline-mode batch dataset.
- PDF upload and knowledge-base management.
- Chunking lab for fixed, recursive, and semantic chunking strategies.
- Chunking strategy comparison with correctness, faithfulness, latency, and retrieved chunks.
- History dashboard with summaries, charts, filtering, pagination, run comparison, and per-run deletion.
- Supabase-backed history persistence.
- Shared RAG pipeline instance to avoid route/service circular imports.

## Architecture

```text
Frontend (React + Vite)
  - Evaluate page
  - Batch evaluation
  - Chunking lab
  - History dashboard
  - Uploads / knowledge base

Backend (FastAPI)
  - RAG pipeline
  - Evaluation routes
  - Batch jobs
  - Chunking routes
  - Upload routes
  - History persistence

Storage / Services
  - Chroma vector store
  - Supabase evaluation history
  - Local uploaded PDFs
  - LLM endpoint configured by environment variables
```

The shared RAG pipeline instance lives in:

```text
Backend/app/core/rag_instance.py
```

Both route handlers and services import from this shared module:

```python
from app.core.rag_instance import rag_pipeline
```

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Recharts, Axios
- Backend: FastAPI, SQLAlchemy, Supabase client
- RAG: LangChain, ChromaDB, Sentence Transformers, BM25, CrossEncoder reranker
- Evaluation: custom RAG-style metrics through `ragas_evaluator.py`
- LLM client: OpenAI-compatible API configured through environment variables

## Project Structure

```text
.
├── Backend/
│   ├── app/
│   │   ├── core.py
│   │   ├── core/
│   │   │   └── rag_instance.py
│   │   ├── data/
│   │   ├── db/
│   │   ├── evaluators/
│   │   ├── models/
│   │   ├── rag/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── chroma_db/
│   ├── uploads/
│   └── requirements.txt
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles.css
│   │   └── main.jsx
│   └── package.json
├── .env.example
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Supabase project with an `evaluation_runs` table
- OpenAI-compatible LLM endpoint credentials

The first backend startup may take time because embedding and reranker models are loaded locally.

## Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example Backend/.env
```

Required or commonly used variables:

```bash
# LLM
GITHUB_TOKEN=
GITHUB_MODEL=
GITHUB_ENDPOINT=

OPENAI_API_KEY=
OPENAI_BASE_URL=

# Local SQLAlchemy database, used by older evaluation storage code
DATABASE_URL=

# Supabase history storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Optional LangSmith tracing
LANGCHAIN_PROJECT=
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=
```

The current LLM service uses:

```text
GITHUB_TOKEN
GITHUB_MODEL
GITHUB_ENDPOINT
```

through an OpenAI-compatible client.

## Supabase History Table

History is stored in the Supabase table:

```text
evaluation_runs
```

Expected fields include:

```text
run_id
timestamp
question
chunk_size
chunk_overlap
ground_truth
winner
strategies
created_at
```

`strategies` should be a JSON-compatible column because chunking and batch results are stored as nested objects.

## Backend Setup

From the project root:

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

FastAPI docs are available at:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

From the project root:

```bash
cd Frontend
npm install
npm run dev
```

The frontend usually runs at:

```text
http://127.0.0.1:5173
```

Build for production:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

## Main Workflows

### 1. Single Evaluation

Use the Evaluate page's single mode to score one response.

Typical input:

```json
{
  "question": "What is retrieval-augmented generation?",
  "answer": "RAG combines retrieval with generation.",
  "contexts": [
    "Retrieval-augmented generation combines a retriever and an LLM."
  ],
  "ground_truth": "RAG combines retrieval from a knowledge base with LLM generation."
}
```

Endpoint:

```text
POST /evaluate/single
```

### 2. Batch Evaluation

Batch evaluation supports two modes.

Manual mode expects answers and contexts to be provided:

```json
{
  "mode": "manual",
  "items": [
    {
      "question": "What is RAG?",
      "answer": "RAG combines retrieval and generation.",
      "ground_truth": "RAG combines a retrieval system with an LLM.",
      "contexts": ["RAG uses retrieved documents as context."]
    }
  ]
}
```

Pipeline mode runs the RAG pipeline automatically for each question. A raw array is normalized by the UI into pipeline mode:

```json
[
  {
    "question": "What is RAG?",
    "ground_truth": "RAG combines a retrieval system with an LLM."
  }
]
```

Endpoints:

```text
POST /evaluate/batch
GET  /evaluate/batch/{job_id}/stream
GET  /evaluate/batch/{job_id}/result
```

Batch results can be exported from the UI as JSON or CSV.

### 3. Upload Documents

Use the Uploads page to add PDFs to the knowledge base.

Endpoints:

```text
POST   /upload
GET    /documents
DELETE /documents/{source_name}
DELETE /documents
```

Uploaded PDFs are saved under:

```text
Backend/uploads/
```

Their extracted text is chunked, embedded, added to Chroma, and made available to the RAG pipeline.

### 4. Chunking Lab

The Chunking Lab compares:

- Fixed-size chunking
- Recursive chunking
- Semantic chunking

Endpoints:

```text
POST /chunking/test
POST /chunking/evaluate
POST /chunking/compare
```

Comparison runs are saved to history.

### 5. History Dashboard

History supports:

- Paginated run list
- Search and winner filtering
- Summary cards
- Correctness trend chart
- Winner distribution chart
- Strategy leaderboard
- Run comparison
- Batch evaluation records
- JSON export and run deletion

Endpoints:

```text
GET    /history?page=1&limit=5
DELETE /history
DELETE /history/{run_id}
```

## API Summary

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/ask` | Ask the RAG pipeline and store an evaluation |
| `POST` | `/ask-stream` | Stream a RAG answer |
| `GET` | `/evaluations` | Fetch stored evaluations |
| `POST` | `/evaluate/single` | Evaluate one question/answer/context set |
| `POST` | `/evaluate/batch` | Start batch evaluation |
| `GET` | `/evaluate/batch/{job_id}/stream` | Stream batch job progress |
| `GET` | `/evaluate/batch/{job_id}/result` | Fetch batch result |
| `POST` | `/upload` | Upload and index a PDF |
| `GET` | `/documents` | List loaded documents |
| `DELETE` | `/documents/{source_name}` | Remove a document from the registry |
| `DELETE` | `/documents` | Clear the knowledge base |
| `POST` | `/chunking/test` | Inspect chunks for one strategy |
| `POST` | `/chunking/evaluate` | Evaluate one chunking strategy |
| `POST` | `/chunking/compare` | Compare fixed, recursive, and semantic strategies |
| `GET` | `/history` | Fetch evaluation history |
| `DELETE` | `/history` | Clear history |
| `DELETE` | `/history/{run_id}` | Delete one history run |

## Metrics

The dashboard displays:

- Faithfulness: whether the answer is supported by retrieved context.
- Answer relevancy: whether the answer addresses the question.
- Context precision: how much retrieved context is useful.
- Context recall: whether retrieved context contains needed information.
- Answer correctness: similarity to ground truth when available.
- Latency: elapsed generation/evaluation time.

## Development Notes

- The frontend currently calls the backend at `http://127.0.0.1:8000`.
- The backend allows all CORS origins for local development.
- The initial RAG pipeline loads `Backend/app/data/company_policy.txt`.
- Chroma persistence is stored in `Backend/chroma_db`.
- Batch jobs are tracked in memory through `job_manager.py`; restarting the backend clears active job state.
- Supabase stores completed history runs.

## Troubleshooting

### Backend import or startup is slow

The RAG pipeline loads SentenceTransformer and CrossEncoder models. First startup can be slow while models initialize or download.

### History page cannot load

Check:

- Backend is running on port `8000`.
- `SUPABASE_URL` is set.
- `SUPABASE_SERVICE_ROLE_KEY` is set.
- The `evaluation_runs` table exists.
- The `strategies` column can store JSON.

### LLM generation fails

Check:

- `GITHUB_TOKEN`
- `GITHUB_MODEL`
- `GITHUB_ENDPOINT`

The endpoint must be OpenAI-compatible because the service uses the OpenAI Python client.

### Upload fails

Check:

- `Backend/uploads/` exists and is writable.
- The uploaded file is a PDF.
- The backend process has permission to write in the project directory.

### Frontend shows stale UI

Restart Vite:

```bash
cd Frontend
npm run dev
```

### Full frontend lint fails

Run a focused lint command while working on one file:

```bash
npx eslint src/path/to/file.jsx
```

Some existing app-wide lint rules may flag unrelated files.

## Useful Commands

Backend:

```bash
cd Backend
source .venv/bin/activate
uvicorn app.main:app --reload
python -m compileall app
```

Frontend:

```bash
cd Frontend
npm run dev
npm run build
npm run lint
```

## Roadmap Ideas

- Move frontend API base URL into an environment variable.
- Add persistent job storage for batch evaluation.
- Add authentication around Supabase service-role operations.
- Add Docker Compose services for frontend, backend, and database dependencies.
- Add automated backend tests for route contracts.
- Add frontend component tests for batch upload/export flows.

## License

No license has been specified yet. Add one before publishing or distributing this project.
