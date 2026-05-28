import { useState } from "react";

import axios from "axios";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

import StrategyCard from "../components/StrategyCard";
import MetricProgress from "../components/MetricProgress";
import RadarComparison from "../components/RadarComparison";

function ChunkingLab() {

  const [text, setText] = useState("");

  const [question, setQuestion] = useState("");

  const [chunkSize, setChunkSize] =
    useState(100);

  const [chunkOverlap, setChunkOverlap] =
    useState(20);

  const [fixedResult, setFixedResult] =
    useState(null);

  const [recursiveResult, setRecursiveResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);


  const runComparison = async () => {

    if (!text || !question) return;

    try {

      setLoading(true);

      setFixedResult(null);

      setRecursiveResult(null);

      const fixedResponse = await axios.post(
        "http://127.0.0.1:8000/chunking/evaluate",
        {
          text,
          question,

          strategy: "fixed",

          chunk_size: Number(chunkSize),

          chunk_overlap: Number(chunkOverlap)
        }
      );

      const recursiveResponse =
        await axios.post(
          "http://127.0.0.1:8000/chunking/evaluate",
          {
            text,
            question,

            strategy: "recursive",

            chunk_size: Number(chunkSize),

            chunk_overlap: Number(chunkOverlap)
          }
        );

      setFixedResult(
        fixedResponse.data
      );

      setRecursiveResult(
        recursiveResponse.data
      );

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);
    }
  };


  const Metric = ({
    label,
    value
  }) => (

    <div className="bg-slate-700 p-4 rounded-lg">

      <p className="text-slate-400 text-sm mb-1">
        {label}
      </p>

      <p className="text-2xl font-bold">
        {value}
      </p>

    </div>
  );


  const ResultCard = ({
    title,
    result
  }) => {

    if (!result) return null;

    return (

      <div className="bg-slate-800 p-6 rounded-xl shadow-lg">

        <h2 className="text-2xl font-semibold mb-4">
          {title}
        </h2>

        <p className="text-slate-400 mb-4">
          Chunks:
          {" "}
          {result.chunk_count}
        </p>


        <div className="grid grid-cols-2 gap-4 mb-6">

          <Metric
            label="Faithfulness"
            value={result.metrics.faithfulness}
          />

          <Metric
            label="Relevancy"
            value={result.metrics.answer_relevancy}
          />

          <Metric
            label="Context Use"
            value={result.metrics.context_utilization}
          />

          <Metric
            label="Latency"
            value={`${result.metrics.latency}s`}
          />

        </div>


        <div className="bg-slate-700 p-4 rounded-lg mb-6">

          <h3 className="font-semibold mb-2">
            Answer
          </h3>

          <p>
            {result.answer}
          </p>

        </div>


        <h3 className="text-xl font-semibold mb-3">
          Retrieved Chunks
        </h3>


        <div className="space-y-3">

          {result.contexts.map((
            context,
            index
          ) => (

            <div
              key={index}
              className="bg-slate-700 p-4 rounded-lg"
            >

              <p className="text-sm text-slate-400 mb-2">

                Chunk ID:
                {" "}
                {context.chunk_id}

              </p>

              <p className="max-h-32 overflow-y-auto">
                {context.content}
              </p>

            </div>

          ))}

        </div>

      </div>
    );
  };


  const comparisonData =
    fixedResult && recursiveResult

      ? [

          {
            metric: "Faithfulness",

            Fixed:
              fixedResult.metrics.faithfulness,

            Recursive:
              recursiveResult.metrics.faithfulness
          },

          {
            metric: "Relevancy",

            Fixed:
              fixedResult.metrics.answer_relevancy,

            Recursive:
              recursiveResult.metrics.answer_relevancy
          },

          {
            metric: "Context",

            Fixed:
              fixedResult.metrics.context_utilization,

            Recursive:
              recursiveResult.metrics.context_utilization
          },

          {
            metric: "Latency",

            Fixed:
              fixedResult.metrics.latency,

            Recursive:
              recursiveResult.metrics.latency
          }

        ]

      : [];
  const calculateOverallScore = (result) => {
    if (!result) return 0;

    return (
      result.metrics.faithfulness +
      result.metrics.answer_relevancy +
      result.metrics.context_utilization
    ) / 3;
  };

  const getWinner = () => {

    if (
      !fixedResult ||
      !recursiveResult
    ) return null;

    const fixedScore =

      fixedResult.metrics.faithfulness +

      fixedResult.metrics.answer_relevancy +

      fixedResult.metrics.context_utilization -

      fixedResult.metrics.latency * 0.05;


    const recursiveScore =

      recursiveResult.metrics.faithfulness +

      recursiveResult.metrics.answer_relevancy +

      recursiveResult.metrics.context_utilization -

      recursiveResult.metrics.latency * 0.05;


    return recursiveScore >= fixedScore

      ? "Recursive Chunking"

      : "Fixed Chunking";
  };


  return (

    <div>

      <h1 className="text-5xl font-bold mb-4">
        Chunking Lab
      </h1>

      <p className="text-slate-400 mb-8">

        Compare fixed and recursive chunking
        strategies using real RAG evaluation.

      </p>


      <div className="bg-slate-800 p-6 rounded-xl shadow-lg mb-8">

        <textarea
          placeholder="Paste document text here..."
          className="w-full h-48 p-4 rounded-lg text-black mb-4"

          value={text}

          onChange={(e) =>
            setText(e.target.value)
          }
        />


        <input
          type="text"

          placeholder="Evaluation question..."

          className="w-full p-4 rounded-lg text-black mb-4"

          value={question}

          onChange={(e) =>
            setQuestion(e.target.value)
          }
        />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          <input
            type="number"

            className="p-4 rounded-lg text-black"

            value={chunkSize}

            onChange={(e) =>
              setChunkSize(e.target.value)
            }

            placeholder="Chunk size"
          />


          <input
            type="number"

            className="p-4 rounded-lg text-black"

            value={chunkOverlap}

            onChange={(e) =>
              setChunkOverlap(e.target.value)
            }

            placeholder="Chunk overlap"
          />

        </div>


        <button
          onClick={runComparison}

          className="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-lg font-semibold"
        >

          {loading
            ? "Running Comparison..."
            : "Run Comparison"}

        </button>

      </div>


      {fixedResult && recursiveResult && (

        <>

          {/* Winner Card */}

          <div className="bg-violet-600 p-6 rounded-xl shadow-lg mb-8">

            <h2 className="text-2xl font-bold mb-2">

              Best Strategy:
              {" "}
              {getWinner()}

            </h2>

            <p className="text-violet-100">

              Based on faithfulness,
              relevancy,
              context utilization,
              and latency.

            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StrategyCard
              name="fixed"
              score={calculateOverallScore(fixedResult)}
              chunkCount={fixedResult.chunk_count}
              latency={fixedResult.metrics.latency}
              color="red"
            />

            <StrategyCard
              name="recursive"
              score={calculateOverallScore(recursiveResult)}
              chunkCount={recursiveResult.chunk_count}
              latency={recursiveResult.metrics.latency}
              color="violet"
            />
          </div>
          {/* Comparison Chart */}

          <div className="bg-slate-800 p-6 rounded-xl shadow-lg mb-8">

            <h2 className="text-2xl font-semibold mb-6">
              Strategy Comparison
            </h2>

            <ResponsiveContainer
              width="100%"
              height={350}
            >

              <BarChart data={comparisonData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="metric" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="Fixed"
                  fill="#ef4444"
                />

                <Bar
                  dataKey="Recursive"
                  fill="#8b5cf6"
                />

              </BarChart>

            </ResponsiveContainer>

          </div>
          <div className="mb-8">
            <RadarComparison
              fixed={fixedResult.metrics}
              recursive={recursiveResult.metrics}
            />
          </div>

          <div className="mb-8">
            <MetricProgress
              fixed={fixedResult.metrics}
              recursive={recursiveResult.metrics}
            />
          </div>
          {/* Result Cards */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

            <ResultCard
              title="Fixed Chunking"
              result={fixedResult}
            />

            <ResultCard
              title="Recursive Chunking"
              result={recursiveResult}
            />

          </div>

        </>

      )}

    </div>
  );
}


export default ChunkingLab;