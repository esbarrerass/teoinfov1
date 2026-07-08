'use strict';

const FS = 360;

function gaussian(x, mu, sigma) {
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
}

function addWave(signal, centerIdx, amplitude, sigmaMs, fs) {
  const sigma = (sigmaMs / 1000) * fs;
  const halfWidth = Math.ceil(4 * sigma);
  const lo = Math.max(0, centerIdx - halfWidth);
  const hi = Math.min(signal.length - 1, centerIdx + halfWidth);
  for (let i = lo; i <= hi; i++) {
    signal[i] += amplitude * gaussian(i, centerIdx, sigma);
  }
}

// Genera un latido cardíaco sintético centrado en rPeak
function addBeat(signal, rPeak, fs, hrVariant = 'normal') {
  const ms = (t) => Math.round((t / 1000) * fs);

  if (hrVariant === 'pvc') {
    // Latido ectópico ventricular: QRS ancho, sin onda P, T invertida
    addWave(signal, rPeak, 1.4, 25, fs);           // R ancho
    addWave(signal, rPeak + ms(60), -0.3, 20, fs); // S profunda
    addWave(signal, rPeak + ms(220), -0.25, 80, fs); // T invertida
  } else {
    // Latido sinusal normal
    addWave(signal, rPeak + ms(-180), 0.10, 40, fs);  // P wave
    addWave(signal, rPeak + ms(-40), -0.05, 10, fs);  // Q wave
    addWave(signal, rPeak, 1.00, 15, fs);             // R wave
    addWave(signal, rPeak + ms(40), -0.15, 12, fs);   // S wave
    addWave(signal, rPeak + ms(200), 0.20, 70, fs);   // T wave
  }
}

/**
 * Genera una señal ECG sintética.
 * @param {number} durationSec - duración en segundos
 * @param {number} heartRate   - frecuencia cardíaca en lpm (BPM)
 * @param {string} type        - 'normal' | 'bradycardia' | 'tachycardia' | 'arrhythmia'
 * @returns {{ signal: number[], rPeaks: number[], fs: number }}
 */
function generateECG(durationSec = 10, heartRate = null, type = 'normal') {
  const hrMap = { normal: 72, bradycardia: 42, tachycardia: 118, arrhythmia: 72 };
  const hr = heartRate || hrMap[type] || 72;
  const nSamples = Math.round(durationSec * FS);
  const signal = new Array(nSamples).fill(0);
  const rPeaks = [];

  const baseRR = (60 / hr) * FS;
  let t = Math.round(baseRR / 2);

  while (t < nSamples - Math.round(baseRR)) {
    const isPVC = type === 'arrhythmia' && Math.random() < 0.12;
    addBeat(signal, t, FS, isPVC ? 'pvc' : 'normal');
    rPeaks.push(t);

    // Para arritmia, variar el intervalo RR aleatoriamente ±30%
    const jitter = type === 'arrhythmia'
      ? baseRR * (0.7 + Math.random() * 0.6)
      : baseRR * (0.98 + Math.random() * 0.04);
    t = Math.round(t + jitter);
  }

  // Ruido gaussiano + deriva de línea base (respiración a 0.25 Hz)
  for (let i = 0; i < signal.length; i++) {
    const noise = (Math.random() - 0.5) * 0.06;
    const baseline = 0.08 * Math.sin(2 * Math.PI * 0.25 * i / FS);
    signal[i] += noise + baseline;
  }

  return { signal, rPeaks, fs: FS };
}

/**
 * Crea un generador de streaming que emite muestras a 360 Hz.
 * Regenera el ECG cada 10 segundos en bucle.
 */
function createStream(type = 'normal') {
  let buffer = generateECG(10, null, type).signal;
  let idx = 0;

  return {
    next() {
      if (idx >= buffer.length) {
        buffer = generateECG(10, null, type).signal;
        idx = 0;
      }
      return buffer[idx++];
    },
    setType(newType) {
      type = newType;
      buffer = generateECG(10, null, type).signal;
      idx = 0;
    }
  };
}

module.exports = { generateECG, createStream, FS };
