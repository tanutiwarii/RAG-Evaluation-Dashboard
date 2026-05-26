import { useState, useRef } from "react";
import { startChunkingCompare, streamEvalProgress } from "../api";
import { MultiRAGASRadar } from "../components/RadarChart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const METRIC_LABELS = {
  faithfulness:       "Faithfulness",
  answer_relevancy:   "Answer Relevancy",
  context_precision:  "Context Precision",
  context_recall:     "Context Recall",
  answer_correctness: "Answer Correctness",
};

const METRIC_SHORT = {
  faithfulness:       "Faith",
  answer_relevancy:   "Relev",
  context_precision:  "Prec",
  context_recall:     "Recall",
  answer_correctness: "Correct",
};

const COLORS = {
  fixed:     "#f06060",
  recursive: "#7c6cfc",
  semantic:  "#3ef08a",
};

const now = () =>
  new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function ChunkingLabPage({ setGlobalStatus }) {
  const [form, setForm] = useState({
    pdf_path: "Eval/sample_docs/sample.pdf",
    dataset_path: "Eval/test_dataset.json",
    chunk_size: 512,
  });
  const [running, setRunning]   = useState(false);
  const [events, setEvents]     = useState([]);
  const [results, setResults]   = useState(null);
  const [error, setError]       = useState(null);
  const esRef = useRef(null);

  const addEvent = (msg) =>
    setEvents(prev => [...prev.slice(-99), { time: now(), msg }]);

  const run = async () => {
    setRunning(true); setResults(null); setError(null); setEvents([]);
    setGlobalStatus("running");
    addEvent("Starting chunking comparison...");

    try {
      const { job_id } = await startChunkingCompare({
        pdf_path:          form.pdf_path,
        test_dataset_path: form.dataset_path,
        chunk_size:        Number(form.chunk_size),
        strategies:        ["fixed", "recursive", "semantic"],
      });
      addEvent(`Job created: ${job_id} — streaming progress...`);

      esRef.current = streamEvalProgress(job_id, {
        onProgress: ({ message, stage }) => {
          addEvent(message || stage || "Running...");
        },
        onComplete: ({ results: r }) => {
          addEvent("Comparison complete. Rendering charts...");
          setResults(r);
          setRunning(false);
          setGlobalStatus("idle");
        },
        onError: (msg) => {
          setError(msg);
          addEvent(`Error: ${msg}`);
          setRunning(false);
          setGlobalStatus("idle");
        },
      });
    } catch (e) {
      setError(e.message);
      addEvent(`Error: ${e.message}`);
      setRunning(false);
      setGlobalStatus("idle");
    }
  };

  const stop = () => {
    esRef.current?.close();
    setRunning(false);
    setGlobalStatus("idle");
    addEvent("Stopped.");
  };

  // Build bar chart data
  const barData = results
    ? Object.entries(METRIC_SHORT).map(([key, short]) => {
        const point = { metric: short, full: METRIC_LABELS[key] };
        Object.keys(results).forEach(s => {
          point[s] = parseFloat(((results[s]?.scores?.[key] || 0) * 100).toFixed(1));
        });
        return point;
      })
    : [];

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
        Chunking Lab
      </div>
      <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
        Compare fixed-size, recursive, and semantic chunking across all 5 RAGAS dimensions
      </div>

      {/* Config + controls */}
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)",
        borderRadius: 14, padding: 20, marginBottom: 20,
        display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 14, alignItems: "end",
      }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>
            PDF path
          </label>
          <input value={form.pdf_path} onChange={e => setForm(f => ({ ...f, pdf_path: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>
            Test dataset path
          </label>
          <input value={form.dataset_path} onChange={e => setForm(f => ({ ...f, dataset_path: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>
            Chunk size
          </label>
          <input type="number" value={form.chunk_size} onChange={e => setForm(f => ({ ...f, chunk_size: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
          {running ? (
            <button onClick={stop} style={btnStyle(false)}>⏹ Stop</button>
          ) : (
            <button onClick={run} style={btnStyle(true)}>▶ Run comparison</button>
          )}
        </div>
      </div>

      {/* Live event feed */}
      {(running || events.length > 0) && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
            Progress
          </div>
          <div style={{
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
            padding: 12, fontFamily: "var(--mono)", fontSize: 12, maxHeight: 180, overflowY: "auto",
          }}>
            {events.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "3px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text3)", flexShrink: 0 }}>{e.time}</span>
                <span style={{ color: "var(--text2)" }}>{e.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "color-mix(in srgb, var(--red) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
          fontSize: 12, color: "var(--red)", fontFamily: "var(--mono)",
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>

          {/* Strategy summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            {Object.entries(results).map(([strategy, data]) => (
              <div key={strategy} style={{
                background: "var(--bg2)",
                border: `1px solid color-mix(in srgb, ${COLORS[strategy]} 30%, transparent)`,
                borderRadius: 14, padding: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: COLORS[strategy] }}>
                    {strategy}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: "var(--mono)", padding: "2px 8px", borderRadius: 4,
                    background: `color-mix(in srgb, ${COLORS[strategy]} 12%, transparent)`,
                    color: COLORS[strategy],
                    border: `1px solid color-mix(in srgb, ${COLORS[strategy]} 30%, transparent)`,
                  }}>
                    {data.chunk_count} chunks
                  </span>
                </div>
                <div style={{
                  fontSize: 32, fontWeight: 800, fontFamily: "var(--mono)",
                  color: COLORS[strategy], marginBottom: 4,
                }}>
                  {(data.overall * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>
                  {data.avg_latency_ms}ms avg latency
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

            {/* Radar overlay */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                RAGAS dimensions — strategy overlay
              </div>
              <MultiRAGASRadar dataMap={results} colors={COLORS} />
            </div>

            {/* Bar chart */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                Score by metric
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke="#2a2a38" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="metric" tick={{ fill: "#9090a8", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9090a8", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "JetBrains Mono" }}>
                          <div style={{ color: "var(--text2)", marginBottom: 4 }}>{barData.find(d => d.metric === label)?.full}</div>
                          {payload.map(p => (
                            <div key={p.name} style={{ color: COLORS[p.name] }}>{p.name}: {p.value}%</div>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  {Object.keys(results).map(s => (
                    <Bar key={s} dataKey={s} fill={COLORS[s]} radius={[3, 3, 0, 0]} />
                  ))}
                  <Legend
                    wrapperStyle={{ fontSize: 12, fontFamily: "JetBrains Mono" }}
                    formatter={v => <span style={{ color: COLORS[v] }}>{v}</span>}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-metric breakdown bars */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 16 }}>
              Per-metric breakdown
            </div>
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
              <div key={key} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, marginBottom: 8 }}>{label}</div>
                {Object.entries(results).map(([strategy, data]) => {
                  const v = data.scores?.[key] || 0;
                  return (
                    <div key={strategy} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ fontFamily: "var(--mono)", color: COLORS[strategy] }}>{strategy}</span>
                        <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>{(v * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 7, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          background: COLORS[strategy],
                          width: `${v * 100}%`,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid var(--border)", marginTop: 10 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(primary) {
  return {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "9px 18px", borderRadius: 8,
    fontSize: 13, fontWeight: 600, fontFamily: "var(--font)",
    cursor: "pointer", border: "1px solid",
    background: primary ? "var(--accent)" : "transparent",
    color:      primary ? "#fff" : "var(--text2)",
    borderColor: primary ? "var(--accent)" : "var(--border2)",
    transition: "all 0.15s",
  };
}