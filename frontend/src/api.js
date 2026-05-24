/**
 * api.js
 *
 * All HTTP calls to the FastAPI backend.
 * Vite proxies /api → http://localhost:8000 in dev (see vite.config.js).
 * In production, set VITE_API_BASE to your deployed backend URL.
 */

const BASE = import.meta.env.VITE_API_BASE || "";

// ── Evaluate ─────────────────────────────────────────────────────────────────

export async function evaluateSingle({ question, answer, contexts, ground_truth, pipeline_name }) {
  const res = await fetch(`${BASE}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer, contexts, ground_truth, pipeline_name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startBatchEval({ pipeline_name, test_dataset_path }) {
  const res = await fetch(`${BASE}/api/evaluate/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pipeline_name, test_dataset_path }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { job_id, status, message }
}

/**
 * Opens an SSE connection to stream batch eval progress.
 *
 * Usage:
 *   const es = streamEvalProgress(jobId, {
 *     onProgress: ({ completed, total, current_question, current_scores }) => { ... },
 *     onComplete: ({ result }) => { ... },
 *     onError: (msg) => { ... },
 *   });
 *   // later: es.close()
 */
export function streamEvalProgress(jobId, { onProgress, onComplete, onError }) {
  const es = new EventSource(`${BASE}/api/evaluate/stream/${jobId}`);

  es.addEventListener("progress", (e) => {
    onProgress?.(JSON.parse(e.data));
  });

  es.addEventListener("complete", (e) => {
    onComplete?.(JSON.parse(e.data));
    es.close();
  });

  es.addEventListener("error", (e) => {
    try { onError?.(JSON.parse(e.data).error); } catch { onError?.("Unknown SSE error"); }
    es.close();
  });

  return es; // caller can call es.close() to cancel
}

export async function getEvalHistory({ limit = 20, pipeline_name } = {}) {
  const params = new URLSearchParams({ limit });
  if (pipeline_name) params.set("pipeline_name", pipeline_name);
  const res = await fetch(`${BASE}/api/evaluate/history?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Compare ───────────────────────────────────────────────────────────────────

export async function startChunkingCompare({ pdf_path, test_dataset_path, chunk_size, strategies }) {
  const res = await fetch(`${BASE}/api/compare/chunking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf_path, test_dataset_path, chunk_size, strategies }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startPipelineCompare({ pdf_path, test_dataset_path }) {
  const res = await fetch(`${BASE}/api/compare/pipelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf_path, test_dataset_path }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Health ─────────────────────────────────────────────────────────────────────

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}