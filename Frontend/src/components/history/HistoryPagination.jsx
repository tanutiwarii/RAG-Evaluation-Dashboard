function HistoryPagination({
  currentPage,
  totalPages,
  setCurrentPage
}) {
  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((prev) => prev - 1)}
        className="px-4 py-2 rounded-lg border border-[#383850] disabled:opacity-40"
      >
        Previous
      </button>

      <span className="text-slate-400">
        Page {currentPage} of {totalPages}
      </span>

      <button
        disabled={currentPage >= totalPages}
        onClick={() => setCurrentPage((prev) => prev + 1)}
        className="px-4 py-2 rounded-lg border border-[#383850] disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export default HistoryPagination;