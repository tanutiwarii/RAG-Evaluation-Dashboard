import { useEffect, useState } from "react";
import axios from "axios";
import MetricInfo from "../components/common/MetricInfo";
import HistoryHeader from "../components/history/HistoryHeader";
import RunComparison from "../components/history/RunComparison";
import HistoryFilters from "../components/history/HistoryFilters";
import HistoryPagination from "../components/history/HistoryPagination";
import StrategyLeaderboard from "../components/history/StrategyLeaderboard";
import HistorySkeleton from "../components/history/HistorySkeleton";
import HistorySummary from "../components/history/HistorySummary";
import HistoryCharts from "../components/history/HistoryCharts";
import SummaryCard from "../components/history/SummaryCard";
import MetricRow from "../components/history/MetricRow";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const refreshHistory = async () => {
    setLoading(true);
    await fetchHistory(currentPage);
  };
  

  const fetchHistory = async (page = 1) => {
    try {
      setError(null);

      const response = await axios.get(
        `http://127.0.0.1:8000/history?page=${page}&limit=5`
      );

      setRuns(response.data.items);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error(error);
      setError("Unable to load history. Please check backend or database connection.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage]);


  const getWinnerColor = (winner) => {
    if (winner?.includes("Semantic")) {
      return "text-emerald-400 border-emerald-500/30";
    }

    if (winner?.includes("Recursive")) {
      return "text-violet-400 border-violet-500/30";
    }

    return "text-red-400 border-red-500/30";
  };

  const getDelta = (current, previous) => {
    const delta = current - previous;

    if (delta > 0) {
      return {
        text: `+${(delta * 100).toFixed(1)}%`,
        color: "text-emerald-400"
      };
    }

    if (delta < 0) {
      return {
        text: `${(delta * 100).toFixed(1)}%`,
        color: "text-red-400"
      };
    }

    return {
      text: "0.0%",
      color: "text-slate-400"
    };
  };
  if (error) {
    return (
      <div className="card border border-red-500/30 bg-red-500/5 text-center py-16">
        <h3 className="text-2xl font-bold text-red-400 mb-3">
          Unable to load history
        </h3>

        <p className="text-slate-400 mb-6">
          Please check your backend server or Supabase connection.
        </p>

        <button
          onClick={() => fetchHistory(currentPage)}
          className="px-5 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return <HistorySkeleton />;
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

  // Sort leaderboard by number of wins (descending)
  strategyLeaderboard.sort((a, b) => b.wins - a.wins);

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

  const deleteRun = async (runId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this run?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `http://127.0.0.1:8000/history/${runId}`
      );

      setRuns((prev) =>
        prev.filter((run) => run.run_id !== runId)
      );

      setSelectedRuns((prev) =>
        prev.filter((id) => id !== runId)
      );

      if (expandedRun === runId) {
        setExpandedRun(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const exportEntireHistory = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/history?page=1&limit=10000"
      );

      const blob = new Blob(
        [JSON.stringify(response.data.items, null, 2)],
        {
          type: "application/json"
        }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "evaluation_history_full.json";
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      window.alert("Failed to export full history.");
    }
  };

  return (
    <div>
      <HistoryHeader
        onRefresh={refreshHistory}
        onExportFullHistory={exportEntireHistory}
        onClearHistory={clearhistory}
      />

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
      {runs.length > 0 && (
        <>
        <HistorySummary
          totalRuns={totalRuns}
          semanticWins={semanticWins}
          avgCorrectness={avgCorrectness}
          avgLatency={avgLatency}
        />

        <HistoryCharts
          trendData={trendData}
          winnerData={winnerData}
        />

        <MetricInfo />

        <StrategyLeaderboard
          strategyLeaderboard={strategyLeaderboard}
        />
        {selectedRunObjects.length === 2 && (
          <RunComparison
            selectedRunObjects={selectedRunObjects}
            getDelta={getDelta}
            setSelectedRuns={setSelectedRuns}
          />
        )}
        
        </>
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
            {runs.map((run, index) => {
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

                    <button
                      onClick={() => deleteRun(run.run_id)}
                      className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                    >
                      Delete
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

                    <div className="bg-[#111118] border border-[#262638] rounded-xl p-5 mb-6">
                      <h3 className="text-lg font-bold mb-3">
                        Ground Truth
                      </h3>

                      {run.ground_truth ? (
                        <p className="text-slate-300 leading-relaxed">
                          {run.ground_truth}
                        </p>
                      ) : (
                        <p className="text-slate-500 italic">
                          No ground truth provided for this run.
                        </p>
                      )}
                    </div>
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

                            {run.ground_truth && (
                              <div className="mb-4">
                                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                                  Correctness Score
                                </p>

                                <div className="flex items-center gap-3">
                                  <div className="w-full bg-[#262638] rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full bg-emerald-500"
                                      style={{
                                        width: `${
                                          strategy.data.metrics.answer_correctness * 100
                                        }%`
                                      }}
                                    />
                                  </div>

                                  <span className="mono text-sm">
                                    {(
                                      strategy.data.metrics.answer_correctness * 100
                                    ).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            )}

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
          {totalPages > 1 && (
            <HistoryPagination
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          )}
        </div>
        )}
      </div>
  );
}

export default History;
