import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

export default function InfoTheoryPanel({ data }) {
  const infoTheory = data?.infoTheory;

  if (!infoTheory) {
    return (
      <div className="panel-empty">
        <p>Esperando datos del servidor para calcular entropía y capacidad de canal...</p>
      </div>
    );
  }

  const { entropy, huffman, capacity } = infoTheory;
  const nClasses = Object.keys(entropy.probabilities || {}).length;
  const maxEntropy = nClasses > 1 ? Math.log2(nClasses) : 1;
  const entropyPct = maxEntropy > 0 ? Math.min(100, (entropy.entropy / maxEntropy) * 100) : 0;

  const capacityData = [
    { name: 'Canal crudo', bitsPorSeg: capacity.capacityRaw },
    { name: 'Canal filtrado', bitsPorSeg: capacity.capacityFiltered },
  ];

  const huffmanEntries = Object.entries(huffman.codes || {});

  return (
    <section className="info-theory-panel">
      <div className="info-block">
        <h3>Entropía de la secuencia de latidos</h3>
        <div className="entropy-value">
          {entropy.entropy.toFixed(3)} <span className="entropy-unit">bits/latido</span>
        </div>
        <div className="entropy-bar-track" role="img" aria-label={`Entropía ${entropy.entropy.toFixed(3)} bits de un máximo teórico de ${maxEntropy.toFixed(3)} bits para ${nClasses} clases observadas`}>
          <div className="entropy-bar-fill" style={{ width: `${entropyPct}%` }} />
        </div>
        <p className="info-note">Máximo teórico para {nClasses} clase{nClasses !== 1 ? 's' : ''} observada{nClasses !== 1 ? 's' : ''}: {maxEntropy.toFixed(3)} bits/latido</p>

        {nClasses > 0 && (
          <table className="prob-table">
            <caption className="sr-only">Probabilidad de cada clase de clasificación observada</caption>
            <thead>
              <tr><th scope="col">Clase</th><th scope="col">Probabilidad</th></tr>
            </thead>
            <tbody>
              {Object.entries(entropy.probabilities).map(([label, p]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{(p * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="info-block">
        <h3>Codificación Huffman de intervalos RR</h3>
        {huffmanEntries.length === 0 ? (
          <p className="info-note">Acumulando intervalos RR para construir el código...</p>
        ) : (
          <>
            <div className="huffman-cards">
              {huffmanEntries.map(([bin, code]) => (
                <div className="huffman-card" key={bin}>
                  <span className="huffman-bin">{bin} ms</span>
                  <span className="huffman-code">{code}</span>
                  <span className="huffman-freq">{huffman.freqMap[bin]}x</span>
                </div>
              ))}
            </div>
            <div className="huffman-compare">
              <div className="metric">
                <span className="metric-label">Longitud media del código</span>
                <span className="metric-value">{huffman.avgCodeLength.toFixed(3)} bits</span>
              </div>
              <div className="metric">
                <span className="metric-label">Entropía de la fuente</span>
                <span className="metric-value">{huffman.entropy.toFixed(3)} bits</span>
              </div>
            </div>
            <p className="info-note">
              Redundancia (longitud media menos entropía): {huffman.redundancy.toFixed(3)} bits.
              {' '}Cuanto más cerca de 0, más eficiente el código respecto al límite teórico de Shannon.
            </p>
          </>
        )}
      </div>

      <div
        className="info-block"
        role="img"
        aria-label={`Capacidad de canal: ${capacity.capacityRaw.toFixed(0)} bits por segundo sin filtrar, ${capacity.capacityFiltered.toFixed(0)} bits por segundo filtrado.`}
      >
        <h3>Capacidad de canal (Shannon)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={capacityData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#21262d" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="#8b949e" tick={{ fontSize: 12 }} />
            <YAxis stroke="#8b949e" width={50} tick={{ fontSize: 11 }} label={{ value: 'bits/s', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }} />
            <Bar dataKey="bitsPorSeg" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <Cell fill="#8b949e" />
              <Cell fill="#58a6ff" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="info-note">
          El filtrado {capacity.capacityGain >= 0 ? 'incrementa' : 'reduce'} la capacidad del canal en {Math.abs(capacity.capacityGain).toFixed(1)} bits/s
          {' '}(ancho de banda: {capacity.bandwidth} Hz).
        </p>
      </div>
    </section>
  );
}
