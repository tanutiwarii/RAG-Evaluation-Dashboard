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
  recursive
}) {

  const data = [

    {
      metric: "Faithfulness",

      Fixed:
        fixed.faithfulness * 100,

      Recursive:
        recursive.faithfulness * 100
    },

    {
      metric: "Relevancy",

      Fixed:
        fixed.answer_relevancy * 100,

      Recursive:
        recursive.answer_relevancy * 100
    },

    {
      metric: "Context",

      Fixed:
        fixed.context_utilization * 100,

      Recursive:
        recursive.context_utilization * 100
    }

  ];


  return (

    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">

      <h2 className="text-2xl font-semibold mb-6">
        RAGAS Dimension Comparison
      </h2>

      <ResponsiveContainer
        width="100%"
        height={400}
      >

        <RadarChart data={data}>

          <PolarGrid />

          <PolarAngleAxis dataKey="metric" />

          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
          />

          <Radar
            name="Fixed"
            dataKey="Fixed"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.4}
          />

          <Radar
            name="Recursive"
            dataKey="Recursive"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.4}
          />

          <Legend />

        </RadarChart>

      </ResponsiveContainer>

    </div>
  );
}


export default RadarComparison;