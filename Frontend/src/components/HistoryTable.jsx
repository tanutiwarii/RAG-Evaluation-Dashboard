/**
 * HistoryTable.jsx
 *
 * Renders a table of past evaluation runs.
 * Clicking a row fires onSelect(run).
 *
 * Props:
 *   runs       — array of eval run objects from GET /api/evaluate/history
 *   selected   — currently selected run (or null)
 *   onSelect   — callback(run)
 */

function pillColor(v) {
  if (v >= 0.8) return { bg: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", border: "color-mix(in srgb, var(--green) 30%, transparent)" };
  if (v >= 0.6) return { bg: "color-mix(in srgb, var(--amber) 12%, transparent)", color: "var(--amber)", border: "color-mix(in srgb, var(--amber) 30%, transparent)" };
  return           { bg: "color-mix(in srgb, var(--red) 12%, transparent)",   color: "var(--red)",   border: "color-mix(in srgb, var(--red) 30%, transparent)"   };
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("en", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function HistoryTable({ runs = [], selected, onSelect }) {
  if (runs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--text3)", fontSize: 13 }}>
        <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>📋</div>
        No evaluation runs yet. Run a batch eval to populate history.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          {["Pipeline", "Overall", "Latency", "Date", ""].map(h => (
            <th key={h} style={{
              textAlign: "left", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--text3)", padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {runs.map(run => {
          const pill = pillColor(run.overall_score);
          const isSelected = selected?.job_id === run.job_id;
          return (
            <tr
              key={run.job_id}
              onClick={() => onSelect(run)}
              style={{
                cursor: "pointer",
                background: isSelected ? "var(--bg3)" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                  {run.pipeline_name}
                </span>
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{
                  display: "inline-block", fontSize: 11,
                  padding: "2px 8px", borderRadius: 4,
                  fontFamily: "var(--mono)", fontWeight: 500,
                  background: pill.bg, color: pill.color,
                  border: `1px solid ${pill.border}`,
                }}>
                  {(run.overall_score * 100).toFixed(1)}%
                </span>
              </td>
              <td style={{
                padding: "10px 12px", borderBottom: "1px solid var(--border)",
                fontFamily: "var(--mono)", fontSize: 12, color: "var(--text3)",
              }}>
                {(run.total_latency_ms / 1000).toFixed(1)}s
              </td>
              <td style={{
                padding: "10px 12px", borderBottom: "1px solid var(--border)",
                fontSize: 12, color: "var(--text3)",
              }}>
                {formatDate(run.completed_at)}
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>
                  {isSelected ? "▲ open" : "▶ view"}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}