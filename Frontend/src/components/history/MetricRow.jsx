function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="mono">
        {value}
      </span>
    </div>
  );
}

export default MetricRow;