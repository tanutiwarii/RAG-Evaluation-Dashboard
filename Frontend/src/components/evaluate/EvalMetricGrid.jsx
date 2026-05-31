import MetricCard from "../common/MetricCard";

function EvalMetricGrid({ metrics }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        title="Faithfulness"
        value={metrics.faithfulness}
      />

      <MetricCard
        title="Answer Relevancy"
        value={metrics.answer_relevancy}
      />

      <MetricCard
        title="Context Precision"
        value={metrics.context_precision}
      />

      <MetricCard
        title="Context Recall"
        value={metrics.context_recall}
      />

      <MetricCard
        title="Answer Correctness"
        value={metrics.answer_correctness}
      />

      <MetricCard
        title="Latency"
        value={`${(metrics.latency * 1000).toFixed(2)} ms`}
      />
    </div>
  );
}

export default EvalMetricGrid;