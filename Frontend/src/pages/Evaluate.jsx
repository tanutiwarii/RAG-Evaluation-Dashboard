import { useState } from "react";
import axios from "axios";

import MetricCard from "../components/MetricCard";

function Evaluate() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question) return;

    try {
      setLoading(true);

      setResult({
        question,
        answer: "",
        contexts: [],
        metrics: {}
      });

      const response = await fetch("http://127.0.0.1:8000/ask-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let streamedText = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        streamedText += decoder.decode(value);

        setResult((prev) => ({
          ...prev,
          answer: streamedText
        }));
      }

      const finalResponse = await axios.post("http://127.0.0.1:8000/ask", {
        question
      });

      setResult((prev) => ({
        ...prev,
        question: finalResponse.data.question,
        contexts: finalResponse.data.contexts,
        metrics: finalResponse.data.metrics
      }));

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-5xl font-bold mb-4">
        Evaluate Pipeline
      </h1>

      <p className="text-slate-400 mb-8">
        Ask questions, stream answers, inspect retrieved contexts, and evaluate quality.
      </p>

      <div className="flex gap-4 mb-10">
        <input
          type="text"
          placeholder="Ask a question..."
          className="flex-1 p-4 rounded-lg text-black"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button
          onClick={askQuestion}
          className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold"
        >
          {loading ? "Evaluating..." : "Evaluate"}
        </button>
      </div>

      {result && (
        <div className="space-y-8">
          <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              Answer
            </h2>

            <p className="text-lg whitespace-pre-wrap">
              {result.answer}
            </p>
          </div>

          {result.metrics && Object.keys(result.metrics).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Faithfulness"
                value={result.metrics.faithfulness}
              />

              <MetricCard
                title="Answer Relevancy"
                value={result.metrics.answer_relevancy}
              />

              <MetricCard
                title="Context Utilization"
                value={result.metrics.context_utilization}
              />

              <MetricCard
                title="Latency"
                value={`${result.metrics.latency}s`}
              />
            </div>
          )}

          {result.contexts && result.contexts.length > 0 && (
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">
                Retrieved Contexts
              </h2>

              {result.contexts.map((context, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 bg-slate-700 rounded-lg"
                >
                  <div className="flex justify-between mb-2 text-sm text-slate-400">
                    <span>
                      Source: {context.source}
                    </span>

                    <span>
                      Chunk ID: {context.chunk_id}
                    </span>

                    <span>
                      Score: {context.score}
                    </span>
                  </div>

                  <p className="max-h-32 overflow-y-auto">
                    {context.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Evaluate;