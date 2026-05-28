const METRICS = [
  {
    key: "faithfulness",
    label: "Faithfulness",
  },
  {
    key: "answer_relevancy",
    label: "Answer Relevancy",
  },
  {
    key: "context_precision",
    label: "Context Precision",
  },
  {
    key: "context_recall",
    label: "Context Recall",
  },
  {
    key: "answer_correctness",
    label: "Answer Correctness",
  },
];

const STRATEGIES = [
  {
    key: "fixed",
    label: "Fixed",
    color: "bg-red-400",
  },
  {
    key: "recursive",
    label: "Recursive",
    color: "bg-violet-400",
  },
  {
    key: "semantic",
    label: "Semantic",
    color: "bg-emerald-400",
  },
];

function MetricProgress({
  fixed,
  recursive,
  semantic
}) {

  const values = {
    fixed,
    recursive,
    semantic,
  };


  return (

    <div className="card">

      <div className="flex items-center justify-between mb-6">

        <div>

          <div className="card-title">
            Per-Metric Breakdown
          </div>

          <p className="text-slate-500 text-sm mt-2">
            Detailed comparison of each strategy across quality dimensions.
          </p>

        </div>

        <div className="pill">
          METRIC VIEW
        </div>

      </div>


      <div className="space-y-8">

        {METRICS.map((metric) => (

          <div key={metric.key}>

            <h3 className="text-slate-300 mb-4 font-semibold">
              {metric.label}
            </h3>

            <div className="space-y-4">

              {STRATEGIES.map((strategy) => {

                const value =
                  values[strategy.key]?.[metric.key] || 0;

                return (

                  <div key={strategy.key}>

                    <div className="flex justify-between mb-2 text-sm">

                      <span className="text-slate-400">
                        {strategy.label}
                      </span>

                      <span className="mono">
                        {(value * 100).toFixed(1)}%
                      </span>

                    </div>

                    <div className="w-full bg-[#1c1c28] rounded-full h-2 overflow-hidden">

                      <div
                        className={`${strategy.color} h-2 rounded-full`}
                        style={{
                          width: `${value * 100}%`
                        }}
                      />

                    </div>

                  </div>
                );
              })}

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}


export default MetricProgress;