import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Legend,
} from "recharts";

const METRIC_LABELS = {
  faithfulness:       "Faithfulness",
  answer_relevancy:   "Relevancy",
  context_precision:  "Precision",
  context_recall:     "Recall",
  answer_correctness: "Correctness",
};

/**
 * Single pipeline radar chart.
 *
 * Props:
 *   scores  — { faithfulness, answer_relevancy, context_precision, context_recall, answer_correctness }
 *   label   — string shown in legend
 *   color   — hex/css color for fill and stroke
 *   height  — chart height in px (default 260)
 */
export function RAGASRadar({ scores, label = "", color = "#7c6cfc", height = 260 }) {
  const data = Object.entries(METRIC_LABELS).map(([key, name]) => ({
    metric: name,
    value: scores ? Math.round((scores[key] || 0) * 100) : 0,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#2a2a38" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: "#9090a8", fontSize: 11, fontFamily: "JetBrains Mono" }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={label}
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
        />
        {label && (
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#9090a8" }}
            formatter={() => <span style={{ color }}>{label}</span>}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}

/**
 * Multi-strategy radar overlay — all strategies on one chart.
 *
 * Props:
 *   dataMap — { strategy_name: { scores: { ... } } }
 *   colors  — { strategy_name: color }
 */
const DEFAULT_COLORS = {
  fixed:     "#f06060",
  recursive: "#7c6cfc",
  semantic:  "#3ef08a",
  vector:    "#f06060",
  rerank:    "#7c6cfc",
  hybrid:    "#3ef08a",
};

export function MultiRAGASRadar({ dataMap, colors = DEFAULT_COLORS, height = 280 }) {
  const keys = Object.keys(dataMap);

  const data = Object.entries(METRIC_LABELS).map(([key, name]) => {
    const point = { metric: name };
    keys.forEach(k => {
      point[k] = Math.round((dataMap[k]?.scores?.[key] || 0) * 100);
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#2a2a38" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: "#9090a8", fontSize: 11, fontFamily: "JetBrains Mono" }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {keys.map(k => (
          <Radar
            key={k}
            name={k}
            dataKey={k}
            stroke={colors[k] || "#7c6cfc"}
            fill={colors[k] || "#7c6cfc"}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        ))}
        <Legend
          wrapperStyle={{ fontSize: 12, fontFamily: "JetBrains Mono", paddingTop: 8 }}
          formatter={(v) => <span style={{ color: colors[v] || "#9090a8" }}>{v}</span>}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}