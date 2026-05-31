function BatchResultsTable({ results }) {
  if (!results?.length) return null;

  return (
    <div className="card border border-[#262638]">
      <h3 className="text-xl font-bold mb-4">
        Evaluation Details
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#262638]">
              <th className="text-left py-3 pr-4">Question</th>
              <th className="text-left py-3 pr-4">Generated Answer</th>
              <th className="text-left py-3 pr-4">Ground Truth</th>
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Faithfulness</th>
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Correctness</th>
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Precision</th>
              <th className="text-left py-2 text-xs uppercase tracking-wide text-slate-400">Recall</th>
            </tr>
          </thead>

          <tbody>
            {results.map((item) => (
              <tr
                key={item.index}
                className="border-b border-[#1d1d28] align-top"
              >
                <td className="py-2 pr-4 max-w-[220px]">
                  {item.question}
                </td>

                <td className="py-2 pr-4 max-w-[280px] text-slate-400">
                  {item.answer || "No answer generated"}
                </td>

                <td className="py-2 pr-4 max-w-[280px] text-slate-400">
                  {item.ground_truth || "Not provided"}
                </td>

                <td className="py-2 mono">
                  {item.metrics.faithfulness}
                </td>

                <td className="py-2 mono">
                  {item.metrics.answer_correctness}
                </td>

                <td className="py-2 mono">
                  {item.metrics.context_precision}
                </td>

                <td className="py-2 mono">
                  {item.metrics.context_recall}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BatchResultsTable;
