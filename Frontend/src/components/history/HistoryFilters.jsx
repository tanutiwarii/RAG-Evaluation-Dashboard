function HistoryFilters({
  search,
  setSearch,
  winnerFilter,
  setWinnerFilter,
  sortOrder,
  setSortOrder
}) {
  return (
    <div className="card border border-[#262638] mb-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search experiments by question..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />

        <select
          value={winnerFilter}
          onChange={(e) => setWinnerFilter(e.target.value)}
          className="w-full p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">All Winners</option>
          <option value="fixed">Fixed Winners</option>
          <option value="recursive">Recursive Winners</option>
          <option value="semantic">Semantic Winners</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-full p-4 rounded-2xl bg-[#111118] border border-[#2a2a38] text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
    </div>
  );
}

export default HistoryFilters;