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

import StrategyCard from "../components/common/StrategyCard";
import MetricProgress from "../components/common/MetricProgress";
import RadarComparison from "../components/common/RadarComparison";
import MetricInfo from "../components/common/MetricInfo";
import ChunkViewer from "../components/chunking/ChunkViewer";
import { API_URL } from "../config";

function ChunkingLab() {
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [chunkSize, setChunkSize] = useState(100);
  const [chunkOverlap, setChunkOverlap] = useState(20);

  const [fixedResult, setFixedResult] = useState(null);
  const [recursiveResult, setRecursiveResult] = useState(null);
  const [semanticResult, setSemanticResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  const [groundTruth, setGroundTruth] = useState("");

  const addEvent = (message) => {
    setEvents((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        message
      }
    ]);
  };

  const runComparison = async () => {
    if (!text || !question) return;

    try {
      setLoading(true);
      setEvents([]);
      setFixedResult(null);
      setRecursiveResult(null);
      setSemanticResult(null);

      addEvent("Starting chunking comparison...");

      const response = await axios.post(
        `${API_URL}/chunking/compare`,
        {
          text,
          question,
          ground_truth:groundTruth,
          chunk_size: Number(chunkSize),
          chunk_overlap: Number(chunkOverlap)
        }
      );

      addEvent("Fixed chunking completed.");
      addEvent("Recursive chunking completed.");
      addEvent("Semantic chunking completed.");

      setFixedResult(response.data.fixed);
      setRecursiveResult(response.data.recursive);
      setSemanticResult(response.data.semantic);

      addEvent(`Winner selected: ${response.data.winner}`);

      addEvent("Evaluation pipeline finished.");

      
    } catch (error) {
      console.error(error);
      addEvent("Comparison failed. Check backend or console.");
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = (result) => {
    if (!result) return 0;

    return (
      result.metrics.faithfulness +
      result.metrics.answer_relevancy +
      result.metrics.context_precision +
      result.metrics.context_recall +
      result.metrics.answer_correctness
    ) / 5;
  };

  const getWinner = () => {
    if (!fixedResult || !recursiveResult || !semanticResult) return null;

    const score = (result) =>
      result.metrics.faithfulness +
      result.metrics.answer_relevancy +
      result.metrics.context_precision +
      result.metrics.context_recall +
      result.metrics.answer_correctness -
      result.metrics.latency * 0.05;

    const scores = [
      { name: "Fixed Chunking", value: score(fixedResult) },
      { name: "Recursive Chunking", value: score(recursiveResult) },
      { name: "Semantic Chunking", value: score(semanticResult) }
    ];

    return scores.sort((a, b) => b.value - a.value)[0].name;
  };

  const loadDemoData = () => {
    setText(
      "DBMS stands for Database Management System. It helps users store, retrieve, update, and manage data. A database is an organized collection of data. SQL is used to communicate with relational databases. Tables store data in rows and columns. Fields are columns and records are rows. Constraints define rules for data. Normalization reduces redundancy. Transactions follow ACID properties. Indexes improve search performance."
    );

    setQuestion("What are tables and fields?");
  };

  const comparisonData =
    fixedResult && recursiveResult && semanticResult
      ? [
          {
            metric: "F",
            Fixed: fixedResult.metrics.faithfulness,
            Recursive: recursiveResult.metrics.faithfulness,
            Semantic: semanticResult.metrics.faithfulness
          },
          {
            metric: "AR",
            Fixed: fixedResult.metrics.answer_relevancy,
            Recursive: recursiveResult.metrics.answer_relevancy,
            Semantic: semanticResult.metrics.answer_relevancy
          },
          {
            metric: "CP",
            Fixed: fixedResult.metrics.context_precision,
            Recursive: recursiveResult.metrics.context_precision,
            Semantic: semanticResult.metrics.context_precision
          },
          {
            metric: "CR",
            Fixed: fixedResult.metrics.context_recall,
            Recursive: recursiveResult.metrics.context_recall,
            Semantic: semanticResult.metrics.context_recall
          },
          {
            metric: "AC",
            Fixed: fixedResult.metrics.answer_correctness,
            Recursive: recursiveResult.metrics.answer_correctness,
            Semantic: semanticResult.metrics.answer_correctness
          }
        ]
      : [];

  const ResultCard = ({ title, result, color = "violet" }) => {
    if (!result) return null;

    const colorMap = {
      red: "border-red-500/30 text-red-400",
      violet: "border-violet-500/30 text-violet-400",
      green: "border-emerald-500/30 text-emerald-400"
    };

    return (
      <div className={`card border ${colorMap[color]}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${colorMap[color]}`}>
              {title}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {result.chunk_count} chunks generated
            </p>
          </div>

          <div className="pill">{result.strategy}</div>
        </div>

        <div className="bg-[#171722] p-4 rounded-xl mb-6 border border-[#262638]">
          <h3 className="text-sm text-slate-500 mb-2 uppercase tracking-wider">
            Generated Answer
          </h3>
          <p className="text-slate-200 leading-relaxed">{result.answer}</p>
        </div>

        <h3 className="text-lg font-semibold mb-4">Retrieved Chunks</h3>

        <div className="space-y-4">
          {result.contexts.map((context, index) => (
            <div
              key={index}
              className="bg-[#171722] border border-[#262638] p-4 rounded-xl"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex gap-2 flex-wrap">

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
                <div className="flex items-center gap-2">

                  <div
                    className={`h-2 w-2 rounded-full ${
                      context.score < 1.05
                        ? "bg-green-400"
                        : context.score < 1.2
                        ? "bg-yellow-400"
                        : "bg-red-400"
                    }`}
                  />

                  <span className="text-xs text-slate-500 mono">
                    {context.strategy}
                  </span>

                </div>
              </div>

              <p className="text-sm text-slate-300 max-h-32 overflow-y-auto leading-relaxed">
                {context.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">
          Experiment Configuration
        </h3>

        <p className="text-slate-500">
          Compare fixed-size, recursive, and semantic chunking across RAG
          evaluation dimensions.
        </p>
      </div>

      <div className="card mb-8">
        <textarea
          placeholder="Paste document text here..."
          className="w-full h-48 p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <input
          type="text"
          placeholder="Evaluation question..."
          className="w-full p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div className="card mb-6">
          <div className="card-title mb-2">
            Ground Truth Answer
          </div>

          <p className="text-slate-500 text-sm mb-4">
            Optional. Used to evaluate answer correctness against an expected answer.
          </p>

          <textarea
            value={groundTruth}
            onChange={(e) => setGroundTruth(e.target.value)}
            rows={4}
            placeholder="Example: Tables store data in rows and columns. Fields are columns within a table."
            className="w-full bg-[#111118] border border-[#2a2a38] rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

          <div>
            <label className="block text-sm font-bold tracking-widest text-slate-400 uppercase mb-2">
              Chunk Size
            </label>

            <p className="text-slate-500 text-sm mb-4">
              Maximum characters per chunk
            </p>

            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(e.target.value)}
              className="w-full p-6 rounded-2xl bg-[#111118] border border-[#383850] text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 accent-violet-500"
              placeholder="Chunk size"
            />
          </div>

          <div>
            <label className="block text-sm font-bold tracking-widest text-slate-400 uppercase mb-2">
              Chunk Overlap
            </label>

            <p className="text-slate-500 text-sm mb-4">
              Overlap characters between chunks
            </p>

            <input
              type="number"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(e.target.value)}
              className="w-full p-6 rounded-2xl bg-[#111118] border border-[#383850] text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 accent-violet-500"
              placeholder="Chunk overlap"
            />
          </div>

        </div>

        <button
          onClick={runComparison}
          className="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-lg font-semibold"
        >
          {loading ? "Running Comparison..." : "Run Comparison"}
        </button>

        <button
          onClick={loadDemoData}
          className="ml-3 px-6 py-3 rounded-lg font-semibold border border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
        >
          Load Demo Data
        </button>
      </div>

      {events.length > 0 && loading && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="card-title">Live Event Stream</div>
              <p className="text-slate-500 text-sm mt-2">
                Real-time evaluation and retrieval events.
              </p>
            </div>

            <div className="pill">LIVE</div>
          </div>

          <div className="bg-[#0f0f17] border border-[#262638] rounded-xl p-4 max-h-64 overflow-y-auto space-y-3">
            {events.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-4 text-sm border-b border-[#1d1d28] pb-3"
              >
                <span className="mono text-slate-500">{event.time}</span>
                <span className="text-slate-300">{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fixedResult && recursiveResult && semanticResult && (
        <>
          <div className="card mb-8 border border-violet-500/30 bg-violet-500/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="card-title">Recommended Strategy</div>

                <h2 className="text-3xl font-bold text-violet-300">
                  {getWinner()}
                </h2>

                <p className="text-slate-400 mt-2">
                  Selected using faithfulness, answer relevancy, context
                  precision, context recall, answer correctness, and latency
                  penalty.
                </p>
              </div>

              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-3xl">
                🏆
              </div>
            </div>
          </div>

            {groundTruth && (
              <div className="card mb-6 border border-[#262638]">
                <div className="card-title mb-2">Ground Truth Reference</div>

                <p className="text-sm text-slate-300 mb-3">
                  {groundTruth}
                </p>

                <p className="text-slate-500 text-sm">
                  Answer correctness is calculated against this expected answer.
                </p>
              </div>
            )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StrategyCard
              name="Fixed Chunking"
              score={calculateOverallScore(fixedResult)}
              chunkCount={fixedResult.chunk_count}
              latency={fixedResult.metrics.latency}
              metrics={fixedResult.metrics}
              color="red"
            />

            <StrategyCard
              name="Recursive Chunking"
              score={calculateOverallScore(recursiveResult)}
              chunkCount={recursiveResult.chunk_count}
              latency={recursiveResult.metrics.latency}
              metrics={recursiveResult.metrics}
              color="violet"
            />

            <StrategyCard
              name="Semantic Chunking"
              score={calculateOverallScore(semanticResult)}
              chunkCount={semanticResult.chunk_count}
              latency={semanticResult.metrics.latency}
              metrics={semanticResult.metrics}
              color="green"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">

            <div className="card">

              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="card-title">Score by Metric</div>

                  <p className="text-slate-500 text-sm mt-2">
                    Compare strategy performance across all RAG dimensions.
                  </p>
                </div>

                <div className="pill">LIVE COMPARISON</div>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232336" />
                  <XAxis dataKey="metric" stroke="#7a7a92" />
                  <YAxis stroke="#7a7a92" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111118",
                      border: "1px solid #2a2a38",
                      borderRadius: "12px",
                      color: "#fff"
                    }}
                  />
                  <Legend />

                  <Bar dataKey="Fixed" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Recursive" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Semantic" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

            </div>

            <RadarComparison
              fixed={fixedResult.metrics}
              recursive={recursiveResult.metrics}
              semantic={semanticResult.metrics}
            />

          </div>

          <div className="mb-8">
            <MetricInfo />
            <MetricProgress
              fixed={fixedResult.metrics}
              recursive={recursiveResult.metrics}
              semantic={semanticResult.metrics}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">

            <ChunkViewer
              title="Fixed Chunks"
              contexts={fixedResult.contexts}
              color="red"
            />

            <ChunkViewer
              title="Recursive Chunks"
              contexts={recursiveResult.contexts}
              color="violet"
            />

            <ChunkViewer
              title="Semantic Chunks"
              contexts={semanticResult.contexts}
              color="green"
            />

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ResultCard
              title="Fixed Chunking"
              result={fixedResult}
              color="red"
            />

            <ResultCard
              title="Recursive Chunking"
              result={recursiveResult}
              color="violet"
            />

            <ResultCard
              title="Semantic Chunking"
              result={semanticResult}
              color="green" 
              /> 
            </div> 
          </> 
        )} 
      </div> 
    );
  }

export default ChunkingLab;
