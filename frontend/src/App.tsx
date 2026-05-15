import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvaluatePayload, MetricAggregate, RunSummary } from "./types";

const DEFAULT_BODY = `{
  "run_label": "manual_sample",
  "samples": [
    {
      "question": "What is hybrid retrieval?",
      "answer": "Hybrid retrieval combines sparse keyword search (BM25) with dense vector search.",
      "contexts": [
        "Hybrid retrieval mixes BM25 with dense vectors and often helps on rare tokens and exact matches.",
        "Latency in RAG includes retrieval, optional re-ranking, and LLM generation."
      ],
      "ground_truth_answer": "Hybrid retrieval combines BM25-style keyword search with dense embeddings for better recall.",
      "latency_ms": 842.1
    },
    {
      "question": "Why use cross-encoders?",
      "answer": "They rescore candidate passages with a transformer for sharper precision.",
      "contexts": [
        "Cross-encoder re-ranking scores each (query, passage) pair with a small transformer; it is slower but sharpens precision."
      ],
      "ground_truth_answer": "Cross-encoders improve precision by scoring query-passage pairs directly, at higher latency.",
      "latency_ms": 1204.5
    }
  ]
}`;

type StreamEvent =
  | { event: "started"; run_id: string; created_at: string }
  | { event: "evaluating"; message: string }
  | { event: "complete" } & EvaluatePayload
  | { event: "error"; detail: string };

async function readSseStream(
  response: Response,
  onEvent: (evt: StreamEvent) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice("data:".length).trim();
      onEvent(JSON.parse(json) as StreamEvent);
    }
  }
}

function metricBars(agg: MetricAggregate | null) {
  if (!agg) return [];
  const items = [
    { name: "Faithfulness", score: agg.faithfulness },
    { name: "Answer relevance", score: agg.answer_relevance },
    { name: "Context precision", score: agg.context_precision },
    { name: "Context recall", score: agg.context_recall },
  ];
  return items.map((x) => ({
    ...x,
    score: x.score == null || Number.isNaN(x.score) ? 0 : Math.max(0, Math.min(1, x.score)),
    has: x.score != null && !Number.isNaN(x.score),
  }));
}

function historyTrend(runs: RunSummary[]) {
  const ordered = [...runs].reverse();
  return ordered.map((r, i) => ({
    idx: i + 1,
    label: r.label ?? r.run_id.slice(0, 8),
    faithfulness: r.aggregates.faithfulness ?? null,
    answer_relevance: r.aggregates.answer_relevance ?? null,
    latency: r.aggregates.latency_ms_mean ?? null,
  }));
}

