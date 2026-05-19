#POST /api/evaluate        — single Q+A eval, returns 5 RAGAS scores
#POST /api/evaluate/batch  — runs full test_dataset.json as background job
#GET  /api/evaluate/stream/{job_id} — SSE stream of live progress
#GET  /api/evaluate/history — all past runs from PostgreSQL