import { useState, useEffect } from "react";
import { EvaluatePage } from "./pages/Evaluate";
import { HistoryPage }  from "./pages/History";
import { UploadPage }   from "./pages/Upload";
import { ChunkingLabPage } from "./pages/ChunkingLab";
import { checkHealth }  from "./api";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0a0a0f;
    --bg2:       #111118;
    --bg3:       #1a1a24;
    --border:    #2a2a38;
    --border2:   #383850;
    --text:      #e8e8f0;
    --text2:     #9090a8;
    --text3:     #5a5a72;
    --accent:    #7c6cfc;
    --accent2:   #a08cff;
    --green:     #3ef08a;
    --amber:     #f0c43e;
    --red:       #f06060;
    --cyan:      #3ee8f0;
    --font:      'Syne', sans-serif;
    --mono:      'JetBrains Mono', monospace;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    -webkit-font-smoothing: antialiased;
  }

  input, textarea, button { font-family: var(--font); }

  input, textarea {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 13px;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus, textarea:focus { border-color: var(--accent); }
  textarea { resize: vertical; }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
`;

const PAGES = [
  { id: "evaluate", label: "Evaluate",     icon: "⚡" },
  { id: "chunking", label: "Chunking Lab", icon: "🧪" },
  { id: "history",  label: "History",      icon: "📊" },
  { id: "upload",   label: "Upload",       icon: "📄" },
];

const STACK_PILLS = ["RAGAS", "LangChain", "ChromaDB", "FastAPI", "LangSmith", "MLflow"];

export default function App() {
  const [page, setPage]               = useState("evaluate");
  const [globalStatus, setGlobalStatus] = useState("idle");
  const [backendOk, setBackendOk]     = useState(null); // null=checking, true, false

  // Health-check on mount
  useEffect(() => {
    checkHealth()
      .then(ok => setBackendOk(ok))
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "56px 1fr",
        gridTemplateColumns: "220px 1fr",
      }}>

        {/* ── Header ── */}
        <header style={{
          gridColumn: "1 / -1",
          display: "flex", alignItems: "center", gap: 14,
          padding: "0 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>
            RAG<span style={{ color: "var(--accent2)" }}>eval</span>
          </div>
          <div style={{
            fontSize: 10, fontFamily: "var(--mono)", fontWeight: 500,
            background: "color-mix(in srgb, var(--accent) 15%, transparent)",
            color: "var(--accent2)",
            border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
            padding: "2px 8px", borderRadius: 99, letterSpacing: "0.05em",
          }}>
            v0.1.0
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {/* Backend status */}
            {backendOk !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: backendOk ? "var(--green)" : "var(--red)",
                  boxShadow: backendOk ? "0 0 8px var(--green)" : "none",
                  animation: backendOk ? "pulse 2s ease-in-out infinite" : "none",
                }} />
                {backendOk ? "api ready" : "api offline"}
              </div>
            )}
            {/* Eval status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: globalStatus === "running" ? "var(--amber)" : "var(--text3)",
                animation: globalStatus === "running" ? "pulse 1s ease-in-out infinite" : "none",
              }} />
              {globalStatus === "running" ? "evaluating..." : "ready"}
            </div>
          </div>
        </header>

        {/* ── Sidebar ── */}
        <nav style={{
          borderRight: "1px solid var(--border)",
          padding: "24px 0",
          background: "var(--bg)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <div style={{ padding: "0 16px", marginBottom: 4 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
              color: "var(--text3)", textTransform: "uppercase",
              padding: "0 8px", marginBottom: 6,
            }}>
              Dashboard
            </div>
            {PAGES.map(p => (
              <div
                key={p.id}
                onClick={() => setPage(p.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 500,
                  color: page === p.id ? "var(--accent2)" : "var(--text2)",
                  background: page === p.id
                    ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                    : "transparent",
                  border: `1px solid ${page === p.id
                    ? "color-mix(in srgb, var(--accent) 25%, transparent)"
                    : "transparent"}`,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 15 }}>{p.icon}</span>
                {p.label}
              </div>
            ))}
          </div>

          {/* Stack pills */}
          <div style={{ padding: "20px 16px 0", marginTop: "auto" }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
              color: "var(--text3)", textTransform: "uppercase",
              padding: "0 8px", marginBottom: 10,
            }}>
              Stack
            </div>
            <div style={{ padding: "0 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STACK_PILLS.map(t => (
                <span key={t} style={{
                  fontSize: 11, fontFamily: "var(--mono)",
                  padding: "2px 8px", borderRadius: 4,
                  background: "var(--bg3)", color: "var(--text3)",
                  border: "1px solid var(--border)",
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </nav>

        {/* ── Main content ── */}
        <main style={{
          overflowY: "auto",
          padding: 28,
          background: "var(--bg)",
        }}>
          {page === "evaluate" && <EvaluatePage setGlobalStatus={setGlobalStatus} />}
          {page === "chunking" && <ChunkingLabPage setGlobalStatus={setGlobalStatus} />}
          {page === "history"  && <HistoryPage />}
          {page === "upload"   && <UploadPage />}
        </main>

      </div>
    </>
  );
}