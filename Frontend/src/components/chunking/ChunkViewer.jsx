function ChunkViewer({
  title,
  contexts,
  color = "violet"
}) {
  const colorMap = {
    red: "border-red-500/30 text-red-400",
    violet: "border-violet-500/30 text-violet-400",
    green: "border-emerald-500/30 text-emerald-400"
  };

  return (
    <div className={`card border ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${colorMap[color]}`}>
          {title}
        </h3>

        <span className="pill">
          {contexts.length} Retrieved
        </span>
      </div>

      <p className="text-slate-500 text-sm mb-5">
        Lower retrieval score means a stronger semantic match.
      </p>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {contexts.map((chunk, index) => (
          <div
            key={index}
            className="bg-[#111118] border border-[#262638] rounded-xl p-4"
          >
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className="pill">
                Chunk #{chunk.chunk_id}
              </span>

              <span className="pill">
                Rank #{chunk.rank}
              </span>

              <span
                className={`pill ${
                    chunk.score < 0.8
                    ? "text-emerald-400 border-emerald-500/30"
                    : chunk.score < 1.15
                    ? "text-yellow-400 border-yellow-500/30"
                    : "text-red-400 border-red-500/30"
                }`}
                >
                Score {chunk.score}
                </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {chunk.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChunkViewer;