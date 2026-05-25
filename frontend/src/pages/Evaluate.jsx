import { useState, useRef } from "react";
import { evaluateSingle, startBatchEval, streamEvalProgress } from "../api";
import { RAGASRadar } from "../components/RadarChart";
import { ScoreCardGrid } from "../components/ScoreCard";
import { EvalProgress } from "../components/EvalProgress";

const now = () =>
  new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function EvaluatePage({ setGlobalStatus }) {
  const [mode, setMode] = useState("single");

  // Single eval state
  const [form, setForm] = useState({
    question: "",
    answer: "",
    contexts: "",
    ground_truth: "",
    pipeline_name: "my-pipeline",
  });

  // Batch eval state
  const [batchForm, setBatchForm] = useState({
    pipeline_name: "recursive-rerank",
    pipeline_type: "internal",
    pdf_path: "",
    external_pipeline_url: "",
    external_pipeline_headers: "",
    dataset_path: "eval/test_dataset.json",
  });

  const [running, setRunning]     = useState(false);
  const [events, setEvents]       = useState([]);
  const [progress, setProgress]   = useState({ completed: 0, total: 0 });
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const esRef = useRef(null);

  const addEvent = (msg, score = null) =>
    setEvents(prev => [...prev.slice(-199), { time: now(), msg, score }]);

  // ── Single eval ─────────────────────────────────────────────────────────────
  const runSingle = async () => {
    if (!form.question || !form.answer || !form.ground_truth) {
      setError("Question, answer, and ground truth are required."); return;
    }
    setRunning(true); setResult(null); setError(null); setEvents([]);
    setGlobalStatus("running");
    addEvent(`Sending to /api/evaluate...`);

    try {
      const data = await evaluateSingle({
        question:      form.question,
        answer:        form.answer,
        contexts:      form.contexts.split("\n").filter(Boolean),
        ground_truth:  form.ground_truth,
        pipeline_name: form.pipeline_name,
      });
      addEvent("Scores received.", data.overall_score);
      setResult(data);
    } catch (e) {
      setError(e.message);
      addEvent(`Error: ${e.message}`);
    } finally {
      setRunning(false);
      setGlobalStatus("idle");
    }
  };

  // ── Batch eval via SSE ──────────────────────────────────────────────────────
  const runBatch = async () => {
    setRunning(true); setResult(null); setError(null);
    setEvents([]); setProgress({ completed: 0, total: 0 });
    setGlobalStatus("running");
    addEvent(`Starting batch eval: pipeline="${batchForm.pipeline_name}"`);

    try {
      const { job_id, message } = await startBatchEval({
        pipeline_name: batchForm.pipeline_name,
        pipeline_type: batchForm.pipeline_type,
        pdf_path: batchForm.pdf_path,
        external_pipeline_url: batchForm.external_pipeline_url,
        external_pipeline_headers: batchForm.external_pipeline_headers
          ? JSON.parse(batchForm.external_pipeline_headers)
          : undefined,
        test_dataset_path: batchForm.dataset_path,
      });
      addEvent(`Job created: ${job_id}`);
      addEvent(message);

      // Open SSE stream
      esRef.current = streamEvalProgress(job_id, {
        onProgress: ({ completed, total, current_question, current_scores }) => {
          setProgress({ completed, total });
          const overall = current_scores
            ? Object.values(current_scores).reduce((a, b) => a + b, 0) / 5
            : null;
          addEvent(
            `[${completed}/${total}] ${(current_question || "").substring(0, 50)}...`,
            overall,
          );
        },
        onComplete: ({ result: r }) => {
          addEvent("Batch complete. Results saved to database.", r.overall_score);
          setResult(r);
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
    addEvent("Stopped by user.");
  };

  const scores = result?.scores ?? result?.aggregate_scores;

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
        Evaluate Pipeline
      </div>
      <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
        Run RAGAS evaluation on a single Q/A pair or a full test dataset via SSE streaming
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "single", label: "⚡ Single eval" },
          { id: "batch",  label: "📦 Batch eval"  },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(null); setError(null); setEvents([]); }}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: "1px solid",
              fontSize: 13, fontWeight: 600, fontFamily: "var(--font)",
              cursor: "pointer", transition: "all 0.15s",
              background: mode === m.id ? "var(--accent)" : "transparent",
              color:      mode === m.id ? "#fff" : "var(--text2)",
              borderColor: mode === m.id ? "var(--accent)" : "var(--border2)",
            }}
          >{m.label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Left: input form ── */}
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 16 }}>
            {mode === "single" ? "Input" : "Batch config"}
          </div>

          {mode === "single" ? (
            <>
              <Field label="Pipeline name">
                <input value={form.pipeline_name} onChange={e => setForm(f => ({ ...f, pipeline_name: e.target.value }))} placeholder="recursive-rerank" />
              </Field>
              <Field label="Question">
                <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="What is retrieval-augmented generation?" />
              </Field>
              <Field label="LLM-generated answer">
                <textarea rows={3} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="The model's answer..." />
              </Field>
              <Field label="Retrieved context chunks (one per line)">
                <textarea rows={4} value={form.contexts} onChange={e => setForm(f => ({ ...f, contexts: e.target.value }))} placeholder={"Chunk 1 text...\nChunk 2 text..."} />
              </Field>
              <Field label="Ground truth answer">
                <textarea rows={2} value={form.ground_truth} onChange={e => setForm(f => ({ ...f, ground_truth: e.target.value }))} placeholder="The correct expected answer..." />
              </Field>
              <Btn primary onClick={runSingle} disabled={running} loading={running} style={{ width: "100%" }}>
                ▶ Run RAGAS eval
              </Btn>
            </>
          ) : (
            <>
              <Field label="Pipeline name">
                <input value={batchForm.pipeline_name} onChange={e => setBatchForm(f => ({ ...f, pipeline_name: e.target.value }))} />
              </Field>
              <Field label="Pipeline source">
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "internal", label: "Internal pipeline" },
                    { id: "external", label: "External pipeline" },
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBatchForm(f => ({ ...f, pipeline_type: option.id }))}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid",
                        background: batchForm.pipeline_type === option.id ? "var(--accent)" : "transparent",
                        color: batchForm.pipeline_type === option.id ? "#fff" : "var(--text2)",
                        borderColor: batchForm.pipeline_type === option.id ? "var(--accent)" : "var(--border2)",
                        cursor: "pointer",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>

              {batchForm.pipeline_type === "internal" ? (
                <Field label="PDF path for internal pipeline">
                  <input value={batchForm.pdf_path} onChange={e => setBatchForm(f => ({ ...f, pdf_path: e.target.value }))} placeholder="path/to/document.pdf" />
                </Field>
              ) : (
                <>
                  <Field label="External pipeline URL">
                    <input value={batchForm.external_pipeline_url} onChange={e => setBatchForm(f => ({ ...f, external_pipeline_url: e.target.value }))} placeholder="https://api.example.com/pipeline" />
                  </Field>
                  <Field label="Optional headers (JSON)">
                    <textarea rows={3} value={batchForm.external_pipeline_headers} onChange={e => setBatchForm(f => ({ ...f, external_pipeline_headers: e.target.value }))} placeholder='{"Authorization": "Bearer ..."}' />
                  </Field>
                </>
              )}

              <Field label="Test dataset path">
                <input value={batchForm.dataset_path} onChange={e => setBatchForm(f => ({ ...f, dataset_path: e.target.value }))} />
              </Field>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14, lineHeight: 1.7 }}>
                Starts a background job. The SSE stream at{" "}
                <code style={{ fontFamily: "var(--mono)", color: "var(--text2)", background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>
                  /api/evaluate/stream/{"{job_id}"}
                </code>{" "}
                pushes live progress as each question is evaluated.
              </div>

              {running ? (
                <>
                  <EvalProgress events={events} progress={progress} />
                  <Btn onClick={stop} style={{ width: "100%", marginTop: 12 }}>⏹ Stop</Btn>
                </>
              ) : (
                <Btn primary onClick={runBatch} style={{ width: "100%" }}>
                  ▶ Start batch eval
                </Btn>
              )}
            </>
          )}

          {error && (
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 8,
              background: "color-mix(in srgb, var(--red) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
              fontSize: 12, color: "var(--red)", fontFamily: "var(--mono)",
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Right: live feed + results ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Single eval live feed */}
          {mode === "single" && events.length > 0 && (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                Live feed
              </div>
              <EvalProgress events={events} progress={{ completed: 0, total: 0 }} />
            </div>
          )}

          {/* Result card */}
          {result && (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, animation: "fadeIn 0.3s ease" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>
                  Result — {result.pipeline_name}
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11,
                  background: "var(--bg3)", color: "var(--text2)",
                  border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 4,
                }}>
                  {result.total_latency_ms
                    ? `${(result.total_latency_ms / 1000).toFixed(1)}s total`
                    : `${result.latency_ms}ms`}
                </span>
              </div>

              {/* Overall score */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 20 }}>
                <div style={{
                  fontSize: 48, fontWeight: 800, fontFamily: "var(--mono)",
                  letterSpacing: -2, lineHeight: 1,
                  color: result.overall_score >= 0.8
                    ? "var(--green)" : result.overall_score >= 0.6
                    ? "var(--amber)" : "var(--red)",
                }}>
                  {((result.overall_score) * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", paddingBottom: 6 }}>overall</div>
              </div>

              {/* Radar */}
              <RAGASRadar scores={scores} label={result.pipeline_name} />

              {/* Score cards */}
              <div style={{ marginTop: 16 }}>
                <ScoreCardGrid scores={scores} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small reusable components local to this page ─────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Btn({ primary, loading, disabled, children, style = {}, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "9px 18px", borderRadius: 8,
        fontSize: 13, fontWeight: 600, fontFamily: "var(--font)",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        border: "1px solid",
        background: primary ? "var(--accent)" : "transparent",
        color:      primary ? "#fff" : "var(--text2)",
        borderColor: primary ? "var(--accent)" : "var(--border2)",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {loading && (
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.3)",
          borderTopColor: "#fff",
          animation: "spin 0.7s linear infinite",
        }} />
      )}
      {children}
    </button>
  );
}