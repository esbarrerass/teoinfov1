import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

function toChartData(signal) {
  return (signal || []).map((v, i) => ({ i, v }));
}

// raw y filtered llegan alineados por índice (mismo buffer, mismos chunks del
// WebSocket) — la resta muestra exactamente lo que el filtrado eliminó, en vez
// de forzar una escala que no hace visible una diferencia que es de contenido
// espectral (ruido de alta frecuencia + deriva), no de amplitud.
function toDiffData(rawSignal, filteredSignal) {
  const len = Math.min(rawSignal?.length || 0, filteredSignal?.length || 0);
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = { i, v: rawSignal[i] - filteredSignal[i] };
  return out;
}

export default function SignalCleaningTab({ rawSignal, filteredSignal }) {
  const diffData = toDiffData(rawSignal, filteredSignal);

  return (
    <div className="process-tab">
      <p className="process-tab-description">
        La señal cruda del sensor AD8232 pasa por tres filtros digitales en cascada: un
        pasa-altas de 0.5&nbsp;Hz (elimina deriva de línea base), un pasa-bajas de ~40&nbsp;Hz
        (elimina ruido muscular) y un notch de 60&nbsp;Hz (interferencia de la red eléctrica).
        El AD8232 ya aplica su propio filtrado analógico, así que la diferencia entre cruda y
        filtrada es sutil a simple vista — el tercer gráfico la hace explícita: es la resta
        cruda&nbsp;−&nbsp;filtrada, es decir, exactamente lo que el filtrado eliminó.
      </p>

      <div className="process-chart-block">
        <div className="process-chart-label">
          <span className="process-legend-dot process-legend-raw" />
          Señal cruda
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={toChartData(rawSignal)} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[-1.5, 1.5]} stroke="#8b949e" width={40} />
            <Line type="linear" dataKey="v" stroke="#8b949e" dot={false} isAnimationActive={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="process-chart-block">
        <div className="process-chart-label">
          <span className="process-legend-dot process-legend-filtered" />
          Señal filtrada
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={toChartData(filteredSignal)} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[-1.5, 1.5]} stroke="#8b949e" width={40} />
            <Line type="linear" dataKey="v" stroke="#3fb950" dot={false} isAnimationActive={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="process-chart-block">
        <div className="process-chart-label">
          <span className="process-legend-dot process-legend-diff" />
          Ruido eliminado (cruda − filtrada)
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={diffData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[-0.3, 0.3]} stroke="#8b949e" width={40} />
            <Line type="linear" dataKey="v" stroke="#d29922" dot={false} isAnimationActive={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
