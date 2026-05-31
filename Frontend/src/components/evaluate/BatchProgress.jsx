function BatchProgress({ job }) {
  if (!job) return null;

  const total = job.total || 0;
  const progress = job.progress || 0;

  const percentage =
    total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="card border border-[#262638]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">
          Batch Progress
        </h3>

        <span className="pill">
          {job.status}
        </span>
      </div>

      <div className="w-full bg-[#262638] rounded-full h-3 mb-4">
        <div
          className="h-3 rounded-full bg-violet-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-slate-400 mb-2">
        {progress} / {total} completed
      </p>

      {job.current_question && (
        <p className="text-sm text-slate-500">
          Current Question: {job.current_question}
        </p>
      )}
    </div>
  );
}

export default BatchProgress;