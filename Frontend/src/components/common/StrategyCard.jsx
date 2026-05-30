function StrategyCard({
  name,
  score,
  chunkCount,
  latency,
  metrics,
  color = "violet"
}) {

  const styles = {

    red: {
      border: "border-red-500/30",
      text: "text-red-400",
      gradient: "from-red-500 to-orange-500",
      bg: "bg-red-500/10"
    },

    violet: {
      border: "border-violet-500/30",
      text: "text-violet-400",
      gradient: "from-violet-500 to-purple-500",
      bg: "bg-violet-500/10"
    },

    green: {
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      gradient: "from-emerald-500 to-green-500",
      bg: "bg-emerald-500/10"
    }

  };


  const current = styles[color];


  return (

    <div
      className={`card border ${current.border}`}
    >

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3
            className={`text-2xl font-bold ${current.text}`}
          >
            {name}
          </h3>

          <p className="text-slate-500 text-sm mt-1">
            {chunkCount} chunks
          </p>

        </div>

        <div
          className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${current.gradient} opacity-90`}
        />

      </div>


      <div className="mb-6">

        <p className="text-slate-500 text-sm mb-2">
          Overall Score
        </p>

        <h2 className="text-5xl font-bold mono">

          {(score * 100).toFixed(0)}

          <span className="text-2xl text-slate-500">
            %
          </span>

        </h2>

      </div>


      <div className="space-y-5">

        {/* Faithfulness */}

        <div>

          <div className="flex justify-between text-sm mb-2">

            <span className="text-slate-400">
              Faithfulness
            </span>

            <span className="mono">
              {(metrics.faithfulness * 100).toFixed(0)}%
            </span>

          </div>

          <div className="h-2 bg-[#1c1c28] rounded-full overflow-hidden">

            <div
              className={`h-full bg-gradient-to-r ${current.gradient}`}
              style={{
                width: `${metrics.faithfulness * 100}%`
              }}
            />

          </div>

        </div>


        {/* Answer Correctness */}

        <div>

          <div className="flex justify-between text-sm mb-2">

            <span className="text-slate-400">
              Answer Correctness
            </span>

            <span className="mono">
              {(metrics.answer_correctness * 100).toFixed(0)}%
            </span>

          </div>

          <div className="h-2 bg-[#1c1c28] rounded-full overflow-hidden">

            <div
              className={`h-full bg-gradient-to-r ${current.gradient}`}
              style={{
                width: `${metrics.answer_correctness * 100}%`
              }}
            />

          </div>

        </div>

      </div>


      <div className="mt-6 pt-4 border-t border-[#262638] flex justify-between text-sm">

        <span className="text-slate-500">
          Avg Latency
        </span>

        <span className="mono text-slate-300">
          {latency}s
        </span>

      </div>

    </div>
  );
}

export default StrategyCard;