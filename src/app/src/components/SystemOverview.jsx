const STAGES = [
  { label: 'Corazón', detail: 'Fuente de información', chapter: 'Cap. I' },
  { label: 'AD8232', detail: 'Transductor analógico', chapter: 'Cap. II' },
  { label: 'Arduino', detail: 'ADC · PCM 360 Hz', chapter: 'Cap. III' },
  { label: 'Express', detail: 'Filtrado · FFT · Clasificación', chapter: 'Cap. IV / V' },
  { label: 'React', detail: 'Sumidero de información', chapter: 'esta UI' },
];

export default function SystemOverview({ connected }) {
  return (
    <section className="system-overview">
      <h2>El sistema como canal de comunicación</h2>

      <div className="stage-chain">
        {STAGES.map((stage, i) => {
          const isCurrent = i === STAGES.length - 1;
          return (
            <div className="stage-chain-item" key={stage.label}>
              <div className={`stage-card ${isCurrent ? 'stage-card-current' : ''}`}>
                <span className="stage-chapter">{stage.chapter}</span>
                <h3>{stage.label}</h3>
                <p>{stage.detail}</p>
              </div>
              {i < STAGES.length - 1 && <span className="stage-arrow" aria-hidden="true">→</span>}
            </div>
          );
        })}
      </div>

      <div className="overview-text">
        <p>
          El corazón genera una señal bioeléctrica periódica: es la <strong>fuente de información</strong>
          {' '}del sistema. El AD8232 la capta y acondiciona, el Arduino la muestrea a 360 Hz y la convierte
          en un flujo digital (PCM); juntos forman el <strong>canal</strong> que transporta esa información
          hasta el servidor.
        </p>
        <p>
          En el servidor Express, la señal se filtra, se analiza en frecuencia y se clasifica: es el
          <strong> receptor</strong> que decodifica la información útil (ritmo normal o arritmia) a partir
          de la señal cruda. React, esta misma interfaz, es el <strong>sumidero</strong>, el punto donde
          la información llega a quien la necesita.
        </p>
        <p>
          Cada pestaña de esta app corresponde a una etapa distinta de esta cadena: Fourier analiza el
          canal, Muestreo explica cómo se digitalizó la señal, Teoría de la Información mide cuánta
          información se transmite, y Corrección de Errores protege esa transmisión de fallas.
        </p>
      </div>

      <p className="overview-status">
        Canal {connected ? 'activo' : 'inactivo'}, {connected ? 'recibiendo datos en vivo' : 'esperando conexión'}
      </p>
    </section>
  );
}
