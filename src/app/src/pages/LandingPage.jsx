import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="landing-logo">Systole</span>
      </header>

      <main className="landing-hero">
        <p className="landing-eyebrow">Instrumento de medición ECG</p>
        <h1 className="landing-title">
          Mide tu ritmo cardíaco.
          <br />
          Obtén una clasificación en 60 segundos.
        </h1>
        <p className="landing-subtitle">
          Conecta el sensor AD8232, inicia una medición de un minuto y recibe un análisis
          completo de tu ritmo cardíaco: clasificación del latido, calidad de señal y
          variabilidad, calculados por un modelo entrenado sobre miles de latidos reales.
        </p>

        <Link to="/medicion" className="landing-cta">
          Empezar medición
        </Link>

        <dl className="landing-proof">
          <div className="landing-proof-item">
            <dt>Exactitud del modelo</dt>
            <dd>95.1%</dd>
          </div>
          <div className="landing-proof-item">
            <dt>Latidos de entrenamiento</dt>
            <dd>10,169</dd>
          </div>
          <div className="landing-proof-item">
            <dt>Duración de la medición</dt>
            <dd>60 s</dd>
          </div>
        </dl>
      </main>

      <footer className="landing-footer">
        <p>Clasificador SVM entrenado sobre la MIT-BIH Arrhythmia Database.</p>
      </footer>
    </div>
  );
}
