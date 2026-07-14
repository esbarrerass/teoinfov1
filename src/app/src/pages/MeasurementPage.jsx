import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useECGSocket } from '../useECGSocket.js';
import { signalQuality } from '../signalQuality.js';
import ECGChart from '../components/ECGChart.jsx';
import ResultsPanel from '../components/ResultsPanel.jsx';
import './MeasurementPage.css';

const DURATION_S = 60;
const COUNTDOWN_RADIUS = 45;
const COUNTDOWN_CIRCUMFERENCE = 2 * Math.PI * COUNTDOWN_RADIUS;

export default function MeasurementPage() {
  const { connected, data, scrollSignal, connect, disconnect } = useECGSocket();
  const [phase, setPhase] = useState('idle'); // idle | measuring | done
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [result, setResult] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const intervalRef = useRef(null);
  const latestDataRef = useRef(null);

  latestDataRef.current = data;

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    disconnect();
  }, [disconnect]);

  const startMeasurement = () => {
    setResult(null);
    setPanelOpen(false);
    setSecondsLeft(DURATION_S);
    setPhase('measuring');
    connect();

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setResult(latestDataRef.current);
          setPhase('done');
          setPanelOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const measureAgain = () => {
    startMeasurement();
  };

  const progress = ((DURATION_S - secondsLeft) / DURATION_S) * 100;
  const liveQuality = phase === 'measuring' ? signalQuality(data?.fourier?.snrFiltered) : null;

  return (
    <div className="measurement-page">
      <header className="measurement-nav">
        <Link to="/" className="measurement-back-link">← Systole</Link>
        {result && !panelOpen && (
          <button className="measurement-reopen-btn" onClick={() => setPanelOpen(true)}>
            Ver resultados
          </button>
        )}
      </header>

      <main className={`measurement-main ${panelOpen ? 'measurement-main-shifted' : ''}`}>
        {phase === 'idle' && (
          <div className="measurement-intro">
            <h1>Preparación de la medición</h1>
            <p>
              Conecta los electrodos AD8232 y mantente en una posición estable.
              La medición dura 60 segundos.
            </p>
            <button className="measurement-start-btn" onClick={startMeasurement}>
              Iniciar medición
            </button>
          </div>
        )}

        {phase !== 'idle' && (
          <div className="measurement-active">
            <div className="measurement-status-row">
              <span className={`measurement-dot ${connected ? 'measurement-dot-on' : 'measurement-dot-off'}`} />
              <span>{connected ? 'Electrodos conectados' : 'Conectando…'}</span>
              {liveQuality && (
                <span className={`measurement-quality-tag ${liveQuality.className}`}>
                  Señal: {liveQuality.label}
                </span>
              )}
            </div>

            {phase === 'measuring' && (
              <div className="measurement-countdown" role="timer" aria-label={`Midiendo, ${secondsLeft} segundos restantes`}>
                <div className="measurement-countdown-ring">
                  <svg viewBox="0 0 100 100" className="measurement-countdown-svg" aria-hidden="true">
                    <circle cx="50" cy="50" r={COUNTDOWN_RADIUS} className="measurement-countdown-track" />
                    <circle
                      cx="50" cy="50" r={COUNTDOWN_RADIUS}
                      className="measurement-countdown-fill"
                      style={{
                        strokeDasharray: COUNTDOWN_CIRCUMFERENCE,
                        strokeDashoffset: COUNTDOWN_CIRCUMFERENCE - (COUNTDOWN_CIRCUMFERENCE * progress) / 100,
                      }}
                    />
                  </svg>
                  <span className="measurement-countdown-number" aria-hidden="true">{secondsLeft}</span>
                </div>
                <p className="measurement-countdown-label">Midiendo… mantén la posición</p>
              </div>
            )}

            {phase === 'done' && (
              <div className="measurement-done measurement-done-enter">
                <p>Medición completa.</p>
                {!panelOpen && (
                  <button className="measurement-start-btn" onClick={() => setPanelOpen(true)}>
                    Ver resultados
                  </button>
                )}
              </div>
            )}

            <ECGChart signal={scrollSignal} />
          </div>
        )}
      </main>

      <ResultsPanel
        open={panelOpen}
        data={result}
        onClose={() => setPanelOpen(false)}
        onMeasureAgain={measureAgain}
      />
    </div>
  );
}
