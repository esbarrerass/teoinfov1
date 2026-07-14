import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;
const EXP_MIN = -6;
const EXP_MAX = -1;

function bitsToStr(bits) {
  return bits.map((b) => (b === 1 ? '1' : '0')).join('');
}

function bytesToHex(bytes) {
  return bytes.map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

function diffIndices(a, b) {
  const s = new Set();
  a.forEach((v, i) => {
    if (v !== b[i]) s.add(i);
  });
  return s;
}

function formatBer(exp) {
  return (
    <>
      10<sup>{exp}</sup>
    </>
  );
}

export default function ErrorCorrPanel() {
  const [exponent, setExponent] = useState(-2);
  const [result, setResult] = useState(null);
  const [runId, setRunId] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const ber = Math.pow(10, exponent);

  const runSimulation = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/error-correction/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ber }),
      });
      if (!res.ok) throw new Error('Respuesta no válida del servidor');
      const json = await res.json();
      setResult(json);
      setRunId((n) => n + 1);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  const crcChanged = result ? diffIndices(result.crc.original, result.crc.corrupted) : new Set();
  const hammingChanged = result ? diffIndices(result.hamming.encoded, result.hamming.corruptedBits) : new Set();
  const hammingFixed = result ? result.hamming.decoded.every((b, i) => b === result.hamming.bits[i]) : false;

  return (
    <section className="error-corr-panel">
      <div className="error-control">
        <label htmlFor="ber-slider">
          Tasa de error de bit simulada (BER): <strong>{formatBer(exponent)}</strong>
        </label>
        <input
          id="ber-slider"
          type="range"
          min={EXP_MIN}
          max={EXP_MAX}
          step={1}
          value={exponent}
          onChange={(e) => setExponent(Number(e.target.value))}
          aria-valuetext={`BER de ${ber.toExponential(0)}`}
        />
        <div className="sampling-ticks">
          {Array.from({ length: EXP_MAX - EXP_MIN + 1 }, (_, i) => EXP_MIN + i).map((exp) => (
            <span key={exp}>
              10<sup>{exp}</sup>
            </span>
          ))}
        </div>
        <button className="error-simulate-btn" onClick={runSimulation} disabled={status === 'loading'}>
          {status === 'loading' ? 'Simulando…' : 'Simular transmisión con ruido'}
        </button>
        {status === 'error' && (
          <p className="error-note error-note-bad" role="alert">
            No se pudo contactar al servidor. Verifica que esté corriendo e inténtalo de nuevo.
          </p>
        )}
      </div>

      {!result ? (
        <div className="panel-empty">
          <p>Ajusta el BER y presiona "Simular transmisión con ruido" para ver cómo CRC-8 y Hamming(7,4) responden a errores del canal.</p>
        </div>
      ) : (
        <div aria-live="polite" key={runId} className="error-results">
          <div className="info-block">
            <h3>Detección de errores — CRC-8</h3>
            <div className="error-table-scroll">
            <table className="prob-table error-bits-table">
              <caption className="sr-only">Bytes originales, corrompidos y verificación CRC-8</caption>
              <thead>
                <tr>
                  <th scope="col">Bytes originales</th>
                  <th scope="col">Bytes recibidos (con ruido)</th>
                  <th scope="col">CRC esperado</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">{bytesToHex(result.crc.original)}</td>
                  <td className="mono">
                    {result.crc.corrupted.map((b, i) => (
                      <span
                        key={i}
                        className={crcChanged.has(i) ? 'bit-flip' : ''}
                        title={crcChanged.has(i) ? `Byte ${i + 1} alterado por el canal` : undefined}
                      >
                        {'0x' + b.toString(16).toUpperCase().padStart(2, '0')}{' '}
                      </span>
                    ))}
                  </td>
                  <td className="mono">0x{result.crc.expectedCRC.toString(16).toUpperCase().padStart(2, '0')}</td>
                  <td>
                    <span className={`status-pill ${result.crc.valid ? 'status-ok' : 'status-bad'}`}>
                      {result.crc.valid ? 'Válido — sin corrupción detectada' : 'Inválido — corrupción detectada'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
            <p className="info-note">
              {result.crc.valid
                ? 'El CRC-8 recalculado coincide: los bytes llegaron intactos o el error fue indetectable para este checksum.'
                : 'El CRC-8 recalculado no coincide con el esperado: el receptor puede rechazar este paquete y solicitar reenvío.'}
            </p>
          </div>

          <div className="info-block">
            <h3>Corrección de errores — Hamming(7,4)</h3>
            <div className="error-table-scroll">
            <table className="prob-table error-bits-table">
              <caption className="sr-only">Bits originales, codificados, con error y decodificados usando Hamming(7,4)</caption>
              <thead>
                <tr>
                  <th scope="col">Bits originales</th>
                  <th scope="col">Codificados (7,4)</th>
                  <th scope="col">Recibidos (con ruido)</th>
                  <th scope="col">Decodificados</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">{bitsToStr(result.hamming.bits)}</td>
                  <td className="mono">{bitsToStr(result.hamming.encoded)}</td>
                  <td className="mono">
                    {result.hamming.corruptedBits.map((b, i) => (
                      <span
                        key={i}
                        className={hammingChanged.has(i) ? 'bit-flip' : ''}
                        title={hammingChanged.has(i) ? `Bit ${i + 1} alterado por el canal` : undefined}
                      >
                        {b}
                      </span>
                    ))}
                  </td>
                  <td className="mono">{bitsToStr(result.hamming.decoded)}</td>
                  <td>
                    <span className={`status-pill ${hammingFixed ? 'status-ok' : 'status-bad'}`}>
                      {hammingFixed ? 'Corregido — bits originales recuperados' : 'No recuperado — error excede capacidad de corrección'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
            <p className="info-note">
              Hamming(7,4) corrige automáticamente 1 bit erróneo por bloque de 7. Con BER alto, la probabilidad de 2+ errores en el mismo bloque aumenta y la corrección puede fallar.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
