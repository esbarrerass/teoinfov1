import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const FS_ORIGINAL = 360;
const FS_OPTIONS = [360, 100, 60];
const BIT_OPTIONS = [4, 8, 10, 12];

function decimate(signal, fsSimulada) {
  const step = Math.round(FS_ORIGINAL / fsSimulada);
  if (step <= 1) return signal.map((v, i) => ({ i, original: v, submuestreada: v }));
  return signal.map((v, i) => ({
    i,
    original: v,
    submuestreada: i % step === 0 ? v : null,
  }));
}

function quantize(signal, bits) {
  const min = Math.min(...signal);
  const max = Math.max(...signal);
  const range = max - min || 1;
  const levels = Math.pow(2, bits);
  const delta = range / levels;

  const quantized = signal.map((v) => {
    const level = Math.round((v - min) / delta);
    return min + level * delta;
  });

  const errors = signal.map((v, i) => v - quantized[i]);
  const rmsError = Math.sqrt(errors.reduce((acc, e) => acc + e * e, 0) / errors.length);
  const theoreticalError = delta / Math.sqrt(12);

  return { quantized, delta, rmsError, theoreticalError };
}

export default function SamplingDemo({ data }) {
  const [fsSimulada, setFsSimulada] = useState(360);
  const [bits, setBits] = useState(10);

  const raw = data?.raw;

  const samplingData = useMemo(() => {
    if (!raw) return [];
    return decimate(raw, fsSimulada);
  }, [raw, fsSimulada]);

  const quantization = useMemo(() => {
    if (!raw) return null;
    return quantize(raw, bits);
  }, [raw, bits]);

  const quantizationData = useMemo(() => {
    if (!raw || !quantization) return [];
    return raw.map((v, i) => ({ i, original: v, cuantizada: quantization.quantized[i] }));
  }, [raw, quantization]);

  if (!raw) {
    return (
      <div className="panel-empty">
        <p>Esperando datos del servidor para la demo de muestreo...</p>
      </div>
    );
  }

  return (
    <section className="sampling-demo">
      <div className="sampling-chart">
        <div className="sampling-control">
          <label htmlFor="fs-slider">
            Frecuencia de muestreo simulada: <strong>{fsSimulada} Hz</strong>
            {fsSimulada < FS_ORIGINAL && <span className="sampling-warning"> (bajo Nyquist para ECG, aliasing visible)</span>}
          </label>
          <input
            id="fs-slider"
            type="range"
            min={0}
            max={FS_OPTIONS.length - 1}
            step={1}
            value={FS_OPTIONS.indexOf(fsSimulada)}
            onChange={(e) => setFsSimulada(FS_OPTIONS[Number(e.target.value)])}
            aria-valuetext={`${fsSimulada} hercios`}
          />
          <div className="sampling-ticks">
            {FS_OPTIONS.map((fs) => <span key={fs}>{fs} Hz</span>)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={samplingData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[-1, 1]} stroke="#8b949e" width={40} />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Line type="monotone" dataKey="original" name="Original (360 Hz)" stroke="#8b949e" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="submuestreada" name={`Submuestreada (${fsSimulada} Hz)`} stroke="#f85149" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="sampling-chart">
        <div className="sampling-control">
          <label htmlFor="bits-slider">
            Cuantización: <strong>{bits} bits</strong> ({Math.pow(2, bits)} niveles)
          </label>
          <input
            id="bits-slider"
            type="range"
            min={0}
            max={BIT_OPTIONS.length - 1}
            step={1}
            value={BIT_OPTIONS.indexOf(bits)}
            onChange={(e) => setBits(BIT_OPTIONS[Number(e.target.value)])}
            aria-valuetext={`${bits} bits, ${Math.pow(2, bits)} niveles`}
          />
          <div className="sampling-ticks">
            {BIT_OPTIONS.map((b) => <span key={b}>{b} bits</span>)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={quantizationData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[-1, 1]} stroke="#8b949e" width={40} />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Line type="monotone" dataKey="original" name="Original" stroke="#8b949e" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="cuantizada" name="Cuantizada" stroke="#58a6ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        {quantization && (
          <div className="sampling-metrics">
            <div className="metric">
              <span className="metric-label">Error de cuantización (medido)</span>
              <span className="metric-value">{quantization.rmsError.toFixed(4)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Error teórico (Δ/√12)</span>
              <span className="metric-value">{quantization.theoreticalError.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="sampling-packet">
        <h3>Estructura del paquete PCM serial</h3>
        <div className="packet-diagram">
          <div className="packet-byte">
            <span className="packet-byte-label">START</span>
            <span className="packet-byte-value">0xFF</span>
          </div>
          <div className="packet-byte">
            <span className="packet-byte-label">VALOR_HIGH</span>
            <span className="packet-byte-value">bits [9:8]</span>
          </div>
          <div className="packet-byte">
            <span className="packet-byte-label">VALOR_LOW</span>
            <span className="packet-byte-value">bits [7:0]</span>
          </div>
          <div className="packet-byte">
            <span className="packet-byte-label">CRC-8</span>
            <span className="packet-byte-value">checksum</span>
          </div>
        </div>
        <p className="packet-note">4 bytes x 360 muestras/s = 1440 bytes/s (11520 bits/s) por el puerto serial.</p>
      </div>
    </section>
  );
}
