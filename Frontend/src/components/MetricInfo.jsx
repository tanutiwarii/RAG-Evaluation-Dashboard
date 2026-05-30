const METRIC_INFO = {
  faithfulness: {
    title: "Faithfulness",
    meaning:
      "Checks whether the generated answer is supported by the retrieved context.",
    good:
      "A high score means the answer is grounded in the retrieved chunks.",
    calculation:
      "Calculated using overlap between answer tokens and context tokens."
  },

  answer_relevancy: {
    title: "Answer Relevancy",
    meaning:
      "Checks whether the answer is relevant to the user question.",
    good:
      "A high score means the response directly addresses the question.",
    calculation:
      "Calculated using overlap between question tokens and answer tokens with a length factor."
  },

  context_precision: {
    title: "Context Precision",
    meaning:
      "Checks how many retrieved chunks are actually useful.",
    good:
      "A high score means most retrieved chunks are relevant.",
    calculation:
      "Calculated using question-context and answer-context overlap."
  },

  context_recall: {
    title: "Context Recall",
    meaning:
      "Checks whether the retrieved context covers the information needed for the answer.",
    good:
      "A high score means the retrieved chunks contain enough supporting evidence.",
    calculation:
      "Calculated using answer coverage in retrieved context with a noise penalty."
  },

  answer_correctness: {
    title: "Answer Correctness",
    meaning:
      "Checks how close the generated answer is to the expected ground-truth answer.",
    good:
      "A high score means the generated answer matches the expected answer.",
    calculation:
      "If ground truth is provided, calculated using token-level F1 between answer and ground truth."
  }
};

function MetricInfo() {
  return (
    <div className="card mb-8 border border-[#262638]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="card-title">
            Metric Definitions
          </div>

          <p className="text-slate-500 text-sm mt-2">
            Understand how each evaluation dimension is interpreted.
          </p>
        </div>

        <div className="pill">
          EXPLAINABILITY
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {Object.entries(METRIC_INFO).map(([key, metric]) => (
          <div
            key={key}
            className="bg-[#111118] border border-[#262638] rounded-xl p-4"
          >
            <h3 className="text-lg font-bold mb-3">
              {metric.title}
            </h3>

            <p className="text-slate-400 text-sm mb-3">
              {metric.meaning}
            </p>

            <p className="text-emerald-400 text-sm mb-3">
              {metric.good}
            </p>

            <p className="text-slate-500 text-xs leading-relaxed">
              {metric.calculation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetricInfo;