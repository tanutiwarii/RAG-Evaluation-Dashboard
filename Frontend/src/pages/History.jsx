import { useEffect, useState } from "react";

import axios from "axios";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";


function History() {

  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    fetchHistory();

  }, []);


  const fetchHistory = async () => {

    try {

      const response = await axios.get(
        "http://127.0.0.1:8000/evaluations"
      );

      setHistory(response.data);

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);
    }
  };


  return (

    <div>

      <h1 className="text-5xl font-bold mb-4">
        Evaluation History
      </h1>

      <p className="text-slate-400 mb-8">
        Track previous RAG evaluation runs and metric trends.
      </p>


      {loading ? (

        <div className="text-slate-400">
          Loading history...
        </div>

      ) : (

        <>

          {/* Metrics Trend Chart */}

          <div className="bg-slate-800 p-6 rounded-xl shadow-lg mb-8">

            <h2 className="text-2xl font-semibold mb-6">
              Latency Trend
            </h2>

            <ResponsiveContainer
              width="100%"
              height={350}
            >

              <LineChart data={history}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="id" />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>


          {/* Evaluation Cards */}

          <div className="space-y-6">

            {history.map((item) => (

              <div
                key={item.id}
                className="bg-slate-800 p-6 rounded-xl shadow-lg"
              >

                <div className="flex justify-between items-start mb-4">

                  <div>

                    <h2 className="text-2xl font-semibold mb-2">
                      {item.question}
                    </h2>

                    <p className="text-slate-400">
                      Evaluation ID:
                      {" "}
                      {item.id}
                    </p>

                  </div>

                </div>


                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

                  <div className="bg-slate-700 p-4 rounded-lg">

                    <p className="text-slate-400 text-sm mb-2">
                      Faithfulness
                    </p>

                    <p className="text-3xl font-bold">
                      {item.faithfulness}
                    </p>

                  </div>

                  <div className="bg-slate-700 p-4 rounded-lg">

                    <p className="text-slate-400 text-sm mb-2">
                      Relevancy
                    </p>

                    <p className="text-3xl font-bold">
                      {item.answer_relevancy}
                    </p>

                  </div>

                  <div className="bg-slate-700 p-4 rounded-lg">

                    <p className="text-slate-400 text-sm mb-2">
                      Context Utilization
                    </p>

                    <p className="text-3xl font-bold">
                      {item.context_utilization}
                    </p>

                  </div>

                  <div className="bg-slate-700 p-4 rounded-lg">

                    <p className="text-slate-400 text-sm mb-2">
                      Latency
                    </p>

                    <p className="text-3xl font-bold">
                      {item.latency}s
                    </p>

                  </div>

                </div>


                <div className="bg-slate-700 p-5 rounded-lg">

                  <h3 className="text-xl font-semibold mb-3">
                    Answer
                  </h3>

                  <p className="text-slate-200 whitespace-pre-wrap">
                    {item.answer}
                  </p>

                </div>

              </div>

            ))}

          </div>

        </>

      )}

    </div>
  );
}


export default History;