export default function App() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [live, setLive] = useState<EvaluatePayload | null>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [jsonInput, setJsonInput] = useState(DEFAULT_BODY);

  const refreshRuns = useCallback(async () => {
    const r = await fetch("/api/runs?limit=30");
    if (!r.ok) {
      setStatus(`Failed to load runs (${r.status})`);
      return;
    }
    setRuns(await r.json());
  }, []);

  useEffect(() => {
    void refreshRuns();
  }, [refreshRuns]);

  const barData = useMemo(() => metricBars(live?.aggregates ?? null), [live]);

  const onStreamEvaluate = async () => {
    setBusy(true);
    setStatus("Connecting…");
    setLive(null);
    try {
      const body = JSON.parse(jsonInput);
      const res = await fetch("/api/evaluate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setStatus(`HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      await readSseStream(res, (evt) => {
        if (evt.event === "started") setStatus(`Run ${evt.run_id} started`);
        if (evt.event === "evaluating") setStatus(evt.message);
        if (evt.event === "error") setStatus(evt.detail);
        if (evt.event === "complete") {
          const { event: _e, ...rest } = evt;
          setLive(rest);
          setStatus("Complete");
          void refreshRuns();
        }
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const onDemo = async () => {
    setBusy(true);
    setStatus("Running Chroma demo + evaluation…");
    setLive(null);
    try {
      const res = await fetch("/api/demo/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus(typeof data.detail === "string" ? data.detail : JSON.stringify(data));
        setBusy(false);
        return;
      }
      setLive(data as EvaluatePayload);
      setStatus("Demo complete");
      void refreshRuns();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Demo failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell">
      <header>
        <div>
          <h1>LLM Quality Monitor</h1>
          <p className="sub">
            Plug in any RAG pipeline by posting <span className="mono">question / answer / contexts</span> (plus optional{" "}
            <span className="mono">ground_truth_answer</span> for full context recall). The API runs{" "}
            <strong>RAGAS</strong> metrics and streams results for this dashboard. Chat can use{" "}
            <strong>Groq</strong> (<span className="mono">GROQ_API_KEY</span>) or OpenAI; embeddings use OpenAI when{" "}
            <span className="mono">OPENAI_API_KEY</span> is set, otherwise a local HuggingFace model. Enable{" "}
            <span className="mono">LANGCHAIN_TRACING_V2</span> on the server for <strong>LangSmith</strong> traces.
          </p>
        </div>
        <div className="row">
          <span className="pill">FastAPI · SSE · RAGAS · Chroma (demo)</span>
        </div>
      </header>

      <div className="grid">
        <div className="panel">
          <h2>Live evaluation</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            POST body is a JSON <span className="mono">EvaluateRequest</span>. Use <strong>Stream</strong> for SSE updates
            or <strong>Demo</strong> to exercise the in-memory Chroma path.
          </p>
          <div className="row" style={{ margin: "12px 0" }}>
            <button className="primary" disabled={busy} onClick={() => void onStreamEvaluate()}>
              Stream evaluate
            </button>
            <button disabled={busy} onClick={() => void onDemo()}>
              Run demo RAG
            </button>
            <button disabled={busy} onClick={() => void refreshRuns()}>
              Refresh history
            </button>
          </div>
          <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} spellCheck={false} />
          {status && <div style={{ marginTop: 10 }}>{status}</div>}
          {live?.warnings?.length ? (
            <div className="warn">
              {live.warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h2>Aggregate scores (0–1)</h2>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3144" />
                <XAxis dataKey="name" tick={{ fill: "#9aa3b5", fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fill: "#9aa3b5", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0e1118", border: "1px solid #252a3a" }}
                  formatter={(value: number, _name: string, props) => [
                    props.payload?.has ? value.toFixed(3) : "n/a",
                    "score",
                  ]}
                />
                <Bar dataKey="score" fill="#6ee7b7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 8 }} className="muted">
            Latency is measured outside RAGAS: mean{" "}
            <strong>{live?.aggregates.latency_ms_mean?.toFixed?.(1) ?? "—"}</strong> ms · p50{" "}
            <strong>{live?.aggregates.latency_ms_p50?.toFixed?.(1) ?? "—"}</strong> ms
          </div>
        </div>

        <div className="panel" style={{ gridColumn: "1 / -1" }}>
          <h2>Per-row breakdown</h2>
          {!live ? (
            <p className="muted">Run an evaluation to populate rows.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Faithfulness</th>
                    <th>Answer relevance</th>
                    <th>Context precision</th>
                    <th>Context recall</th>
                    <th>Latency (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {live.rows.map((r) => (
                    <tr key={r.index}>
                      <td>{r.index}</td>
                      <td>{r.faithfulness?.toFixed(3) ?? "—"}</td>
                      <td>{r.answer_relevance?.toFixed(3) ?? "—"}</td>
                      <td>{r.context_precision?.toFixed(3) ?? "—"}</td>
                      <td>{r.context_recall?.toFixed(3) ?? "—"}</td>
                      <td>{r.latency_ms?.toFixed(1) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel" style={{ gridColumn: "1 / -1" }}>
          <h2>Stored runs (JSONL trend)</h2>
          {runs.length === 0 ? (
            <p className="muted">No runs yet — execute an evaluation to build history.</p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={historyTrend(runs)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3144" />
                  <XAxis dataKey="idx" tick={{ fill: "#9aa3b5", fontSize: 11 }} />
                  <YAxis domain={[0, 1]} yAxisId="left" tick={{ fill: "#9aa3b5", fontSize: 11 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#9aa3b5", fontSize: 11 }}
                    label={{ value: "ms", angle: -90, position: "insideRight", fill: "#9aa3b5" }}
                  />
                  <Tooltip contentStyle={{ background: "#0e1118", border: "1px solid #252a3a" }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="faithfulness" stroke="#6ee7b7" dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="answer_relevance" stroke="#7dd3fc" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#fca5a5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
