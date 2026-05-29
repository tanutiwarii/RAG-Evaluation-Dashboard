import { useEffect, useState } from "react";
import axios from "axios";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

function History() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const selectedRunObjects = runs.filter((run) =>
    selectedRuns.includes(run.run_id)
  );

  useEffect(() => {
    fetchhistory();
  }, []);

  const fetchhistory = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/history");
      setRuns(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const getWinnerColor = (winner) => {
    if (winner?.includes("Semantic")) {
      return "text-emerald-400 border-emerald-500/30";
    }

    if (winner?.includes("Recursive")) {
      return "text-violet-400 border-violet-500/30";
    }

    return "text-red-400 border-red-500/30";
  };

  if (loading) {
    return <div className="text-slate-400">Loading history...</div>;
  }

  const totalRuns = runs.length;

  const semanticWins = runs.filter((run) =>
    run.winner?.includes("Semantic")
  ).length;

  const avgCorrectness =
    runs.length > 0
      ? (
          runs.reduce(
            (sum, run) =>
              sum + run.strategies.semantic.metrics.answer_correctness,
            0
          ) / runs.length
        ) * 100
      : 0;

  const avgLatency =
    runs.length > 0
      ? runs.reduce(
          (sum, run) =>
            sum + run.strategies.semantic.metrics.latency,
          0
        ) / runs.length
      : 0;

  const trendData = [...runs].reverse().map((run, index) => ({
    run: index + 1,
    fixed_correctness:
      run.strategies.fixed.metrics.answer_correctness,
    recursive_correctness:
      run.strategies.recursive.metrics.answer_correctness,
    semantic_correctness:
      run.strategies.semantic.metrics.answer_correctness
  }));

  const winnerData = [
    {
      name: "Fixed",
      value: runs.filter((run) =>
        run.winner?.includes("Fixed")
      ).length,
      color: "#ef4444"
    },
    {
      name: "Recursive",
      value: runs.filter((run) =>
        run.winner?.includes("Recursive")
      ).length,
      color: "#8b5cf6"
    },
    {
      name: "Semantic",
      value: runs.filter((run) =>
        run.winner?.includes("Semantic")
      ).length,
      color: "#10b981"
    }
  ];

  const exportRunAsJson = (run) => {
    const blob = new Blob(
      [JSON.stringify(run, null, 2)],
      {
        type: "application/json"
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${run.run_id}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const filteredRuns = runs
    .filter((run) =>
      run.question
        ?.toLowerCase()
        .includes(search.toLowerCase())
    )
    .filter((run) => {
      if (winnerFilter === "all") return true;

      return run.winner
        ?.toLowerCase()
        .includes(winnerFilter);
    })
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }

      return new Date(a.timestamp) - new Date(b.timestamp);
    });


  const strategyLeaderboard = ["fixed", "recursive", "semantic"].map(
    (strategy) => {
      const labelMap = {
        fixed: "Fixed",
        recursive: "Recursive",
        semantic: "Semantic"
      };

      const wins = runs.filter((run) =>
        run.winner
          ?.toLowerCase()
          .includes(strategy)
      ).length;

      const avgCorrectness =
        runs.length > 0
          ? (
              runs.reduce(
                (sum, run) =>
                  sum +
                  run.strategies[strategy].metrics.answer_correctness,
                0
              ) / runs.length
            ) * 100
          : 0;

      const avgLatency =
        runs.length > 0
          ? runs.reduce(
              (sum, run) =>
                sum +
                run.strategies[strategy].metrics.latency,
              0
            ) / runs.length
          : 0;

      return {
        strategy,
        label: labelMap[strategy],
        wins,
        avgCorrectness,
        avgLatency
      };
    }
  );

  const toggleRunSelection = (runId) => {
    setSelectedRuns((prev) => {
      if (prev.includes(runId)) {
        return prev.filter((id) => id !== runId);
      }

      if (prev.length >= 2) {
        return prev;
      }

      return [...prev, runId];
    });
  };

  const clearhistory = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all history?"
    );

    if (!confirmed) return;

    try {
      await axios.delete("http://127.0.0.1:8000/history");
      setRuns([]);
      setSelectedRuns([]);
      setExpandedRun(null);
    } catch (error) {
      console.error(error);
    }
  };


  return (
    <div>
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Track experiment runs, compare chunking strategies,
            and analyze performance trends over time.
          </h2>
        </div>

        <button
          onClick={clearhistory}
          className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 whitespace-nowrap"
        >
          Clear history
        </button>
      </div>

      <div className="card border border-[#262638] mb-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search experiments by question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <select
            value={winnerFilter}
            onChange={(e) => setWinnerFilter(e.target.value)}
            className="w-full p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Winners</option>
            <option value="fixed">Fixed Winners</option>
            <option value="recursive">Recursive Winners</option>
            <option value="semantic">Semantic Winners</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <SummaryCard title="Total Runs" value={totalRuns} />
        <SummaryCard title="Semantic Wins" value={semanticWins} />
        <SummaryCard
          title="Avg Correctness"
          value={`${avgCorrectness.toFixed(1)}%`}
        />
        <SummaryCard
          title="Avg Latency"
          value={`${avgLatency.toFixed(2)}s`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
        <div className="card border border-[#262638]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="card-title">
                Correctness Trend
              </div>

              <p className="text-slate-500 text-sm mt-2">
                Track answer correctness across experiment runs.
              </p>
            </div>

            <div className="pill">
              history ANALYTICS
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232336" />

              <XAxis dataKey="run" stroke="#7a7a92" />

              <YAxis domain={[0, 1]} stroke="#7a7a92" />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#111118",
                  border: "1px solid #2a2a38",
                  borderRadius: "12px",
                  color: "#fff"
                }}
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="fixed_correctness"
                stroke="#ef4444"
                strokeWidth={3}
              />

              <Line
                type="monotone"
                dataKey="recursive_correctness"
                stroke="#8b5cf6"
                strokeWidth={3}
              />

              <Line
                type="monotone"
                dataKey="semantic_correctness"
                stroke="#10b981"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card border border-[#262638]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="card-title">
                Winner Distribution
              </div>

              <p className="text-slate-500 text-sm mt-2">
                See which chunking strategy wins most often.
              </p>
            </div>

            <div className="pill">
              STRATEGY WINS
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={winnerData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
                label
              >
                {winnerData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  backgroundColor: "#111118",
                  border: "1px solid #2a2a38",
                  borderRadius: "12px",
                  color: "#fff"
                }}
              />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card border border-[#262638] mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="card-title">
              Strategy Leaderboard
            </div>

            <p className="text-slate-500 text-sm mt-2">
              Compare strategy wins, correctness, and latency over all runs.
            </p>
          </div>

          <div className="pill">
            STRATEGY RANKING
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-[#262638]">
                <th className="text-left py-3">Strategy</th>
                <th className="text-left py-3">Wins</th>
                <th className="text-left py-3">Avg Correctness</th>
                <th className="text-left py-3">Avg Latency</th>
              </tr>
            </thead>

            <tbody>
              {strategyLeaderboard.map((item) => (
                <tr
                  key={item.strategy}
                  className="border-b border-[#1d1d28]"
                >
                  <td className="py-4 font-semibold">
                    {item.label}
                  </td>

                  <td className="py-4 mono">
                    {item.wins}
                  </td>

                  <td className="py-4 mono">
                    {item.avgCorrectness.toFixed(1)}%
                  </td>

                  <td className="py-4 mono">
                    {item.avgLatency.toFixed(2)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRunObjects.length === 2 && (
        <div className="card border border-violet-500/30 bg-violet-500/5 mb-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="card-title">
                Run Comparison
              </div>

              <h3 className="text-2xl font-bold">
                Selected Experiments
              </h3>

              <p className="text-slate-400 mt-2">
                Compare winners, correctness, latency, and configuration across two historical runs.
              </p>
            </div>

            <button
              onClick={() => setSelectedRuns([])}
              className="px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
            >
              Clear Selection
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {selectedRunObjects.map((run) => (
              <div
                key={run.run_id}
                className="bg-[#0f0f17] border border-[#262638] rounded-xl p-6"
              >
                <div className="card-title">
                  {run.run_id}
                </div>

                <h4 className="text-xl font-bold mb-3">
                  {run.question}
                </h4>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="pill">
                    Winner: {run.winner}
                  </span>

                  <span className="pill">
                    Chunk Size: {run.chunk_size}
                  </span>

                  <span className="pill">
                    Overlap: {run.chunk_overlap}
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "Fixed",
                      data: run.strategies.fixed,
                      color: "text-red-400"
                    },
                    {
                      label: "Recursive",
                      data: run.strategies.recursive,
                      color: "text-violet-400"
                    },
                    {
                      label: "Semantic",
                      data: run.strategies.semantic,
                      color: "text-emerald-400"
                    }
                  ].map((strategy) => (
                    <div
                      key={strategy.label}
                      className="bg-[#171722] border border-[#262638] rounded-lg p-4"
                    >
                      <h5 className={`font-bold mb-3 ${strategy.color}`}>
                        {strategy.label}
                      </h5>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <MetricRow
                          label="Correctness"
                          value={`${(
                            strategy.data.metrics.answer_correctness * 100
                          ).toFixed(0)}%`}
                        />

                        <MetricRow
                          label="Faithfulness"
                          value={`${(
                            strategy.data.metrics.faithfulness * 100
                          ).toFixed(0)}%`}
                        />

                        <MetricRow
                          label="Latency"
                          value={`${strategy.data.metrics.latency}s`}
                        />

                        <MetricRow
                          label="Chunks"
                          value={strategy.data.chunk_count}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {runs.length === 0 && (
        <div className="card border border-[#262638] text-center py-16">
          <h3 className="text-2xl font-bold mb-3">
            No history yet
          </h3>

          <p className="text-slate-500">
            Run a chunking comparison to create your first experiment record.
          </p>
        </div>
      )}

      {runs.length > 0 && filteredRuns.length === 0 && (
        <div className="card border border-[#262638] text-center py-16">
          <h3 className="text-2xl font-bold mb-3">
            No matching experiments
          </h3>

          <p className="text-slate-500">
            Try changing your search or filter settings.
          </p>
        </div>
      )}

      {filteredRuns.length > 0 && (
        <div className="space-y-6">
          {filteredRuns.map((run, index) => {
            const isExpanded = expandedRun === run.run_id;

            return (
              <div
                key={index}
                className="card border border-[#262638]"
              >
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
                <div>
                  <div className="card-title">
                    {run.run_id}
                  </div>

                  <h3 className="text-2xl font-semibold mb-2">
                    {run.question}
                  </h3>

                  <p className="text-slate-500 text-sm">
                    {new Date(run.timestamp).toLocaleString()}
                  </p>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className="pill">
                      Chunk Size: {run.chunk_size}
                    </span>

                    <span className="pill">
                      Overlap: {run.chunk_overlap}
                    </span>

                    <span
                      className={`pill ${getWinnerColor(run.winner)}`}
                    >
                      Winner: {run.winner}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">

                  <button
                    onClick={() => toggleRunSelection(run.run_id)}
                    className={`px-4 py-2 rounded-lg border transition ${
                      selectedRuns.includes(run.run_id)
                        ? "border-violet-500 text-violet-300 bg-violet-500/10"
                        : "border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
                    }`}
                  >
                    {selectedRuns.includes(run.run_id)
                      ? "Selected"
                      : "Select"}
                  </button>

                  <button
                    onClick={() =>
                      setExpandedRun(isExpanded ? null : run.run_id)
                    }
                    className="px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24] transition"
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>

                  <button
                    onClick={() => exportRunAsJson(run)}
                    className="px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24] transition"
                  >
                    Export JSON
                  </button>

                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    label: "Fixed",
                    data: run.strategies.fixed,
                    color: "text-red-400"
                  },
                  {
                    label: "Recursive",
                    data: run.strategies.recursive,
                    color: "text-violet-400"
                  },
                  {
                    label: "Semantic",
                    data: run.strategies.semantic,
                    color: "text-emerald-400"
                  }
                ].map((strategy, idx) => (
                  <div
                    key={idx}
                    className="bg-[#111118] border border-[#262638] rounded-xl p-5"
                  >
                    <h4
                      className={`text-xl font-bold mb-4 ${strategy.color}`}
                    >
                      {strategy.label}
                    </h4>

                    <div className="space-y-3">
                      <MetricRow
                        label="Faithfulness"
                        value={`${(
                          strategy.data.metrics.faithfulness * 100
                        ).toFixed(0)}%`}
                      />

                      <MetricRow
                        label="Correctness"
                        value={`${(
                          strategy.data.metrics.answer_correctness * 100
                        ).toFixed(0)}%`}
                      />

                      <MetricRow
                        label="Latency"
                        value={`${strategy.data.metrics.latency}s`}
                      />

                      <MetricRow
                        label="Chunks"
                        value={strategy.data.chunk_count}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {isExpanded && (
                <div className="mt-8 pt-8 border-t border-[#262638]">
                  <h3 className="text-2xl font-bold mb-6">
                    Run Details
                  </h3>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {[
                      {
                        label: "Fixed",
                        data: run.strategies.fixed,
                        color: "text-red-400"
                      },
                      {
                        label: "Recursive",
                        data: run.strategies.recursive,
                        color: "text-violet-400"
                      },
                      {
                        label: "Semantic",
                        data: run.strategies.semantic,
                        color: "text-emerald-400"
                      }
                    ].map((strategy, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0f0f17] border border-[#262638] rounded-xl p-5"
                      >
                        <h4
                          className={`text-lg font-bold mb-5 ${strategy.color}`}
                        >
                          {strategy.label} Details
                        </h4>

                        <div className="mb-6">
                          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                            Generated Answer
                          </p>

                          <p className="text-sm text-slate-300 leading-relaxed">
                            {strategy.data.answer}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                            Retrieved Chunks
                          </p>

                          <div className="space-y-3">
                            {strategy.data.contexts.map((context, i) => (
                              <div
                                key={i}
                                className="bg-[#171722] border border-[#262638] rounded-lg p-3"
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

                                <p className="text-xs text-slate-400 leading-relaxed max-h-24 overflow-y-auto">
                                  {context.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}


function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="mono">
        {value}
      </span>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="card border border-[#262638]">
      <p className="text-slate-500 text-sm uppercase tracking-wider mb-3">
        {title}
      </p>

      <h3 className="text-4xl font-bold">
        {value}
      </h3>
    </div>
  );
}

export default History;