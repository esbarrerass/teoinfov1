'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const path = require('path');

const { startReading, stopReading, getBuffer, getTotalSamples, setECGType } = require('./acquisition/serialReader');
const { preprocess } = require('./signalProcessing/preprocessing');
const { analyzeSignal } = require('./signalProcessing/fourierAnalysis');
const { detectPeaks } = require('./signalProcessing/panTompkins');
const { extractFeatures } = require('./signalProcessing/featureExtraction');
const { classify } = require('./classification/classifier');

const PORT = parseInt(process.env.HTTP_PORT || '4000', 10);
const FS = parseInt(process.env.SAMPLE_RATE || '360', 10);

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Estado compartido ────────────────────────────────────────────────────────
const state = {
  classificationHistory: [],
  lastFeatures: null,
  lastFourier: null,
  ecgType: 'normal',
  smoothingHistory: { sdnn: [], rmssd: [] }
};

// Nº de ventanas recientes sobre las que se promedian sdnn/rmssd antes de
// clasificar. A fs bajas (~49 Hz) cada RR solo puede tomar valores múltiplos de
// ~20ms (1/fs) — ese jitter de cuantización basta para que 1-2 intervalos de la
// ventana de 15s empujen momentáneamente el SDNN por encima del umbral de
// decisión sin que haya ningún cambio fisiológico real. Promediar varias
// ventanas consecutivas estabiliza lo que ve el clasificador sin tocar el
// cálculo de featureExtraction.js.
const CLASSIFIER_SMOOTHING_WINDOWS = 3;

function smoothedValue(key, rawValue) {
  const history = state.smoothingHistory[key];
  if (rawValue != null) {
    history.push(rawValue);
    if (history.length > CLASSIFIER_SMOOTHING_WINDOWS) history.shift();
  }
  return history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : rawValue;
}

// ─── Pipeline de procesamiento ────────────────────────────────────────────────
function runPipeline() {
  // Ventana amplia (15 s) para tener suficientes latidos por cálculo de SDNN/RMSSD
  // y evitar que un solo latido entrando/saliendo de la ventana dispare la clasificación.
  const WINDOW = Math.min(FS * 15, 3600);
  const raw = getBuffer(WINDOW);
  if (raw.every(v => v === 0)) return null;

  const { filtered } = preprocess(raw, FS);
  const fourier = analyzeSignal(raw, filtered, FS);
  const peaks = detectPeaks(filtered, FS);
  const features = extractFeatures(peaks, FS);

  const smoothedFeatures = features.valid
    ? {
        ...features,
        sdnn: smoothedValue('sdnn', features.sdnn),
        rmssd: smoothedValue('rmssd', features.rmssd)
      }
    : features;

  const result = classify(smoothedFeatures);

  if (result.label && result.label !== 'Sin datos') {
    state.classificationHistory.push(result.label);
    if (state.classificationHistory.length > 200) state.classificationHistory.shift();
  }

  state.lastFeatures = features;
  state.lastFourier = fourier;

  return {
    raw: raw.slice(-FS),         // último segundo de señal cruda
    filtered: filtered.slice(-FS),
    peaks: peaks.filter(p => p >= WINDOW - FS), // picos en la ventana visible
    features,
    classification: result,
    fourier: {
      frequencies: fourier.frequencies.slice(0, 80), // hasta ~55 Hz (suficiente para ECG)
      rawSpectrum: fourier.rawSpectrum.slice(0, 80),
      filteredSpectrum: fourier.filteredSpectrum.slice(0, 80),
      snrRaw: fourier.snrRaw,
      snrFiltered: fourier.snrFiltered
    }
  };
}

// Contexto extra (antes del tramo nuevo) que se incluye al filtrar cada chunk
// de streaming, para que los filtros IIR no arranquen con transitorio en cada
// envío — se descarta antes de mandar, solo se usa para "calentar" el filtro.
const STREAM_FILTER_CONTEXT = 200;

/**
 * Señal cruda + filtrada muestra por muestra, solo con las muestras nuevas
 * desde el último envío — para que el gráfico en vivo se sienta tan inmediato
 * como leer el puerto serial directo (p. ej. Processing), no en bloques de 1s
 * cada 250ms como hacía antes runPipeline().
 */
