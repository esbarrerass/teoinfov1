'use strict';

/**
 * Detector de picos R basado en el algoritmo Pan-Tompkins (1985).
 * Etapas: diferenciación → cuadrado → integración por ventana móvil → umbral adaptativo
 *
 * Referencia: J. Pan & W. J. Tompkins, IEEE Trans. Biomed. Eng., vol. BME-32, 1985.
 */

function differentiate(signal) {
  const out = new Array(signal.length).fill(0);
  for (let i = 2; i < signal.length - 2; i++) {
    // Derivada de 5 puntos (Pan-Tompkins original)
    out[i] = (1 / 8) * (-signal[i - 2] - 2 * signal[i - 1] + 2 * signal[i + 1] + signal[i + 2]);
  }
  return out;
}

function squareSignal(signal) {
  return signal.map(v => v * v);
}

function movingWindowIntegration(signal, windowSamples) {
  const out = new Array(signal.length).fill(0);
  let sum = 0;
  for (let i = 0; i < signal.length; i++) {
    sum += signal[i];
    if (i >= windowSamples) sum -= signal[i - windowSamples];
    out[i] = sum / windowSamples;
  }
  return out;
}

/**
 * Detecta los picos R en la señal filtrada.
 *
 * @param {number[]} signal - señal ECG filtrada
 * @param {number}   fs     - frecuencia de muestreo (Hz)
 * @returns {number[]} array de índices de los picos R detectados
 */
function detectPeaks(signal, fs = 360) {
  const diff = differentiate(signal);
  const squared = squareSignal(diff);
  const windowSamples = Math.round(0.150 * fs); // ventana de 150 ms
  const integrated = movingWindowIntegration(squared, windowSamples);

  // Umbral adaptativo: 50% del máximo de la señal integrada
  const maxVal = Math.max(...integrated);
  const threshold = 0.3 * maxVal;
  const minDistance = Math.round(0.200 * fs); // refractario de 200 ms

  const peaks = [];
  let lastPeak = -minDistance;

  for (let i = 1; i < integrated.length - 1; i++) {
    if (
      integrated[i] > threshold &&
      integrated[i] >= integrated[i - 1] &&
      integrated[i] >= integrated[i + 1] &&
      i - lastPeak >= minDistance
    ) {
      // Ajustar al pico real de la señal original en una ventana de ±30ms
      const window = Math.round(0.030 * fs);
      let rIdx = i;
      let rMax = signal[i];
      for (let j = Math.max(0, i - window); j <= Math.min(signal.length - 1, i + window); j++) {
        if (signal[j] > rMax) { rMax = signal[j]; rIdx = j; }
      }
      peaks.push(rIdx);
      lastPeak = rIdx;
    }
  }

  return peaks;
}

module.exports = { detectPeaks };
