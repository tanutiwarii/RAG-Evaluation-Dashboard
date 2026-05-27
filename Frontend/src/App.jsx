import { useState, useEffect } from "react";

import axios from "axios";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";


function App() {

  const [question, setQuestion] = useState("");

  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);


  useEffect(() => {


    fetchEvaluations();

    const interval = setInterval(() => {

      fetchEvaluations();

    }, 5000);

    return () => clearInterval(interval);


  }, []);


  const fetchEvaluations = async () => {

    try {

      const response = await axios.get(
        "http://127.0.0.1:8000/evaluations"
      );

      setHistory(response.data);

    } catch (error) {

      console.error(error);
    }
  };


  const askQuestion = async () => {

    if (!question) return;

    try {

      setLoading(true);

      const response = await axios.post(
        "http://127.0.0.1:8000/ask",
        {
          question
        }
      );

      setResult(response.data);

      await fetchEvaluations();

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);
    }
  };


  return (

    <div className="min-h-screen p-8 bg-slate-950 text-white">

      <h1 className="text-5xl font-bold mb-10">
        LLM Quality Monitor
      </h1>


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
          {loading ? "Loading..." : "Evaluate"}
        </button>

      </div>


      {result && (

        <div className="space-y-8">


          {/* Answer */}

          <div className="bg-slate-800 p-6 rounded-xl shadow-lg">

            <h2 className="text-2xl font-semibold mb-4">
              Answer
            </h2>

            <p className="text-lg">
              {result.answer}
            </p>

          </div>


          {/* Metrics */}

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


          {/* Latency Trend */}

          <div className="bg-slate-800 p-6 rounded-xl shadow-lg">

            <h2 className="text-2xl font-semibold mb-6">
              Latency Trend
            </h2>

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <LineChart data={history}>

                <XAxis dataKey="id" />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="latency"
                />

              </LineChart>

            </ResponsiveContainer>

          </div>


          {/* Contexts */}

          <div className="bg-slate-800 p-6 rounded-xl shadow-lg">

            <h2 className="text-2xl font-semibold mb-4">
              Retrieved Contexts
            </h2>

            {result.contexts.map((context, index) => (

              <div
                key={index}
                className="mb-4 p-4 bg-slate-700 rounded-lg"
              >

                {context}

              </div>

            ))}

          </div>


          {/* History */}

          <div className="bg-slate-800 p-6 rounded-xl shadow-lg">

            <h2 className="text-2xl font-semibold mb-4">
              Evaluation History
            </h2>

            <div className="space-y-4">

              {history.map((item, index) => (

                <div
                  key={index}
                  className="bg-slate-700 p-4 rounded-lg"
                >

                  <p className="font-semibold text-lg">
                    {item.question}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {new Date(item.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata"
                    })}
                  </p>

                  <div className="flex flex-wrap gap-6 mt-3 text-sm">

                    <span>
                      Faithfulness:
                      {" "}
                      {item.faithfulness}
                    </span>

                    <span>
                      Relevancy:
                      {" "}
                      {item.answer_relevancy}
                    </span>

                    <span>
                      Context:
                      {" "}
                      {item.context_utilization}
                    </span>

                    <span>
                      Latency:
                      {" "}
                      {item.latency}s
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


function MetricCard({ title, value }) {

  return (

    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">

      <h3 className="text-lg mb-3 text-slate-300">
        {title}
      </h3>

      <p className="text-4xl font-bold">
        {value}
      </p>

    </div>
  );
}


export default App;