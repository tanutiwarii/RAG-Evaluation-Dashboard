/**
 * ScoreCard.jsx
 *
 * Displays a single RAGAS metric score with a label, value, and progress bar.
 *
 * Props:
 *   label   — metric display name
 *   value   — float 0–1
 *   tooltip — optional description shown on hover
 */

const METRIC_DESCRIPTIONS = {
  "Faithfulness":       "Are all claims in the answer grounded in the retrieved context?",
  "Answer Relevancy":   "Does the answer directly address the question asked?",
  "Context Precision":  "What fraction of retrieved chunks were actually relevant?",
  "Context Recall":     "Did the retrieved context contain all info needed to answer?",
  "Answer Correctness": "Is the answer factually correct vs the ground truth?",
};

function scoreColor(v) {
  if (v >= 0.8) return "var(--green)";
  if (v >= 0.6) return "var(--amber)";
  return "var(--red)";
}

export function ScoreCard({ label, value }) {
  const color = scoreColor(value ?? 0);
  const pct = Math.round((value ?? 0) * 100);
  const desc = METRIC_DESCRIPTIONS[label];

  return (
    <div title={desc} style={{
      background: "var(--bg2)",
      border: `1px solid color-mix(in srgb, ${color} 20%, var(--border))`,
      borderRadius: 10,
      padding: "14px 16px",
      cursor: "default",
      transition: "border-color 0.2s",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: "var(--text3)",
        textTransform: "uppercase", letterSpacing: "0.07em",
        marginBottom: 8,
      }}>
        {label}
      </div>

      <div style={{
        fontSize: 26, fontWeight: 800,
        fontFamily: "var(--mono)", color,
        lineHeight: 1, marginBottom: 10,
      }}>
        {value != null ? `${pct}%` : "—"}
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, background: "var(--bg3)",
        borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: color,
          width: `${pct}%`,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

/**
 * ScoreCardGrid — renders all 5 RAGAS metrics in a responsive grid.
 *
 * Props:
 *   scores — { faithfulness, answer_relevancy, context_precision, context_recall, answer_correctness }
 */
const METRICS = [
  { key: "faithfulness",       label: "Faithfulness" },
  { key: "answer_relevancy",   label: "Answer Relevancy" },
  { key: "context_precision",  label: "Context Precision" },
  { key: "context_recall",     label: "Context Recall" },
  { key: "answer_correctness", label: "Answer Correctness" },
];

export function ScoreCardGrid({ scores }) {
  if (!scores) return null;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      gap: 10,
    }}>
      {METRICS.map(({ key, label }) => (
        <ScoreCard key={key} label={label} value={scores[key]} />
      ))}
    </div>
  );
}