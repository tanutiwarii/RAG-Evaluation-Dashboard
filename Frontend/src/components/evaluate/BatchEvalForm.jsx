import { useState } from "react";
import axios from "axios";
import BatchResultsTable from "./BatchResultsTable";
import BatchProgress from "./BatchProgress";
import EvalMetricGrid from "./EvalMetricGrid";
import ErrorBanner from "../common/ErrorBanner";
import { API_URL } from "../../config";

function BatchEvalForm() {
  const [jsonInput, setJsonInput] = useState("");
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [eventFeed, setEventFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [itemCount, setItemCount] = useState(0);
  const [evalMode, setEvalMode] = useState("");
  const [eventSource, setEventSource] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizeBatchData = (parsed) => {
    let data;

    if (Array.isArray(parsed)) {
      data = {
        items: parsed,
        mode: "pipeline"
      };
    } else {
      data = parsed;
    }

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error(
        "JSON must contain an items array."
      );
    }

    if (data.mode === "pipeline") {
      data.items.forEach((item) => {
        if (!item.question) {
          throw new Error(
            "Every pipeline item requires a question."
          );
        }
      });
    } else {
      data.items.forEach((item) => {
        if (
          !item.question ||
          !item.answer ||
          !item.contexts
        ) {
          throw new Error(
            "Manual evaluation items require question, answer and contexts."
          );
        }
      });
    }

    return data;
  };

  const startBatchEval = async () => {
    try {
      setLoading(true);
      setResult(null);
      setEventFeed([]);
      setErrorMessage("");

      const parsed = JSON.parse(jsonInput);
      const normalizedData = normalizeBatchData(parsed);

      setEvalMode(normalizedData.mode || "manual");

      const response = await axios.post(
        `${API_URL}/evaluate/batch`,
        normalizedData
      );

      const jobId = response.data.job_id;

      setJob({
        status: response.data.status,
        progress: 0,
        total: response.data.total,
        current_question: ""
      });

      const source = new EventSource(
        `${API_URL}/evaluate/batch/${jobId}/stream`
      );

      setEventSource(source);

      source.addEventListener("progress", (event) => {
        const data = JSON.parse(event.data);

        setJob(data);

        setEventFeed((prev) => [
          `Progress: ${data.progress}/${data.total} - ${data.current_question || data.status}`,
          ...prev
        ]);

        if (data.status === "completed") {
          setResult(data.result);
          source.close();
          setEventSource(null);
          setLoading(false);
        }
      });

      source.addEventListener("error", () => {
        setEventFeed((prev) => [
          "Stream error occurred.",
          ...prev
        ]);

        source.close();
        setEventSource(null);
        setLoading(false);
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.response?.data?.error ||
        error.message ||
        "Invalid JSON or batch evaluation failed."
      );
      setLoading(false);
    }
  };

  const cancelBatchEval = () => {
    if (eventSource) {
      eventSource.close();
    }

    setEventSource(null);
    setLoading(false);
    setJob(null);
    setEventFeed((prev) => [
      "Batch evaluation cancelled by user.",
      ...prev
    ]);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setErrorMessage("");

    if (!file.name.endsWith(".json")) {
      setErrorMessage("Please upload a JSON file.");
      return;
    }

    const text = await file.text();

    try {
      const parsed = JSON.parse(text);
      const normalizedData = normalizeBatchData(parsed);

      setEvalMode(normalizedData.mode || "manual");

      setJsonInput(
        JSON.stringify(normalizedData, null, 2)
      );

      setFileName(file.name);
      setItemCount(normalizedData.items.length);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Invalid JSON file.");
    }
  };

  const downloadSampleDataset = () => {
    const sample = [
      {
        question: "What is retrieval-augmented generation?",
        ground_truth:
          "Retrieval-augmented generation (RAG) is a technique that combines a retrieval system with a large language model. The retriever fetches relevant documents from an external knowledge base, and the LLM uses those documents as context to generate accurate, grounded answers."
      },
      {
        question: "What are the main components of a RAG pipeline?",
        ground_truth:
          "A RAG pipeline consists of five main components: a document loader, a text splitter for chunking, an embedding model, a vector database for storage and retrieval, and a language model for answer generation."
      },
      {
        question: "What is the difference between a bi-encoder and a cross-encoder?",
        ground_truth:
          "A bi-encoder encodes the query and document independently into separate embeddings and compares them via dot product or cosine similarity. A cross-encoder processes the query and document together as a single input, allowing the model to capture fine-grained token-level interactions, making it more accurate but slower."
      },
      {
        question: "What is BM25 and why is it used in hybrid search?",
        ground_truth:
          "BM25 (Best Match 25) is a probabilistic keyword-based ranking algorithm that scores documents based on term frequency, inverse document frequency, and document length normalization. It is used in hybrid search because it excels at exact keyword matches that semantic vector search may miss."
      },
      {
        question: "How does RAGAS measure faithfulness?",
        ground_truth:
          "RAGAS measures faithfulness by checking whether each claim in the generated answer can be inferred from the provided context documents. It decomposes the answer into individual statements and verifies each statement against the retrieved context using an LLM judge."
      },
      {
        question: "What is context precision in RAGAS?",
        ground_truth:
          "Context precision measures the proportion of retrieved context chunks that are actually relevant to answering the question. A high context precision means the retriever returned mostly useful chunks with little noise."
      },
      {
        question: "What is context recall in RAGAS?",
        ground_truth:
          "Context recall measures how much of the information needed to produce the ground truth answer is present in the retrieved context. A high context recall means the retriever captured all the relevant information from the knowledge base."
      },
      {
        question: "What is semantic chunking and how does it differ from fixed-size chunking?",
        ground_truth:
          "Semantic chunking groups sentences based on embedding similarity, inserting chunk boundaries only when the meaning shifts significantly. Fixed-size chunking splits text at fixed token intervals regardless of meaning, which can cut mid-sentence and disrupt coherent ideas."
      },
      {
        question: "What is Reciprocal Rank Fusion?",
        ground_truth:
          "Reciprocal Rank Fusion (RRF) is a technique for combining rankings from multiple retrieval systems. It assigns each document a score of 1/(k + rank) where k is a smoothing constant (typically 60) and rank is the document's position in each list. Documents that rank highly in multiple lists receive the highest combined scores."
      },
      {
        question: "Why should the LLM temperature be set to 0 during RAG evaluation?",
        ground_truth:
          "Setting temperature to 0 makes the LLM deterministic, producing the same answer for the same input every time. This is critical for evaluation because it ensures that differences in RAGAS scores across runs reflect changes in the retrieval pipeline rather than random variation in generation."
      }
    ];

    const blob = new Blob(
      [JSON.stringify(sample, null, 2)],
      {
        type: "application/json"
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_test_dataset.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportBatchResults = () => {
    if (!result) {
      setErrorMessage("No batch results to export.");
      return;
    }

    const blob = new Blob(
      [JSON.stringify(result, null, 2)],
      {
        type: "application/json"
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "batch_evaluation_results.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportBatchResultsCSV = () => {
    if (!result?.results?.length) {
      setErrorMessage("No batch results to export.");
      return;
    }

    const headers = [
      "index",
      "question",
      "answer",
      "ground_truth",
      "faithfulness",
      "answer_relevancy",
      "context_precision",
      "context_recall",
      "answer_correctness",
      "latency"
    ];

    const rows = result.results.map((item) => [
      item.index,
      item.question,
      item.answer,
      item.ground_truth,
      item.metrics.faithfulness,
      item.metrics.answer_relevancy,
      item.metrics.context_precision,
      item.metrics.context_recall,
      item.metrics.answer_correctness,
      item.metrics.latency
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value || "").replaceAll('"', '""')}"`)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "batch_evaluation_results.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="card border border-[#262638]">
        <h2 className="text-2xl font-bold mb-2">
          Batch Evaluation
        </h2>

        <p className="text-slate-500 mb-6">
          Paste a test dataset JSON and evaluate multiple RAG responses with live progress.
        </p>

        <ErrorBanner message={errorMessage} />

        <div className="bg-[#111118] border border-[#262638] rounded-xl p-5 mb-5">
          <label className="block text-sm text-slate-400 mb-3">
            Upload test_dataset.json
          </label>

          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white hover:file:bg-violet-700"
          />

          <button
            onClick={downloadSampleDataset}
            className="mt-4 px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
          >
            Download Sample Dataset
          </button>

          {fileName && (
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="pill">
                File: {fileName}
              </span>

              <span className="pill">
                Items: {itemCount}
              </span>

              {evalMode && (
                <span className="pill">
                  Mode: {evalMode === "pipeline" ? "Pipeline Evaluation" : "Manual Evaluation"}
                </span>
              )}
            </div>
          )}
        </div>

        {!jsonInput && (
          <div className="card border border-[#262638] text-center mb-5">
            <p className="text-slate-400">
              Upload a dataset to begin.
            </p>
          </div>
        )}

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          rows={14}
          placeholder='{"items":[{"question":"...","answer":"...","ground_truth":"...","contexts":["..."]}]}'
          className="w-full p-4 rounded-xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm"
        />

        <button
          onClick={startBatchEval}
          disabled={loading || !jsonInput}
          className="mt-5 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold"
        >
          {loading ? "Running Batch..." : "Start Batch Evaluation"}
        </button>

        {loading && (
          <button
            onClick={cancelBatchEval}
            className="mt-5 ml-3 px-6 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold"
          >
            Cancel
          </button>
        )}
      </div>

      <BatchProgress job={job} />

      {eventFeed.length > 0 && (
        <div className="card border border-[#262638]">
          <h3 className="text-xl font-bold mb-4">
            Live Event Feed
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {eventFeed.map((event, index) => (
              <div
                key={index}
                className="text-sm text-slate-400 bg-[#111118] border border-[#262638] rounded-lg p-3"
              >
                {event}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <EvalMetricGrid metrics={result.aggregate_metrics} />
          <BatchResultsTable results={result.results} />

          <div className="card border border-[#262638]">
            <h3 className="text-xl font-bold mb-4">
              Batch Result
            </h3>

            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Evaluated {result.count} items successfully.
              </p>

              <button
                onClick={exportBatchResults}
                className="mt-4 px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
              >
                Export Batch Results
              </button>

              <button
                onClick={exportBatchResultsCSV}
                className="mt-4 ml-3 px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
              >
                Export CSV
              </button>

              {result.results?.map((item) => (
                <div
                  key={item.index}
                  className="bg-[#111118] border border-[#262638] rounded-lg p-4"
                >
                  <h4 className="font-semibold mb-2">
                    {item.question}
                  </h4>

                  <p className="text-sm text-slate-400 mb-2">
                    {item.answer}
                  </p>

                  <div className="flex gap-4 text-xs">
                    <span>
                      Faithfulness: {item.metrics.faithfulness}
                    </span>

                    <span>
                      Correctness: {item.metrics.answer_correctness}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchEvalForm;
