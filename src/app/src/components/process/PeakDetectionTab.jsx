import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function PeakDetectionTab({ filteredSignal, analysis }) {
  const signal = analysis?.filtered?.length ? analysis.filtered : filteredSignal;
  const peaks = analysis?.peaks || [];

  const chartData = (signal || []).map((v, i) => ({ i, v }));
  const peakPoints = peaks
    .map((p) => (chartData[p] ? { i: p, v: chartData[p].v } : null))
    .filter(Boolean);

  return (
    <div className="process-tab">
      <p className="process-tab-description">
        El algoritmo Pan-Tompkins detecta los picos R (el pulso principal de cada latido)
        sobre la señal filtrada: deriva, eleva al cuadrado, integra en ventanas móviles y
        aplica un umbral adaptativo con un período refractario fisiológico.
      </p>

      <div className="process-kpi-row">
        <div className="process-kpi">
          <span className="process-kpi-label">Picos detectados (última ventana)</span>
          <span className="process-kpi-value process-kpi-value-accent">{peaks.length}</span>
        </div>
      </div>

      <div className="process-chart-block">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[-1.5, 1.5]} stroke="#8b949e" width={40} />
            <Line type="linear" dataKey="v" stroke="#3fb950" dot={false} isAnimationActive={false} strokeWidth={1.5} />
            <Scatter data={peakPoints} dataKey="v" fill="#f85149" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
