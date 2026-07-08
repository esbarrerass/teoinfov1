'use strict';

const FFT = require('fft.js');

const FFT_SIZE = 512; // Potencia de 2 más cercana a 360 (1 segundo)

/**
 * Aplica ventana de Hann para reducir fuga espectral.
 * w[n] = 0.5 · (1 - cos(2π·n/(N-1)))
 */
function hannWindow(signal) {
  const N = signal.length;
  return signal.map((v, n) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1))));
}

/**
 * Calcula la DFT de una señal real usando la FFT.
 * La señal se rellena con ceros (zero-padding) hasta FFT_SIZE.
 *
 * @param {number[]} signal - señal de entrada (cualquier longitud ≤ FFT_SIZE)
 * @param {number}   fs     - frecuencia de muestreo
 * @returns {{ frequencies: number[], magnitudes: number[], powerSpectrum: number[] }}
 */
function computeFFT(signal, fs = 360) {
  const fft = new FFT(FFT_SIZE);

  // Zero-padding y ventana de Hann
  const padded = new Array(FFT_SIZE).fill(0);
  const windowed = hannWindow(signal.slice(0, Math.min(signal.length, FFT_SIZE)));
  windowed.forEach((v, i) => { padded[i] = v; });

  const out = fft.createComplexArray();
  fft.realTransform(out, padded);
  fft.completeSpectrum(out);

  // Calcular magnitud y espectro de potencia para el semiplano positivo
  const N2 = FFT_SIZE / 2;
  const frequencies = new Array(N2);
  const magnitudes = new Array(N2);
  const powerSpectrum = new Array(N2);

  for (let k = 0; k < N2; k++) {
    frequencies[k] = k * fs / FFT_SIZE;
    const re = out[2 * k];
    const im = out[2 * k + 1];
    magnitudes[k] = Math.sqrt(re * re + im * im) / FFT_SIZE;
    powerSpectrum[k] = magnitudes[k] * magnitudes[k];
  }

  return { frequencies, magnitudes, powerSpectrum };
}

/**
 * Calcula la potencia en una banda de frecuencia [fLow, fHigh].
 */
function bandPower(powerSpectrum, frequencies, fLow, fHigh) {
  return powerSpectrum.reduce((acc, p, i) => {
    return (frequencies[i] >= fLow && frequencies[i] <= fHigh) ? acc + p : acc;
  }, 0);
}

/**
 * Calcula el SNR comparando la potencia de la banda ECG útil (0.5–40 Hz)
 * con la potencia del ruido fuera de esa banda.
 *
 * @returns {number} SNR en dB
 */
function computeSNR(powerSpectrum, frequencies) {
  const signalPower = bandPower(powerSpectrum, frequencies, 0.5, 40);
  const totalPower = powerSpectrum.reduce((a, b) => a + b, 0);
  const noisePower = Math.max(totalPower - signalPower, 1e-12);
  return 10 * Math.log10(signalPower / noisePower);
}

/**
 * Análisis completo: FFT de la señal cruda y filtrada, más SNR comparativo.
 *
 * @returns {{
 *   frequencies: number[],
 *   rawSpectrum: number[],
 *   filteredSpectrum: number[],
 *   snrRaw: number,
 *   snrFiltered: number
 * }}
 */
function analyzeSignal(raw, filtered, fs = 360) {
  const rawFFT = computeFFT(raw, fs);
  const filteredFFT = computeFFT(filtered, fs);

  const snrRaw = computeSNR(rawFFT.powerSpectrum, rawFFT.frequencies);
  const snrFiltered = computeSNR(filteredFFT.powerSpectrum, filteredFFT.frequencies);

  return {
    frequencies: rawFFT.frequencies,
    rawSpectrum: rawFFT.powerSpectrum,
    filteredSpectrum: filteredFFT.powerSpectrum,
    snrRaw: parseFloat(snrRaw.toFixed(2)),
    snrFiltered: parseFloat(snrFiltered.toFixed(2))
  };
}

module.exports = { computeFFT, analyzeSignal, bandPower, computeSNR, FFT_SIZE };
