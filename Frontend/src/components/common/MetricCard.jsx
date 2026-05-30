function MetricCard({ title, value }) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg mb-3 text-slate-300">
        {title}
      </h3>

      <p className="text-4xl font-bold">
        {value}
      </p>
    </div>
  );
}

export default MetricCard;