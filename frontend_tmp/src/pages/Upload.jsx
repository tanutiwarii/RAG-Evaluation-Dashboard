import { useState } from "react";

/**
 * Upload page
 *
 * - Drag-and-drop PDF upload
 * - Ingest & chunk button (calls POST /api/ingest — wire up when backend is ready)
 * - Test dataset editor (saves questions as eval/test_dataset.json via API)
 */
export function UploadPage() {
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState(null);
  const [questions, setQuestions] = useState(
    "What is retrieval-augmented generation?\n" +
    "What are the main components of a RAG pipeline?\n" +
    "How does RAGAS measure faithfulness?\n" +
    "What is the difference between a bi-encoder and a cross-encoder?\n" +
    "What is BM25 and why is it used in hybrid search?"
  );

  const addFiles = (incoming) => {
    const pdfs = Array.from(incoming).filter(f => f.type === "application/pdf");
    if (pdfs.length !== incoming.length) {
      alert("Only PDF files are supported.");
    }
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...pdfs.filter(f => !names.has(f.name))];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleIngest = async () => {
    if (files.length === 0) return;
    setIngesting(true); setIngestMsg(null);

    // TODO: replace with real API call when backend /api/ingest is wired
    // const form = new FormData();
    // files.forEach(f => form.append("files", f));
    // await fetch("/api/ingest", { method: "POST", body: form });

    await new Promise(r => setTimeout(r, 1200)); // demo delay
    setIngestMsg(`✓ ${files.length} file(s) ingested and chunked successfully.`);
    setIngesting(false);
  };

  const handleSaveDataset = async () => {
    // TODO: POST questions to /api/dataset/save
    // await fetch("/api/dataset/save", { method: "POST", body: JSON.stringify({ questions: questions.split("\n").filter(Boolean) }) });
    alert("Dataset saved (connect to /api/dataset/save when backend is ready).");
  };

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
        Upload Documents
      </div>
      <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
        Add PDFs to build your RAG pipeline and define your test dataset
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Left: upload */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("pdf-input").click()}
            style={{
              border: `2px dashed ${drag ? "var(--accent)" : "var(--border2)"}`,
              borderRadius: 14, padding: 48,
              textAlign: "center", cursor: "pointer",
              background: drag
                ? "color-mix(in srgb, var(--accent) 5%, var(--bg2))"
                : "var(--bg2)",
              transition: "all 0.2s",
            }}
          >
            <input
              id="pdf-input" type="file" accept=".pdf" multiple hidden
              onChange={e => addFiles(e.target.files)}
            />
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              Drop PDFs here or click to browse
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              Supported: PDF • Max 50 MB per file
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 14, padding: 16,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--text3)", marginBottom: 12,
              }}>
                Files ({files.length})
              </div>

              {files.map(f => (
                <div key={f.name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
                }}>
                  <span>📄 {f.name}</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => removeFile(f.name)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text3)", fontSize: 14, padding: 0,
                      }}
                    >✕</button>
                  </div>
                </div>
              ))}

              {ingestMsg && (
                <div style={{
                  marginTop: 10, fontSize: 12, color: "var(--green)",
                  fontFamily: "var(--mono)",
                }}>
                  {ingestMsg}
                </div>
              )}

              <button
                onClick={handleIngest}
                disabled={ingesting}
                style={{
                  marginTop: 14, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "9px 18px", borderRadius: 8,
                  background: "var(--accent)", color: "#fff",
                  border: "none", cursor: ingesting ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 600, fontFamily: "var(--font)",
                  opacity: ingesting ? 0.6 : 1,
                }}
              >
                {ingesting
                  ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Ingesting...</>
                  : "⚙ Ingest & chunk documents"
                }
              </button>
            </div>
          )}
        </div>

        {/* Right: test dataset editor */}
        <div style={{
          background: "var(--bg2)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 20,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--text3)", marginBottom: 12,
          }}>
            Test dataset
          </div>
          <div style={{
            fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.7,
          }}>
            One question per line. These are saved as{" "}
            <code style={{ fontFamily: "var(--mono)", color: "var(--text2)", background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>
              eval/test_dataset.json
            </code>{" "}
            and used for all evaluation runs. Add ground truth answers via the JSON file directly.
          </div>
          <textarea
            value={questions}
            onChange={e => setQuestions(e.target.value)}
            rows={12}
            style={{
              width: "100%", background: "var(--bg3)",
              border: "1px solid var(--border2)", borderRadius: 8,
              padding: "10px 12px", color: "var(--text)",
              fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.8,
              outline: "none", resize: "vertical",
            }}
          />
          <div style={{
            fontSize: 11, color: "var(--text3)", margin: "8px 0 12px",
          }}>
            {questions.split("\n").filter(Boolean).length} questions
          </div>
          <button
            onClick={handleSaveDataset}
            style={{
              padding: "8px 16px", borderRadius: 8,
              background: "transparent", color: "var(--text2)",
              border: "1px solid var(--border2)", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "var(--font)",
            }}
          >
            💾 Save test dataset
          </button>
        </div>
      </div>
    </div>
  );
}