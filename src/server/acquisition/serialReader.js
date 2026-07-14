'use strict';

const { createStream } = require('../data/ecgGenerator');

const BUFFER_SIZE = 3600; // 10 s a 360 Hz

let _buffer     = new Float64Array(BUFFER_SIZE);
let _writeIdx   = 0;
let _totalSamples = 0;
let _interval   = null;
let _stream     = null;
let _leadsOff   = false;
let _ecgType    = 'normal';

// ─── Calibración automática (igual que tu sketch de Processing) ───────────────
let _calibrating  = true;
let _calMin       = 1023;
let _calMax       = 0;
let _calSamples   = 0;
const CAL_SAMPLES = parseInt(process.env.SAMPLE_RATE || '360', 10) * 5; // 5 segundos

function calibrate(raw) {
  if (!_calibrating) return;
  if (raw < _calMin) _calMin = raw;
  if (raw > _calMax) _calMax = raw;
  _calSamples++;
  if (_calSamples >= CAL_SAMPLES) {
    _calibrating = false;
    console.log(`[Serial] Calibración completa — min:${_calMin} max:${_calMax}`);
  }
}

/**
 * Normaliza el valor ADC crudo (0-1023) al rango [-1, 1] usando la
 * calibración automática (mismo criterio que Processing).
 * Antes de calibrar usa el centro fijo 512.
 */
function normalize(raw) {
  if (_calibrating || _calMax === _calMin) {
    return (raw - 512) / 512;
  }
  const mid   = (_calMin + _calMax) / 2;
  const range = (_calMax - _calMin) / 2;
  return (raw - mid) / range;
}

// ─── Buffer circular ──────────────────────────────────────────────────────────
function addSample(value) {
  _buffer[_writeIdx] = value;
  _writeIdx = (_writeIdx + 1) % BUFFER_SIZE;
  _totalSamples++;
}

/**
 * Retorna las últimas n muestras del buffer circular.
 */
function getBuffer(n = BUFFER_SIZE) {
  const size = Math.min(n, BUFFER_SIZE);
  const result = new Array(size);
  for (let i = 0; i < size; i++) {
    result[i] = _buffer[(_writeIdx - size + i + BUFFER_SIZE) % BUFFER_SIZE];
  }
  return result;
}

function getTotalSamples()  { return _totalSamples; }
function isLeadsOff()       { return _leadsOff; }
function isCalibrating()    { return _calibrating; }

function setECGType(type) {
  _ecgType = type;
  if (_stream) _stream.setType(type);
}

// ─── Lectura real del Arduino ─────────────────────────────────────────────────
function startArduino() {
  let SerialPort;
  try {
    ({ SerialPort } = require('serialport'));
  } catch {
    console.error('[Serial] ERROR: paquete "serialport" no instalado.');
    console.error('         Ejecuta:  npm install serialport');
    console.error('         Luego reinicia el servidor.');
    process.exit(1);
  }

  const portPath = process.env.SERIAL_PORT;
  const baudRate = parseInt(process.env.BAUD_RATE || '9600', 10);

  console.log(`[Serial] Abriendo ${portPath} a ${baudRate} bps...`);

  const port = new SerialPort({ path: portPath, baudRate });

  // Leer línea a línea (igual que bufferUntil('\n') en Processing)
  let lineBuffer = '';

  port.on('data', (chunk) => {
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop(); // dejar la línea incompleta para el próximo chunk

    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;

      // "!" = electrodos desconectados
      if (s === '!') {
        _leadsOff = true;
        continue;
      }

      _leadsOff = false;
      const raw = parseFloat(s);
      if (isNaN(raw) || raw < 0 || raw > 1023) continue;

      calibrate(raw);
      addSample(normalize(raw));
    }
  });

  port.on('open',  () => console.log(`[Serial] Puerto ${portPath} abierto ✓`));
  port.on('error', (err) => console.error('[Serial] Error de puerto:', err.message));
  port.on('close', () => console.warn('[Serial] Puerto cerrado — reconectando en 3 s...'));

  return port;
}

// ─── Modo DEMO (ECG sintético) ─────────────────────────────────────────────
function startDemo() {
  console.log('[Acquisition] Modo DEMO — ECG sintético (DEMO_MODE=true)');
  _stream = createStream(_ecgType);

  const CHUNK = 36; // 36 muestras cada 100 ms ≈ 360 Hz
  _interval = setInterval(() => {
    for (let i = 0; i < CHUNK; i++) addSample(_stream.next());
  }, Math.round((CHUNK / 360) * 1000));

  console.log(`[Acquisition] Streaming tipo "${_ecgType}" a 360 Hz`);
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────
function startReading() {
  if (process.env.DEMO_MODE === 'false') {
    startArduino();
  } else {
    startDemo();
  }
}

function stopReading() {
  if (_interval) clearInterval(_interval);
}

module.exports = { startReading, stopReading, getBuffer, getTotalSamples, isLeadsOff, isCalibrating, setECGType };
