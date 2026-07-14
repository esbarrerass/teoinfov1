import { useEffect, useRef } from 'react';
import { signalQuality } from '../signalQuality.js';
import './ResultsPanel.css';

function Metric({ label, value, unit }) {
  return (
    <div className="results-metric">
      <span className="results-metric-label">{label}</span>
      <span className="results-metric-value">
        {value != null && !Number.isNaN(value) ? value : '—'} {unit}
      </span>
    </div>
  );
}

export default function ResultsPanel({ open, data, onClose, onMeasureAgain }) {
  const classification = data?.classification;
  const features = data?.features;
  const fourier = data?.fourier;
  const quality = signalQuality(fourier?.snrFiltered);
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`results-scrim ${open ? 'results-scrim-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        className={`results-panel ${open ? 'results-panel-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Resultados de la medición"
        aria-hidden={!open}
        inert={!open ? '' : undefined}
      >
        <div className="results-header">
          <h2>Resultados</h2>
          <button ref={closeBtnRef} className="results-close-btn" onClick={onClose} aria-label="Cerrar panel de resultados">
            ✕
          </button>
        </div>

        {!classification ? (
          <p className="results-empty">Aún no hay una medición completa.</p>
        ) : (
          <div className="results-body">
            <div className={`results-classification ${classification.isAbnormal ? 'results-classification-abnormal' : 'results-classification-normal'}`}>
              <span className="results-classification-label">{classification.label}</span>
              <span className="results-classification-badge">
                {classification.isAbnormal ? 'Anormal' : 'Normal'}
              </span>
            </div>
            <p className="results-reason">{classification.reason}</p>
            <p className="results-confidence">
              Confianza del modelo: <strong>{(classification.confidence * 100).toFixed(1)}%</strong>
            </p>

            {features?.valid && (
              <div className="results-section">
                <h3>Variabilidad de la frecuencia cardíaca</h3>
                <div className="results-metrics-grid">
                  <Metric label="Frecuencia cardíaca" value={features.fc} unit="lpm" />
                  <Metric label="Intervalo RR medio" value={features.meanRR} unit="ms" />
                  <Metric label="SDNN" value={features.sdnn} unit="ms" />
                  <Metric label="RMSSD" value={features.rmssd} unit="ms" />
                </div>
              </div>
            )}

            {fourier && quality && (
              <div className="results-section">
                <h3>Calidad de la señal</h3>
                <p className={`results-quality-badge ${quality.className}`}>{quality.label}</p>
                <div className="results-metrics-grid">
                  <Metric label="SNR crudo" value={fourier.snrRaw} unit="dB" />
                  <Metric label="SNR filtrado" value={fourier.snrFiltered} unit="dB" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="results-actions">
          <button className="results-measure-again-btn" onClick={onMeasureAgain}>
            Medir de nuevo
          </button>
        </div>
      </aside>
    </>
  );
}