function getNewSamplesChunk(lastTotal) {
  const currentTotal = getTotalSamples();
  const newCount = currentTotal - lastTotal;
  if (newCount <= 0) return { chunk: null, total: currentTotal };

  const withContext = getBuffer(newCount + STREAM_FILTER_CONTEXT);
  const { filtered } = preprocess(withContext, FS);

  return {
    chunk: {
      raw: withContext.slice(-newCount),
      filtered: filtered.slice(-newCount)
    },
    total: currentTotal
  };
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  console.log(`[WS] Cliente conectado: ${req.socket.remoteAddress}`);

  let lastStreamedTotal = getTotalSamples();

  const streamInterval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;
    try {
      const { chunk, total } = getNewSamplesChunk(lastStreamedTotal);
      lastStreamedTotal = total;
      if (chunk) ws.send(JSON.stringify({ type: 'signal', ...chunk }));
    } catch (err) {
      console.error('[WS] Error en streaming:', err.message);
    }
  }, 40); // ~25 envíos/seg — se siente inmediato sin saturar el socket

  const analysisInterval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;
    try {
      const data = runPipeline();
      if (data) ws.send(JSON.stringify({ type: 'analysis', ...data }));
    } catch (err) {
      console.error('[WS] Error en pipeline:', err.message);
    }
  }, 250); // clasificación/features, no necesita ser tan frecuente

  ws.on('message', (msg) => {
    try {
      const { type, value } = JSON.parse(msg.toString());
      if (type === 'setECGType') {
        setECGType(value);
        state.ecgType = value;
        state.classificationHistory = [];
        console.log(`[WS] Tipo de ECG cambiado a: ${value}`);
      }
    } catch (_) { /* ignorar mensajes malformados */ }
  });

  ws.on('close', () => {
    clearInterval(streamInterval);
    clearInterval(analysisInterval);
    console.log('[WS] Cliente desconectado');
  });
});

// ─── REST API ─────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    demoMode: process.env.DEMO_MODE !== 'false',
    ecgType: state.ecgType,
    sampleRate: FS,
    classificationHistory: state.classificationHistory.slice(-20)
  });
});

app.get('/api/snapshot', (req, res) => {
  const data = runPipeline();
  if (!data) return res.status(503).json({ error: 'Buffer vacío — esperar unos segundos' });
  res.json(data);
});

app.post('/api/ecg-type', (req, res) => {
  const { type } = req.body;
  const valid = ['normal', 'bradycardia', 'tachycardia', 'arrhythmia'];
  if (!valid.includes(type)) return res.status(400).json({ error: `Tipo inválido. Opciones: ${valid.join(', ')}` });
  setECGType(type);
  state.ecgType = type;
  state.classificationHistory = [];
  res.json({ ok: true, type });
});

// ─── Página de prueba sin React ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Systole — Test</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #c9d1d9; padding: 2rem; }
    h1 { color: #58a6ff; }
    #status { color: #3fb950; }
    #data { white-space: pre; font-size: 12px; max-height: 400px; overflow-y: auto; background: #161b22; padding: 1rem; border-radius: 6px; }
    .label { font-size: 1.5rem; font-weight: bold; margin: 1rem 0; }
    .normal { color: #3fb950; }
    .abnormal { color: #f85149; }
    canvas { background: #161b22; border-radius: 6px; margin: 1rem 0; }
    button { background: #238636; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin: 0.25rem; }
  </style>
</head>
<body>
  <h1>Systole — Servidor de Prueba</h1>
  <p id="status">Conectando...</p>
  <div>
    <button onclick="setType('normal')">Normal</button>
    <button onclick="setType('bradycardia')">Bradicardia</button>
    <button onclick="setType('tachycardia')">Taquicardia</button>
    <button onclick="setType('arrhythmia')">Arritmia</button>
  </div>
  <div class="label" id="label">—</div>
  <canvas id="ecg" width="800" height="150"></canvas>
  <details><summary>Datos crudos (JSON)</summary><div id="data">Esperando datos...</div></details>

  <script>
    const ws = new WebSocket('ws://localhost:${PORT}/ws');
    const ctx = document.getElementById('ecg').getContext('2d');
    const W = 800, H = 150;

    ws.onopen = () => document.getElementById('status').textContent = '✓ WebSocket conectado';
    ws.onclose = () => document.getElementById('status').textContent = '✗ WebSocket desconectado';

    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      const lbl = document.getElementById('label');
      lbl.textContent = d.classification?.label || '—';
      lbl.className = 'label ' + (d.classification?.isAbnormal ? 'abnormal' : 'normal');

      // Dibujar ECG
      const sig = d.filtered || d.raw || [];
      if (sig.length > 1) {
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const min = Math.min(...sig), max = Math.max(...sig), range = max - min || 1;
        sig.forEach((v, i) => {
          const x = (i / sig.length) * W;
          const y = H - ((v - min) / range) * (H - 20) - 10;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      document.getElementById('data').textContent = JSON.stringify({
        fc: d.features?.fc,
        sdnn: d.features?.sdnn,
        rmssd: d.features?.rmssd,
        snrRaw: d.fourier?.snrRaw,
        snrFiltered: d.fourier?.snrFiltered
      }, null, 2);
    };

    function setType(type) {
      ws.send(JSON.stringify({ type: 'setECGType', value: type }));
    }
  </script>
</body>
</html>`);
});

// ─── Inicio ───────────────────────────────────────────────────────────────────
startReading();

server.listen(PORT, () => {
  console.log(`\n🫀  Servidor Systole corriendo en http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   Modo: ${process.env.DEMO_MODE !== 'false' ? 'DEMO (ECG sintético)' : 'Arduino'}`);
  console.log(`   API: GET /api/status  |  GET /api/snapshot  |  POST /api/ecg-type\n`);
});

process.on('SIGINT', () => {
  stopReading();
  server.close(() => process.exit(0));
});
