function MetricProgress({
  title,
  fixed,
  recursive
}) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-6">
        Per-Metric Breakdown
      </h2>

      <MetricRow
        label="Faithfulness"
        fixed={fixed.faithfulness}
        recursive={recursive.faithfulness}
      />

      <MetricRow
        label="Answer Relevancy"
        fixed={fixed.answer_relevancy}
        recursive={recursive.answer_relevancy}
      />

      <MetricRow
        label="Context Utilization"
        fixed={fixed.context_utilization}
        recursive={recursive.context_utilization}
      />
    </div>
  );
}

function MetricRow({
  label,
  fixed,
  recursive
}) {
  return (
    <div className="mb-8">
      <h3 className="text-slate-300 mb-4">
        {label}
      </h3>

      <ProgressBar
        label="fixed"
        value={fixed}
        color="bg-red-400"
      />

      <ProgressBar
        label="recursive"
        value={recursive}
        color="bg-violet-400"
      />
    </div>
  );
}

function ProgressBar({
  label,
  value,
  color
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span>{(value * 100).toFixed(1)}%</span>
      </div>

      <div className="w-full bg-slate-900 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full`}
          style={{
            width: `${value * 100}%`
          }}
        />
      </div>
    </div>
  );
}

export default MetricProgress;