import { useState, useEffect } from "react";
import { getEvalHistory } from "../api";
import { RAGASRadar } from "../components/RadarChart";
import { ScoreCardGrid } from "../components/ScoreCard";
import { HistoryTable } from "../components/HistoryTable";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";

const METRIC_LABELS = {
  faithfulness:       "Faithfulness",
  answer_relevancy:   "Answer Relevancy",
  context_precision:  "Context Precision",
  context_recall:     "Context Recall",
  answer_correctness: "Answer Correctness",
};

export function HistoryPage() {
  const [runs, setRuns]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    getEvalHistory({ limit: 50 })
      .then(data => { setRuns(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Build trend data for the line chart (oldest → newest)
  const trendData = [...runs].reverse().map((r, i) => ({
    idx: i + 1,
    score: parseFloat((r.overall_score * 100).toFixed(1)),
    label: r.pipeline_name,
  }));

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
        Eval History
      </div>
      <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
        All completed evaluation runs — track score trends across pipeline iterations
      </div>

      {loading && (
        <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading history...</div>
      )}

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "color-mix(in srgb, var(--red) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
          fontSize: 12, color: "var(--red)", fontFamily: "var(--mono)",
        }}>
          Failed to load history: {error}
        </div>
      )}

      {!loading && runs.length > 0 && (
        <>
          {/* Trend line */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 16 }}>
              Overall score trend
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData} margin={{ top: 4, right: 20, left: -20, bottom: 4 }}>
                <CartesianGrid stroke="#2a2a38" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="idx" tick={{ fill: "#9090a8", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fill: "#9090a8", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div style={{
                        background: "var(--bg2)", border: "1px solid var(--border2)",
                        borderRadius: 8, padding: "8px 12px",
                        fontSize: 12, fontFamily: "JetBrains Mono",
                      }}>
                        <div style={{ color: "var(--accent2)" }}>{payload[0].value}%</div>
                        <div style={{ color: "var(--text3)", fontSize: 11 }}>{payload[0].payload.label}</div>
                      </div>
                    ) : null
                  }
                />
                <Line
                  type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2}
                  dot={{ fill: "var(--accent)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "var(--accent2)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table + detail panel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

            {/* Table */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                All runs ({runs.length})
              </div>
              <HistoryTable runs={runs} selected={selected} onSelect={setSelected} />
            </div>

            {/* Detail panel */}
            {selected ? (
              <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, animation: "fadeIn 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>
                    {selected.pipeline_name}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}
                  >✕</button>
                </div>

                {/* Overall score */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    fontSize: 44, fontWeight: 800, fontFamily: "var(--mono)", lineHeight: 1, letterSpacing: -2,
                    color: selected.overall_score >= 0.8 ? "var(--green)" : selected.overall_score >= 0.6 ? "var(--amber)" : "var(--red)",
                  }}>
                    {(selected.overall_score * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", paddingBottom: 6 }}>overall</div>
                </div>

                {/* Radar */}
                <RAGASRadar scores={selected.aggregate_scores} label={selected.pipeline_name} color="var(--cyan)" />

                {/* Per-metric rows */}
                <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  {Object.entries(METRIC_LABELS).map(([key, label]) => {
                    const v = selected.aggregate_scores[key];
                    const color = v >= 0.8 ? "var(--green)" : v >= 0.6 ? "var(--amber)" : "var(--red)";
                    return (
                      <div key={key} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
                      }}>
                        <span style={{ color: "var(--text2)" }}>{label}</span>
                        <span style={{ fontFamily: "var(--mono)", fontWeight: 500, color }}>
                          {(v * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Score cards */}
                <div style={{ marginTop: 16 }}>
                  <ScoreCardGrid scores={selected.aggregate_scores} />
                </div>
              </div>
            ) : (
              <div style={{
                background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14,
                padding: 48, textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>📊</div>
                <div style={{ fontSize: 13, color: "var(--text3)" }}>
                  Click a run to see its radar chart and per-metric breakdown
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && runs.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 64, color: "var(--text3)", fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📋</div>
          No evaluation runs yet.<br />
          Run a batch eval on the Evaluate page to populate history.
        </div>
      )}
    </div>
  );
}