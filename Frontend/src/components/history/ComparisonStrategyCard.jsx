import MetricRow from "./MetricRow";

function ComparisonStrategyCard({
  strategy,
  selectedRunObjects,
  run,
  getDelta
}) {
  return (
    <div className="bg-[#171722] border border-[#262638] rounded-lg p-4">
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

        {selectedRunObjects.length === 2 && (
          <p className="text-xs mt-2 col-span-2">
            <span className="text-slate-500">
              vs other run:
            </span>{" "}
            <span
              className={
                getDelta(
                  strategy.data.metrics.answer_correctness,
                  selectedRunObjects[0].run_id === run.run_id
                    ? selectedRunObjects[1].strategies[
                        strategy.label.toLowerCase()
                      ].metrics.answer_correctness
                    : selectedRunObjects[0].strategies[
                        strategy.label.toLowerCase()
                      ].metrics.answer_correctness
                ).color
              }
            >
              {
                getDelta(
                  strategy.data.metrics.answer_correctness,
                  selectedRunObjects[0].run_id === run.run_id
                    ? selectedRunObjects[1].strategies[
                        strategy.label.toLowerCase()
                      ].metrics.answer_correctness
                    : selectedRunObjects[0].strategies[
                        strategy.label.toLowerCase()
                      ].metrics.answer_correctness
                ).text
              }
            </span>
          </p>
        )}

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
  );
}

export default ComparisonStrategyCard;