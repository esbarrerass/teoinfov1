import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProcessSocket } from '../useProcessSocket.js';
import SignalCleaningTab from '../components/process/SignalCleaningTab.jsx';
import FourierTab from '../components/process/FourierTab.jsx';
import PeakDetectionTab from '../components/process/PeakDetectionTab.jsx';
import HrvFeaturesTab from '../components/process/HrvFeaturesTab.jsx';
import ClassificationTab from '../components/process/ClassificationTab.jsx';
import './ProcessPage.css';

const TABS = [
  { id: 'cleaning', label: 'Limpieza de señal' },
  { id: 'fourier', label: 'Fourier' },
  { id: 'peaks', label: 'Detección de picos' },
  { id: 'hrv', label: 'Features HRV' },
  { id: 'classification', label: 'Clasificación' }
];

export default function ProcessPage() {
  const [activeTab, setActiveTab] = useState('cleaning');
  const { connected, analysis, rawSignal, filteredSignal, paused, togglePause } = useProcessSocket();

  return (
    <div className="process-page">
      <header className="process-nav">
        <Link to="/" className="process-back-link">← Systole</Link>
        <div className="process-nav-status">
          <span className={`process-dot ${connected ? 'process-dot-on' : 'process-dot-off'}`} />
          <span>{connected ? 'Conectado' : 'Conectando…'}</span>
          <button
            type="button"
            className="process-pause-btn"
            onClick={togglePause}
            aria-pressed={paused}
          >
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
        </div>
      </header>

      <main className="process-main">
        <h1 className="process-title">Pipeline de procesamiento en vivo</h1>
        <p className="process-subtitle">
          Cada etapa del procesamiento de la señal ECG, actualizándose en tiempo real a
          partir de la misma medición.
        </p>

        <div className="process-tabs" role="tablist" aria-label="Etapas del pipeline">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`process-tab-btn ${activeTab === tab.id ? 'process-tab-btn-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="process-panel" role="tabpanel">
          {activeTab === 'cleaning' && (
            <SignalCleaningTab rawSignal={rawSignal} filteredSignal={filteredSignal} />
          )}
          {activeTab === 'fourier' && <FourierTab analysis={analysis} />}
          {activeTab === 'peaks' && (
            <PeakDetectionTab filteredSignal={filteredSignal} analysis={analysis} />
          )}
          {activeTab === 'hrv' && <HrvFeaturesTab analysis={analysis} />}
          {activeTab === 'classification' && <ClassificationTab analysis={analysis} />}
        </div>
      </main>
    </div>
  );
}
