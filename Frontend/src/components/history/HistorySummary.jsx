import SummaryCard from "./SummaryCard";

function HistorySummary({
  totalRuns,
  semanticWins,
  avgCorrectness,
  avgLatency
}) {
  return (
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
  );
}

export default HistorySummary;