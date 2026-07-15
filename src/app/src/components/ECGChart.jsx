import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function ECGChart({ signal }) {
  const chartData = (signal || []).map((v, i) => ({ i, v }));

  return (
    <div className="ecg-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
          <XAxis dataKey="i" hide />
          <YAxis domain={[-1.5, 1.5]} stroke="#8b949e" width={40} />
          <Line
            type="linear"
            dataKey="v"
            stroke="#3fb950"
            dot={false}
            isAnimationActive={false}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
