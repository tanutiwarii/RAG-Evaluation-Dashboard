function SummaryCard({ title, value }) {
  return (
    <div className="card border border-[#262638]">
      <p className="text-slate-500 text-sm uppercase tracking-wider mb-3">
        {title}
      </p>

      <h3 className="text-4xl font-bold">
        {value}
      </h3>
    </div>
  );
}

export default SummaryCard;