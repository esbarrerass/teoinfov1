'use strict';

const { createStream } = require('../data/ecgGenerator');

const BUFFER_SIZE = 3600; // 10 s a 360 Hz

let _buffer = new Float64Array(BUFFER_SIZE);
let _writeIdx = 0;
let _totalSamples = 0;
let _interval = null;
let _stream = null;
let _ecgType = 'normal';

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

function getTotalSamples() {
  return _totalSamples;
}

function setECGType(type) {
  _ecgType = type;
  if (_stream) _stream.setType(type);
}

/**
 * Inicia la adquisición en modo demo (ECG sintético a 360 Hz).
 * Cuando se integre el Arduino, reemplazar por node-serialport aquí.
 */
function startReading() {
  const demoMode = process.env.DEMO_MODE !== 'false';

  if (demoMode) {
    console.log('[Acquisition] Modo DEMO — usando ECG sintético (DEMO_MODE=true)');
    _stream = createStream(_ecgType);

    // Emitir muestras a 360 Hz en grupos de 36 cada 100ms para eficiencia
    const CHUNK = 36;
    const INTERVAL_MS = Math.round((CHUNK / 360) * 1000); // ~100ms

    _interval = setInterval(() => {
      for (let i = 0; i < CHUNK; i++) {
        addSample(_stream.next());
      }
    }, INTERVAL_MS);

    console.log(`[Acquisition] Streaming ECG sintético (tipo: ${_ecgType}) a 360 Hz`);
  } else {
    // Aquí se integra node-serialport cuando el Arduino esté conectado
    // npm install serialport   →   luego descomentar:
    //
    // const { SerialPort } = require('serialport');
    // const port = new SerialPort({ path: process.env.SERIAL_PORT, baudRate: +process.env.BAUD_RATE });
    // port.on('data', (chunk) => {
    //   /* parsear paquetes de 4 bytes: [0xFF, HIGH, LOW, CRC8] */
    // });
    console.warn('[Acquisition] Modo Arduino — serialport no implementado aún. Activar DEMO_MODE=true.');
  }
}

function stopReading() {
  if (_interval) clearInterval(_interval);
}

module.exports = { startReading, stopReading, getBuffer, getTotalSamples, setECGType };
