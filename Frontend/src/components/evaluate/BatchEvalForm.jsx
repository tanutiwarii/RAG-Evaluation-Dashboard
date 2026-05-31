import { useState } from "react";
import axios from "axios";
import BatchResultsTable from "./BatchResultsTable";
import BatchProgress from "./BatchProgress";
import EvalMetricGrid from "./EvalMetricGrid";

function BatchEvalForm() {
  const [jsonInput, setJsonInput] = useState("");
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [eventFeed, setEventFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [itemCount, setItemCount] = useState(0);

  const startBatchEval = async () => {
    try {
      setLoading(true);
      setResult(null);
      setEventFeed([]);

      const parsed = JSON.parse(jsonInput);
      let normalizedData;

      if (Array.isArray(parsed)) {
        normalizedData = {
          items: parsed,
          mode: "pipeline"
        };
      } else if (parsed.items && Array.isArray(parsed.items)) {
        normalizedData = parsed;
      } else {
        alert("JSON must be an array or contain an items array.");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        "http://127.0.0.1:8000/evaluate/batch",
        normalizedData
      );

      const jobId = response.data.job_id;

      setJob({
        status: response.data.status,
        progress: 0,
        total: response.data.total,
        current_question: ""
      });

      const eventSource = new EventSource(
        `http://127.0.0.1:8000/evaluate/batch/${jobId}/stream`
      );

      eventSource.addEventListener("progress", (event) => {
        const data = JSON.parse(event.data);

        setJob(data);

        setEventFeed((prev) => [
          `Progress: ${data.progress}/${data.total} - ${data.current_question || data.status}`,
          ...prev
        ]);

        if (data.status === "completed") {
          setResult(data.result);
          eventSource.close();
          setLoading(false);
        }
      });

      eventSource.addEventListener("error", () => {
        setEventFeed((prev) => [
          "Stream error occurred.",
          ...prev
        ]);

        eventSource.close();
        setLoading(false);
      });
    } catch (error) {
      console.error(error);
      alert("Invalid JSON or batch evaluation failed.");
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.endsWith(".json")) {
      alert("Please upload a JSON file.");
      return;
    }

    const text = await file.text();

    try {
      const parsed = JSON.parse(text);

      let normalizedData;

      if (Array.isArray(parsed)) {
        normalizedData = {
          items: parsed,
          mode: "pipeline"
        };
      } else if (parsed.items && Array.isArray(parsed.items)) {
        normalizedData = parsed;
      } else {
        alert("JSON must be an array or contain an items array.");
        return;
      }

      setJsonInput(
        JSON.stringify(normalizedData, null, 2)
      );

      setFileName(file.name);
      setItemCount(normalizedData.items.length);
    } catch (error) {
      console.error(error);
      alert("Invalid JSON file.");
    }
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

          {fileName && (
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="pill">
                File: {fileName}
              </span>

              <span className="pill">
                Items: {itemCount}
              </span>
            </div>
          )}
        </div>

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
