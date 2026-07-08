'use strict';

const ss = require('simple-statistics');
const { computeFFT, bandPower } = require('./fourierAnalysis');

/**
 * Extrae características temporales y espectrales de la VFC (variabilidad de la FC)
 * a partir de los índices de los picos R.
 *
 * @param {number[]} peaks - índices de picos R en la señal
 * @param {number}   fs    - frecuencia de muestreo (Hz)
 * @returns {object} vector de características
 */
function extractFeatures(peaks, fs = 360) {
  if (peaks.length < 3) {
    return { valid: false, rrIntervals: [], meanRR: 0, fc: 0, sdnn: 0, rmssd: 0, lfhf: 0 };
  }

  // Intervalos RR en ms
  const rrIntervals = [];
  for (let i = 1; i < peaks.length; i++) {
    rrIntervals.push(((peaks[i] - peaks[i - 1]) / fs) * 1000);
  }

  // Filtrar intervalos fisiológicamente posibles (200–2000 ms)
  const validRR = rrIntervals.filter(rr => rr >= 200 && rr <= 2000);
  if (validRR.length < 2) {
    return { valid: false, rrIntervals, meanRR: 0, fc: 0, sdnn: 0, rmssd: 0, lfhf: 0 };
  }

  const meanRR = ss.mean(validRR);
  const fc = parseFloat((60000 / meanRR).toFixed(1));

  // SDNN: desviación estándar de los intervalos RR
  const sdnn = parseFloat(ss.standardDeviation(validRR).toFixed(2));

  // RMSSD: raíz cuadrada de la media de las diferencias sucesivas al cuadrado
  const succDiffs = [];
  for (let i = 1; i < validRR.length; i++) {
    succDiffs.push(Math.pow(validRR[i] - validRR[i - 1], 2));
  }
  const rmssd = parseFloat(Math.sqrt(ss.mean(succDiffs)).toFixed(2));

  // LF/HF ratio: análisis espectral de los intervalos RR (resampleados a 4 Hz)
  // Se requieren al menos 10 latidos para un análisis espectral mínimo
  let lfhf = null;
  if (validRR.length >= 10) {
    const lfhfRaw = computeLFHF(validRR);
    lfhf = parseFloat(lfhfRaw.toFixed(3));
  }

  return {
    valid: true,
    rrIntervals: validRR.map(v => parseFloat(v.toFixed(1))),
    meanRR: parseFloat(meanRR.toFixed(1)),
    fc,
    sdnn,
    rmssd,
    lfhf
  };
}

/**
 * Calcula el ratio LF/HF del espectro de los intervalos RR.
 * LF: 0.04–0.15 Hz (tono simpático)
 * HF: 0.15–0.40 Hz (tono parasimpático / respiratorio)
 *
 * Los intervalos RR se tratan como señal muestreada a ~4 Hz (aprox.).
 */
function computeLFHF(rrIntervals) {
  const fsRR = 4; // Hz
  const { frequencies, powerSpectrum } = computeFFT(rrIntervals, fsRR);

  const lf = bandPower(powerSpectrum, frequencies, 0.04, 0.15);
  const hf = bandPower(powerSpectrum, frequencies, 0.15, 0.40);

  return hf > 0 ? lf / hf : 0;
}

module.exports = { extractFeatures };
