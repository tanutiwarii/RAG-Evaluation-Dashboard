import MetricRow from "./MetricRow";

function HistoryRunCard({
  run,
  isExpanded,
  selectedRuns,
  getWinnerColor,
  toggleRunSelection,
  setExpandedRun,
  exportRunAsJson,
  deleteRun
}) {
  const isBatchRun = run.winner === "Batch Evaluation";
  const isSingleRun = run.winner === "Single Evaluation";

  const strategyCards = [
    {
      label: "Fixed",
      data: run.strategies?.fixed,
      color: "text-red-400"
    },
    {
      label: "Recursive",
      data: run.strategies?.recursive,
      color: "text-violet-400"
    },
    {
      label: "Semantic",
      data: run.strategies?.semantic,
      color: "text-emerald-400"
    }
  ];

  return (
    <div className="card border border-[#262638]">
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
            {!isBatchRun && (
              <>
                <span className="pill">
                  Chunk Size: {run.chunk_size}
                </span>

                <span className="pill">
                  Overlap: {run.chunk_overlap}
                </span>
              </>
            )}

            <span className={`pill ${getWinnerColor(run.winner)}`}>
              Winner: {run.winner}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isBatchRun && (
            <button
              onClick={() => toggleRunSelection(run.run_id)}
              className={`px-4 py-2 rounded-lg border transition ${
                selectedRuns.includes(run.run_id)
                  ? "border-violet-500 text-violet-300 bg-violet-500/10"
                  : "border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
              }`}
            >
              {selectedRuns.includes(run.run_id) ? "Selected" : "Select"}
            </button>
          )}

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

      {isBatchRun ? (
        <div className="bg-[#111118] border border-[#262638] rounded-xl p-5">
          <h4 className="text-xl font-bold mb-4 text-blue-400">
            Batch Evaluation
          </h4>

          <div className="space-y-3">
            <MetricRow
              label="Items"
              value={run.strategies?.batch?.count || 0}
            />

            <MetricRow
              label="Avg Faithfulness"
              value={`${(
                (run.strategies?.batch?.aggregate_metrics?.faithfulness || 0) *
                100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Avg Correctness"
              value={`${(
                (run.strategies?.batch?.aggregate_metrics
                  ?.answer_correctness || 0) * 100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Avg Latency"
              value={`${
                run.strategies?.batch?.aggregate_metrics?.latency || 0
              }s`}
            />
            <MetricRow
              label="Avg Relevancy"
              value={`${(
                (run.strategies?.batch?.aggregate_metrics?.answer_relevancy || 0) * 100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Avg Precision"
              value={`${(
                (run.strategies?.batch?.aggregate_metrics?.context_precision || 0) * 100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Avg Recall"
              value={`${(
                (run.strategies?.batch?.aggregate_metrics?.context_recall || 0) * 100
              ).toFixed(0)}%`}
            />
          </div>
        </div>

        ) : isSingleRun ? (
        <div className="bg-[#111118] border border-[#262638] rounded-xl p-5">
          <h4 className="text-xl font-bold mb-4 text-cyan-400">
            Single Evaluation
          </h4>

          <div className="space-y-3">
            <MetricRow
              label="Faithfulness"
              value={`${(
                (run.strategies?.single?.metrics?.faithfulness || 0) * 100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Correctness"
              value={`${(
                (run.strategies?.single?.metrics?.answer_correctness || 0) * 100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Precision"
              value={`${(
                (run.strategies?.single?.metrics?.context_precision || 0) * 100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Recall"
              value={`${(
                (run.strategies?.single?.metrics?.context_recall || 0) * 100
              ).toFixed(0)}%`}
            />

            <MetricRow
              label="Latency"
              value={`${run.strategies?.single?.metrics?.latency || 0}s`}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {strategyCards.map((strategy, idx) => (
            <div
              key={idx}
              className="bg-[#111118] border border-[#262638] rounded-xl p-5"
            >
              <h4 className={`text-xl font-bold mb-4 ${strategy.color}`}>
                {strategy.label}
              </h4>

              <div className="space-y-3">
                <MetricRow
                  label="Faithfulness"
                  value={`${(
                    (strategy.data?.metrics?.faithfulness || 0) * 100
                  ).toFixed(0)}%`}
                />

                <MetricRow
                  label="Correctness"
                  value={`${(
                    (strategy.data?.metrics?.answer_correctness || 0) * 100
                  ).toFixed(0)}%`}
                />

                <MetricRow
                  label="Latency"
                  value={`${strategy.data?.metrics?.latency || 0}s`}
                />

                <MetricRow
                  label="Chunks"
                  value={strategy.data?.chunk_count || 0}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="mt-8 pt-8 border-t border-[#262638]">
          {isBatchRun ? (
            <BatchRunDetails run={run} />
          ) : isSingleRun ? (
            <SingleRunDetails run={run} />
          ) : (
            <StandardRunDetails
              run={run}
              strategyCards={strategyCards}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StandardRunDetails({ run, strategyCards }) {
  return (
    <>
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
        {strategyCards.map((strategy, idx) => (
          <div
            key={idx}
            className="bg-[#0f0f17] border border-[#262638] rounded-xl p-5"
          >
            <h4 className={`text-lg font-bold mb-5 ${strategy.color}`}>
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
                            (strategy.data?.metrics?.answer_correctness || 0) *
                            100
                          }%`
                        }}
                      />
                    </div>

                    <span className="mono text-sm">
                      {(
                        (strategy.data?.metrics?.answer_correctness || 0) * 100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed">
                {strategy.data?.answer || "No answer available."}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                Retrieved Chunks
              </p>

              <div className="space-y-3">
                {(strategy.data?.contexts || []).map((context, i) => (
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
    </>
  );
}

function BatchRunDetails({ run }) {
  const batch = run.strategies?.batch;

  return (
    <>
      <h3 className="text-2xl font-bold mb-6">
        Batch Evaluation Details
      </h3>

      <div className="space-y-4">
        {(batch?.results || []).map((item) => (
          <div
            key={item.index}
            className="bg-[#111118] border border-[#262638] rounded-xl p-5"
          >
            <h4 className="font-bold mb-2">
              Question {item.index + 1}
            </h4>

            <p className="text-slate-300 mb-4">
              {item.question}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <MetricRow
                label="Faithfulness"
                value={`${(
                  (item.metrics?.faithfulness || 0) * 100
                ).toFixed(0)}%`}
              />

              <MetricRow
                label="Correctness"
                value={`${(
                  (item.metrics?.answer_correctness || 0) * 100
                ).toFixed(0)}%`}
              />

              <MetricRow
                label="Precision"
                value={`${(
                  (item.metrics?.context_precision || 0) * 100
                ).toFixed(0)}%`}
              />

              
            </div>

            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                Answer
              </p>

              <p className="text-sm text-slate-300">
                {item.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function SingleRunDetails({ run }) {
  const single = run.strategies?.single;

  return (
    <>
      <h3 className="text-2xl font-bold mb-6">
        Single Evaluation Details
      </h3>

      <div className="bg-[#111118] border border-[#262638] rounded-xl p-5 mb-6">
        <h4 className="font-bold mb-3">
          Generated Answer
        </h4>

        <p className="text-sm text-slate-300 leading-relaxed">
          {single?.answer || "No answer available."}
        </p>
      </div>

      <div className="bg-[#111118] border border-[#262638] rounded-xl p-5 mb-6">
        <h4 className="font-bold mb-3">
          Ground Truth
        </h4>

        <p className="text-sm text-slate-300 leading-relaxed">
          {single?.ground_truth || "Not provided"}
        </p>
      </div>

      <div className="bg-[#111118] border border-[#262638] rounded-xl p-5">
        <h4 className="font-bold mb-4">
          Retrieved Contexts
        </h4>

        <div className="space-y-3">
          {(single?.contexts || []).map((context, index) => (
            <div
              key={index}
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

              <p className="text-xs text-slate-400 leading-relaxed">
                {context.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default HistoryRunCard;
