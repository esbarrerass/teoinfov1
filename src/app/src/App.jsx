import { useState } from 'react';
import { useECGSocket } from './useECGSocket.js';
import ECGChart from './components/ECGChart.jsx';
import Controls from './components/Controls.jsx';
import StatusBar from './components/StatusBar.jsx';
import FeaturesPanel from './components/FeaturesPanel.jsx';
import SystemOverview from './components/SystemOverview.jsx';
import FourierPanel from './components/FourierPanel.jsx';
import SamplingDemo from './components/SamplingDemo.jsx';
import InfoTheoryPanel from './components/InfoTheoryPanel.jsx';
import ErrorCorrPanel from './components/ErrorCorrPanel.jsx';
import './App.css';

const TABS = [
  { id: 'fourier', label: 'Fourier' },
  { id: 'sistema', label: 'Cap. I — Sistema' },
  { id: 'muestreo', label: 'Cap. III — Muestreo' },
  { id: 'infoTeoria', label: 'Cap. IV — Teoría de la Información' },
  { id: 'correccion', label: 'Cap. V — Corrección de Errores' },
];

export default function App() {
  const { connected, data, scrollSignal, connect, disconnect } = useECGSocket();
  const [activeTab, setActiveTab] = useState('fourier');

  return (
    <div className="app">
      <header>
        <h1>ECG TeoInfo</h1>
        <StatusBar connected={connected} classification={data?.classification} />
      </header>

      <Controls connected={connected} onStart={connect} onStop={disconnect} />

      <ECGChart signal={scrollSignal} />

      <FeaturesPanel features={data?.features} />

      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {activeTab === 'sistema' && <SystemOverview connected={connected} />}
        {activeTab === 'fourier' && <FourierPanel data={data} />}
        {activeTab === 'muestreo' && <SamplingDemo data={data} />}
        {activeTab === 'infoTeoria' && <InfoTheoryPanel data={data} />}
        {activeTab === 'correccion' && <ErrorCorrPanel />}
      </div>
    </div>
  );
}
