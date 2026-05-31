function StrategyLeaderboard({ strategyLeaderboard }) {
  return (
    <div className="card border border-[#262638] mb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="card-title">
            Strategy Leaderboard
          </div>

          <p className="text-slate-500 text-sm mt-2">
            Compare strategy wins, correctness, and latency over all runs.
          </p>
        </div>

        <div className="pill">
          STRATEGY RANKING
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 border-b border-[#262638]">
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Strategy</th>
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Wins</th>
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Avg Correctness</th>
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Avg Latency</th>
            </tr>
          </thead>

          <tbody>
            {strategyLeaderboard.map((item) => (
              <tr
                key={item.strategy}
                className="border-b border-[#1d1d28]"
              >
                <td className="py-2 font-semibold">
                  {item.label}
                </td>

                <td className="py-2 mono">
                  {item.wins}
                </td>

                <td className="py-2 mono">
                  {item.avgCorrectness.toFixed(1)}%
                </td>

                <td className="py-2 mono">
                  {item.avgLatency.toFixed(2)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StrategyLeaderboard;