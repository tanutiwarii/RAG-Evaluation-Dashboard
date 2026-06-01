import { useState } from "react";
import axios from "axios";

import EvalMetricGrid from "./EvalMetricGrid";
import ErrorBanner from "../common/ErrorBanner";

function SingleEvalForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [groundTruth, setGroundTruth] = useState("");
  const [contexts, setContexts] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const runSingleEval = async () => {
    if (!question || !answer || !contexts) {
      setErrorMessage("Question, answer, and contexts are required.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const contextList = contexts
        .split("\n")
        .filter((item) => item.trim() !== "");

      const response = await axios.post(
        "http://127.0.0.1:8000/evaluate/single",
        {
          question,
          answer,
          ground_truth: groundTruth,
          contexts: contextList
        }
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.response?.data?.error ||
        "Single evaluation failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="card border border-[#262638]">
        <h2 className="text-2xl font-bold mb-2">
          Single Evaluation
        </h2>

        <p className="text-slate-500 mb-6">
          Evaluate one RAG response using question, answer, contexts, and ground truth.
        </p>

        <ErrorBanner message={errorMessage} />

        <div className="space-y-5">
          <input
            type="text"
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-4 rounded-xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <textarea
            placeholder="LLM Answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="w-full p-4 rounded-xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <textarea
            placeholder="Retrieved Contexts — put each chunk on a new line"
            value={contexts}
            onChange={(e) => setContexts(e.target.value)}
            rows={5}
            className="w-full p-4 rounded-xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <textarea
            placeholder="Ground Truth Answer optional"
            value={groundTruth}
            onChange={(e) => setGroundTruth(e.target.value)}
            rows={3}
            className="w-full p-4 rounded-xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <button
            onClick={runSingleEval}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold"
          >
            {loading ? "Evaluating..." : "Run Single Evaluation"}
          </button>
        </div>
      </div>

      {!result && (
        <div className="card border border-[#262638] text-center">
          <p className="text-slate-400">
            Run an evaluation to see metrics.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <EvalMetricGrid metrics={result.metrics} />

          <div className="card border border-[#262638]">
            <h3 className="text-xl font-bold mb-4">
              Evaluation Result
            </h3>

            <p className="text-slate-400 mb-2">
              <span className="font-semibold text-white">Question:</span>{" "}
              {result.question}
            </p>

            <p className="text-slate-400 mb-2">
              <span className="font-semibold text-white">Answer:</span>{" "}
              {result.answer}
            </p>

            <p className="text-sm text-slate-400">
              <span className="font-semibold text-white">Ground Truth:</span>{" "}
              {result.ground_truth || "Not provided"}
            </p>

            {result.contexts && result.contexts.length > 0 && (
            <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">
                Retrieved Contexts
                </h4>

                <div className="space-y-3">
                {result.contexts.map((context, index) => (
                    <div
                    key={index}
                    className="bg-[#111118] border border-[#262638] rounded-lg p-3"
                    >
                    <div className="flex flex-wrap gap-2 mb-2">
                        <span className="pill">
                        Chunk #{context.chunk_id}
                        </span>

                        <span className="pill">
                        Rank #{context.rank}
                        </span>

                        <span className="pill">
                        Score: {context.score}
                        </span>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed">
                        {context.content}
                    </p>
                    </div>
                ))}
                </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SingleEvalForm;
