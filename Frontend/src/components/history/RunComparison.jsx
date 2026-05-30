import ComparisonStrategyCard from "./ComparisonStrategyCard";

function RunComparison({
  selectedRunObjects,
  getDelta,
  setSelectedRuns
}) {
  return (
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
              <div className="bg-[#171722] border border-[#262638] rounded-lg p-4 mb-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Ground Truth
                </p>

                <p className="text-sm text-slate-300">
                  {run.ground_truth || "Not provided"}
                </p>
              </div>

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
                <ComparisonStrategyCard
                  key={strategy.label}
                  strategy={strategy}
                  selectedRunObjects={selectedRunObjects}
                  run={run}
                  getDelta={getDelta}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RunComparison;