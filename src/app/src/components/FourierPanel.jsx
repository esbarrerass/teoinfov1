import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

function Metric({ label, value, unit }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {value != null && !Number.isNaN(value) ? value.toFixed(1) : '—'} {unit}
      </span>
    </div>
  );
}

export default function FourierPanel({ data }) {
  const fourier = data?.fourier;

  if (!fourier) {
    return (
      <div className="panel-empty">
        <p>Esperando datos del servidor para calcular el espectro...</p>
      </div>
    );
  }

  const timeData = (data.raw || []).map((v, i) => ({
    i,
    raw: v,
    filtered: data.filtered ? data.filtered[i] : null,
  }));

  const spectrumData = fourier.frequencies.map((f, i) => ({
    f: f.toFixed(1),
    raw: fourier.rawSpectrum[i],
    filtered: fourier.filteredSpectrum[i],
  }));

  const delta = fourier.snrFiltered - fourier.snrRaw;

  return (
    <section className="fourier-panel">
      <div className="fourier-metrics">
        <Metric label="SNR crudo" value={fourier.snrRaw} unit="dB" />
        <Metric label="SNR filtrado" value={fourier.snrFiltered} unit="dB" />
        <div className="metric metric-delta">
          <span className="metric-label">Mejora del filtrado</span>
          <span className={`metric-value ${delta >= 0 ? 'metric-positive' : 'metric-negative'}`}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)} dB
          </span>
        </div>
      </div>

      <div
        className="fourier-chart"
        role="img"
        aria-label={`Señal ECG cruda comparada con la señal filtrada en el tiempo. SNR crudo: ${fourier.snrRaw} decibeles, SNR filtrado: ${fourier.snrFiltered} decibeles.`}
      >
        <h3>Señal en el tiempo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timeData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[-1, 1]} stroke="#8b949e" width={40} />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Line
              type="monotone"
              dataKey="raw"
              name="Cruda"
              stroke="#8b949e"
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="filtered"
              name="Filtrada"
              stroke="#3fb950"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        className="fourier-chart"
        role="img"
        aria-label="Espectro de potencia de la señal cruda comparado con la señal filtrada, en el rango de 0 a 55 hercios."
      >
        <h3>Espectro de potencia</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={spectrumData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="f" stroke="#8b949e" tick={{ fontSize: 11 }} label={{ value: 'Hz', position: 'insideBottomRight', offset: -5, fill: '#8b949e', fontSize: 11 }} />
            <YAxis stroke="#8b949e" width={40} tick={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Line
              type="monotone"
              dataKey="raw"
              name="Cruda"
              stroke="#8b949e"
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="filtered"
              name="Filtrada"
              stroke="#58a6ff"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
