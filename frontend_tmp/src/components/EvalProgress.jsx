import { useRef, useEffect } from "react";

/**
 * EvalProgress
 *
 * Shows a live progress bar and scrolling event feed during batch eval.
 * Parent component feeds `events` and `progress` from SSE stream.
 *
 * Props:
 *   events   — [{ time, msg, score }]
 *   progress — { completed, total }
 */
export function EvalProgress({ events = [], progress = { completed: 0, total: 0 } }) {
  const feedRef = useRef();

  // Auto-scroll event feed to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const pct = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Progress bar */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 12, marginBottom: 6,
          color: "var(--text2)", fontFamily: "var(--mono)",
        }}>
          <span>Evaluating questions...</span>
          <span>{progress.completed}/{progress.total} ({pct}%)</span>
        </div>
        <div style={{
          height: 6, background: "var(--bg3)", borderRadius: 99, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, var(--accent), var(--cyan))",
            width: `${pct}%`, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Event feed */}
      <div ref={feedRef} style={{
        background: "var(--bg)", border: "1px solid var(--border)",
        borderRadius: 8, padding: 12,
        fontFamily: "var(--mono)", fontSize: 12,
        maxHeight: 200, overflowY: "auto",
      }}>
        {events.length === 0
          ? <span style={{ color: "var(--text3)" }}>Waiting for events...</span>
          : events.map((e, i) => (
            <div key={i} style={{
              display: "flex", gap: 10,
              padding: "3px 0", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ color: "var(--text3)", flexShrink: 0 }}>{e.time}</span>
              <span style={{ color: "var(--text2)" }}>{e.msg}</span>
              {e.score != null && (
                <span style={{ color: "var(--accent2)", marginLeft: "auto", flexShrink: 0 }}>
                  {(e.score * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}