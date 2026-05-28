function StrategyCard({
  name,
  score,
  chunkCount,
  latency,
  color = "violet"
}) {
  const colorClasses = {
    red: "border-red-500 text-red-400",
    violet: "border-violet-500 text-violet-400",
    green: "border-green-500 text-green-400",
  };

  return (
    <div className={`bg-slate-900 border ${colorClasses[color]} p-6 rounded-xl`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold lowercase">
          {name}
        </h3>

        <span className="px-3 py-1 bg-slate-800 rounded-lg text-sm">
          {chunkCount} chunks
        </span>
      </div>

      <p className="text-5xl font-bold mb-4">
        {(score * 100).toFixed(1)}%
      </p>

      <p className="text-slate-400 text-sm">
        {latency}s latency
      </p>
    </div>
  );
}

export default StrategyCard;