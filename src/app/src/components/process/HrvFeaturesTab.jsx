import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function HrvFeaturesTab({ analysis }) {
  const features = analysis?.features;
  const rrIntervals = features?.rrIntervals || [];
  const rrData = rrIntervals.map((rr, i) => ({ i, rr }));

  return (
    <div className="process-tab">
      <p className="process-tab-description">
        A partir de los intervalos entre picos R consecutivos (RR) se calculan métricas de
        variabilidad de la frecuencia cardíaca (HRV): la frecuencia cardíaca, la desviación
        estándar de los intervalos (SDNN) y la raíz de las diferencias sucesivas (RMSSD).
      </p>

      <div className="process-kpi-row process-kpi-row-4">
        <div className="process-kpi">
          <span className="process-kpi-label">FC</span>
          <span className="process-kpi-value">{features?.fc ?? '—'} lpm</span>
        </div>
        <div className="process-kpi">
          <span className="process-kpi-label">RR medio</span>
          <span className="process-kpi-value">{features?.meanRR ?? '—'} ms</span>
        </div>
        <div className="process-kpi">
          <span className="process-kpi-label">SDNN</span>
          <span className="process-kpi-value process-kpi-value-accent">{features?.sdnn ?? '—'} ms</span>
        </div>
        <div className="process-kpi">
          <span className="process-kpi-label">RMSSD</span>
          <span className="process-kpi-value process-kpi-value-accent">{features?.rmssd ?? '—'} ms</span>
        </div>
      </div>

      <div className="process-chart-block">
        <div className="process-chart-label">Intervalos RR de la ventana actual (ms)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rrData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis stroke="#8b949e" width={50} />
            <Bar dataKey="rr" fill="#58a6ff" isAnimationActive={false} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
