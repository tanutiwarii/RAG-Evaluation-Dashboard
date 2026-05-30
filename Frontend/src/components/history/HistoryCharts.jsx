import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

function HistoryCharts({ trendData, winnerData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
      <div className="card border border-[#262638]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="card-title">
              Correctness Trend
            </div>

            <p className="text-slate-500 text-sm mt-2">
              Track answer correctness across experiment runs.
            </p>
          </div>

          <div className="pill">
            HISTORY ANALYTICS
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#232336"
            />

            <XAxis dataKey="run" stroke="#7a7a92" />

            <YAxis domain={[0, 1]} stroke="#7a7a92" />

            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #2a2a38",
                borderRadius: "12px",
                color: "#fff"
              }}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="fixed_correctness"
              stroke="#ef4444"
              strokeWidth={3}
            />

            <Line
              type="monotone"
              dataKey="recursive_correctness"
              stroke="#8b5cf6"
              strokeWidth={3}
            />

            <Line
              type="monotone"
              dataKey="semantic_correctness"
              stroke="#10b981"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card border border-[#262638]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="card-title">
              Winner Distribution
            </div>

            <p className="text-slate-500 text-sm mt-2">
              See which chunking strategy wins most often.
            </p>
          </div>

          <div className="pill">
            STRATEGY WINS
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={winnerData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={4}
              label
            >
              {winnerData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #2a2a38",
                borderRadius: "12px",
                color: "#fff"
              }}
            />

            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default HistoryCharts;