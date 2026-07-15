import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const FEATURE_LABELS = {
  meanRR: 'RR medio',
  sdnn: 'SDNN',
  rmssd: 'RMSSD',
  fc: 'FC',
  lfhf: 'LF/HF'
};

export default function ClassificationTab({ analysis }) {
  const classification = analysis?.classification;
  const vector = classification?.featureVector;

  const chartData = vector
    ? vector.keys.map((key, i) => ({
        key: FEATURE_LABELS[key] || key,
        value: parseFloat(vector.normalized[i].toFixed(2))
      }))
    : [];

  const isAbnormal = classification?.isAbnormal;

  return (
    <div className="process-tab">
      <p className="process-tab-description">
        Cada ventana de latidos se convierte en un vector de características, normalizado
        (media 0, desviación 1) según el dataset MIT-BIH de entrenamiento, y se pasa a un
        clasificador SVM (kernel RBF) que decide entre Normal y Anormal.
      </p>

      <div className={`process-classification-badge ${isAbnormal ? 'process-badge-abnormal' : 'process-badge-normal'}`}>
        {classification?.label || 'Sin datos'}
      </div>
      {classification?.reason && (
        <p className="process-classification-reason">{classification.reason}</p>
      )}

      {vector && (
        <div className="process-chart-block">
          <div className="process-chart-label">Vector normalizado (z-score vs. dataset de entrenamiento)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
              <XAxis type="number" domain={[-3, 3]} stroke="#8b949e" />
              <YAxis type="category" dataKey="key" stroke="#8b949e" width={70} />
              <ReferenceLine x={0} stroke="#30363d" />
              <Bar dataKey="value" isAnimationActive={false} radius={[0, 3, 3, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={Math.abs(entry.value) > 2 ? '#f85149' : '#58a6ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
