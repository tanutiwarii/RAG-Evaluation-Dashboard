import { useEffect, useState } from "react";
import axios from "axios";

import ErrorBanner from "../components/common/ErrorBanner";
import MetricInfo from "../components/common/MetricInfo";
import HistoryHeader from "../components/history/HistoryHeader";
import RunComparison from "../components/history/RunComparison";
import HistoryFilters from "../components/history/HistoryFilters";
import HistoryRunCard from "../components/history/HistoryRunCard";
import HistoryPagination from "../components/history/HistoryPagination";
import StrategyLeaderboard from "../components/history/StrategyLeaderboard";
import HistorySkeleton from "../components/history/HistorySkeleton";
import HistorySummary from "../components/history/HistorySummary";
import HistoryCharts from "../components/history/HistoryCharts";
import { API_URL } from "../config";

function History() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [allRuns, setAllRuns] = useState([]);

  const fetchHistory = async (page = 1) => {
    try {
      setError(null);

      const pageResponse = await axios.get(
        `${API_URL}/history?page=${page}&limit=5`
      );

      const allResponse = await axios.get(
        `${API_URL}/history?page=1&limit=10000`
      );

      setRuns(pageResponse.data.items || []);
      setAllRuns(allResponse.data.items || []);
      setTotalPages(pageResponse.data.pages || 1);
    } catch (error) {
      console.error(error);
      setError(
        "Unable to load history. Please check backend or database connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory(currentPage);
  }, [currentPage]);

  const refreshHistory = async () => {
    setLoading(true);
    await fetchHistory(currentPage);
  };

  const comparisonRuns = allRuns.filter(
    (run) =>
      run.winner !== "Batch Evaluation" &&
      run.winner !== "Single Evaluation"
  );

  const selectedRunObjects = comparisonRuns.filter((run) =>
    selectedRuns.includes(run.run_id)
  );

  const getWinnerColor = (winner) => {
    if (winner?.includes("Batch")) {
      return "text-blue-400 border-blue-500/30";
    }

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

  const semanticWins = comparisonRuns.filter((run) =>
    run.winner?.includes("Semantic")
  ).length;

  const avgCorrectness =
    comparisonRuns.length > 0
      ? (
          comparisonRuns.reduce(
            (sum, run) =>
              sum +
              run.strategies.semantic.metrics.answer_correctness,
            0
          ) / comparisonRuns.length
        ) * 100
      : 0;

  const avgLatency =
    comparisonRuns.length > 0
      ? comparisonRuns.reduce(
          (sum, run) =>
            sum + run.strategies.semantic.metrics.latency,
          0
        ) / comparisonRuns.length
      : 0;

  const trendData = [...comparisonRuns].reverse().map((run, index) => ({
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
      value: comparisonRuns.filter((run) =>
        run.winner?.includes("Fixed")
      ).length,
      color: "#ef4444"
    },
    {
      name: "Recursive",
      value: comparisonRuns.filter((run) =>
        run.winner?.includes("Recursive")
      ).length,
      color: "#8b5cf6"
    },
    {
      name: "Semantic",
      value: comparisonRuns.filter((run) =>
        run.winner?.includes("Semantic")
      ).length,
      color: "#10b981"
    }
  ];

  const strategyLeaderboard = ["fixed", "recursive", "semantic"]
    .map((strategy) => {
      const labelMap = {
        fixed: "Fixed",
        recursive: "Recursive",
        semantic: "Semantic"
      };

      const wins = comparisonRuns.filter((run) =>
        run.winner?.toLowerCase().includes(strategy)
      ).length;

      const avgCorrectness =
        comparisonRuns.length > 0
          ? (
              comparisonRuns.reduce(
                (sum, run) =>
                  sum +
                  run.strategies[strategy].metrics.answer_correctness,
                0
              ) / comparisonRuns.length
            ) * 100
          : 0;

      const avgLatency =
        comparisonRuns.length > 0
          ? comparisonRuns.reduce(
              (sum, run) =>
                sum + run.strategies[strategy].metrics.latency,
              0
            ) / comparisonRuns.length
          : 0;

      return {
        strategy,
        label: labelMap[strategy],
        wins,
        avgCorrectness,
        avgLatency
      };
    })
    .sort((a, b) => b.wins - a.wins);

  const filteredRuns = runs
    .filter((run) =>
      run.question?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((run) => {
      if (winnerFilter === "all") return true;

      return run.winner?.toLowerCase().includes(winnerFilter);
    })
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }

      return new Date(a.timestamp) - new Date(b.timestamp);
    });

  const toggleRunSelection = (runId) => {
    const run = runs.find((item) => item.run_id === runId);

    if (run?.winner === "Batch Evaluation") {
      return;
    }

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

  const exportRunAsJson = (run) => {
    const blob = new Blob([JSON.stringify(run, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${run.run_id}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportEntireHistory = async () => {
    try {
      setActionError("");
      const response = await axios.get(
        `${API_URL}/history?page=1&limit=10000`
      );

      const blob = new Blob(
        [JSON.stringify(response.data.items || [], null, 2)],
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
      setActionError("Failed to export full history.");
    }
  };

  const clearhistory = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all history?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/history`);
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
        `${API_URL}/history/${runId}`
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

  return (
    <div>
      <HistoryHeader
        onRefresh={refreshHistory}
        onExportFullHistory={exportEntireHistory}
        onClearHistory={clearhistory}
      />

      <ErrorBanner message={actionError} />

      <HistoryFilters
        search={search}
        setSearch={setSearch}
        winnerFilter={winnerFilter}
        setWinnerFilter={setWinnerFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

      {runs.length > 0 && (
        <>
          {comparisonRuns.length > 0 && (
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
            </>
          )}

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
            No evaluations found.
          </h3>

          <p className="text-slate-500">
            Run your first evaluation.
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
              <HistoryRunCard
                key={run.run_id || index}
                run={run}
                isExpanded={isExpanded}
                selectedRuns={selectedRuns}
                getWinnerColor={getWinnerColor}
                toggleRunSelection={toggleRunSelection}
                setExpandedRun={setExpandedRun}
                exportRunAsJson={exportRunAsJson}
                deleteRun={deleteRun}
              />
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
