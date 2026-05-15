export type MetricAggregate = {
  faithfulness: number | null;
  answer_relevance: number | null;
  context_precision: number | null;
  context_recall: number | null;
  latency_ms_mean: number | null;
  latency_ms_p50: number | null;
};

export type RowScores = {
  index: number;
  faithfulness: number | null;
  answer_relevance: number | null;
  context_precision: number | null;
  context_recall: number | null;
  latency_ms: number | null;
};

export type EvaluatePayload = {
  run_id: string;
  created_at: string;
  aggregates: MetricAggregate;
  rows: RowScores[];
  warnings: string[];
};

export type RunSummary = {
  run_id: string;
  created_at: string;
  label: string | null;
  aggregates: MetricAggregate;
};
