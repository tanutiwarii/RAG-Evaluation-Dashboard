import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend
} from "recharts";


function RadarComparison({
  fixed,
  recursive,
  semantic
}) {

  const data = [

    {
      metric: "Faithfulness",
      Fixed: fixed.faithfulness * 100,
      Recursive: recursive.faithfulness * 100,
      Semantic: semantic.faithfulness * 100
    },

    {
      metric: "Answer Relevance",
      Fixed: fixed.answer_relevancy * 100,
      Recursive: recursive.answer_relevancy * 100,
      Semantic: semantic.answer_relevancy * 100
    },

    {
      metric: "Context Precision",
      Fixed: fixed.context_precision * 100,
      Recursive: recursive.context_precision * 100,
      Semantic: semantic.context_precision * 100
    },

    {
      metric: "Context Recall",
      Fixed: fixed.context_recall * 100,
      Recursive: recursive.context_recall * 100,
      Semantic: semantic.context_recall * 100
    },

    {
      metric: "Answer Correctness",
      Fixed: fixed.answer_correctness * 100,
      Recursive: recursive.answer_correctness * 100,
      Semantic: semantic.answer_correctness * 100
    }

  ];


  return (

    <div className="card">

      <div className="flex items-center justify-between mb-6">

        <div>

          <div className="card-title">
            RAG Dimension Overlay
          </div>

          <p className="text-slate-500 text-sm mt-2">
            Radar comparison across retrieval and answer quality metrics.
          </p>

        </div>

        <div className="pill">
          RAGAS-STYLE
        </div>

      </div>


      <ResponsiveContainer
        width="100%"
        height={280}
      >

        <RadarChart data={data}>

          <PolarGrid stroke="#2a2a38" />

          <PolarAngleAxis
            dataKey="metric"
            tick={{
              fill: "#9090a8",
              fontSize: 11
            }}
          />

          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />

          <Radar
            name="Fixed"
            dataKey="Fixed"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.12}
            strokeWidth={2}
          />

          <Radar
            name="Recursive"
            dataKey="Recursive"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.12}
            strokeWidth={2}
          />

          <Radar
            name="Semantic"
            dataKey="Semantic"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.12}
            strokeWidth={2}
          />

          <Legend />

        </RadarChart>

      </ResponsiveContainer>

    </div>
  );
}


export default RadarComparison;