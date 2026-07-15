import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

function toSpectrumData(frequencies, rawSpectrum, filteredSpectrum) {
  if (!frequencies) return [];
  return frequencies.map((f, i) => ({
    f: parseFloat(f.toFixed(1)),
    raw: rawSpectrum?.[i] ?? 0,
    filtered: filteredSpectrum?.[i] ?? 0
  }));
}

export default function FourierTab({ analysis }) {
  const fourier = analysis?.fourier;
  const data = toSpectrumData(fourier?.frequencies, fourier?.rawSpectrum, fourier?.filteredSpectrum);

  return (
    <div className="process-tab">
      <p className="process-tab-description">
        La Transformada Rápida de Fourier (FFT) descompone la señal en sus frecuencias
        componentes. Comparar el espectro crudo contra el filtrado muestra qué ruido fue
        eliminado, y permite calcular la relación señal/ruido (SNR).
      </p>

      <div className="process-kpi-row">
        <div className="process-kpi">
          <span className="process-kpi-label">SNR crudo</span>
          <span className="process-kpi-value">{fourier ? `${fourier.snrRaw} dB` : '—'}</span>
        </div>
        <div className="process-kpi">
          <span className="process-kpi-label">SNR filtrado</span>
          <span className="process-kpi-value process-kpi-value-accent">
            {fourier ? `${fourier.snrFiltered} dB` : '—'}
          </span>
        </div>
      </div>

      <div className="process-chart-block">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis
              dataKey="f"
              stroke="#8b949e"
              label={{ value: 'Frecuencia (Hz)', position: 'insideBottom', offset: -4, fill: '#8b949e', fontSize: 12 }}
            />
            <YAxis stroke="#8b949e" width={50} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
            <Line type="linear" dataKey="raw" name="Espectro crudo" stroke="#8b949e" dot={false} isAnimationActive={false} strokeWidth={1.5} />
            <Line type="linear" dataKey="filtered" name="Espectro filtrado" stroke="#58a6ff" dot={false} isAnimationActive={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
