function HistoryHeader({
  onRefresh,
  onExportFullHistory,
  onClearHistory
}) {
  return (
    <div className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>

        <p className="text-white-500 font-bold mb-2">
          Track experiment runs, compare chunking strategies,
          and analyze performance trends over time.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24] whitespace-nowrap"
        >
          Refresh
        </button>

        <button
          onClick={onExportFullHistory}
          className="px-4 py-2 rounded-lg border border-[#383850] text-slate-300 hover:bg-[#1a1a24] whitespace-nowrap"
        >
          Export Full History
        </button>

        <button
          onClick={onClearHistory}
          className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 whitespace-nowrap"
        >
          Clear History
        </button>
      </div>
    </div>
  );
}

export default HistoryHeader;