'use strict';

/**
 * Capacidad de canal de Shannon para canal AWGN (Additive White Gaussian Noise).
 * C = B · log₂(1 + SNR)
 * Capítulo IV — Teoría de la Información (temas 4.6, 4.7)
 *
 * @param {number} snrDB    - SNR en decibelios
 * @param {number} bandwidth - ancho de banda en Hz (default: 180 Hz = Nyquist del ECG)
 * @returns {number} capacidad en bits/s
 */
function shannonCapacity(snrDB, bandwidth = 180) {
  const snrLinear = Math.pow(10, snrDB / 10);
  return parseFloat((bandwidth * Math.log2(1 + snrLinear)).toFixed(2));
}

/**
 * Compara la capacidad del canal ECG antes y después del filtrado.
 * Demuestra cómo el preprocesamiento mejora la capacidad de información del canal.
 *
 * @param {number} snrRaw      - SNR de la señal cruda (dB)
 * @param {number} snrFiltered - SNR de la señal filtrada (dB)
 * @param {number} fs          - frecuencia de muestreo (Hz)
 * @returns {{
 *   bandwidth: number,
 *   snrRaw: number,
 *   snrFiltered: number,
 *   capacityRaw: number,
 *   capacityFiltered: number,
 *   capacityGain: number
 * }}
 */
function computeCapacity(snrRaw, snrFiltered, fs = 360) {
  const bandwidth = fs / 2; // Nyquist
  const capacityRaw = shannonCapacity(snrRaw, bandwidth);
  const capacityFiltered = shannonCapacity(snrFiltered, bandwidth);

  return {
    bandwidth,
    snrRaw: parseFloat(snrRaw.toFixed(2)),
    snrFiltered: parseFloat(snrFiltered.toFixed(2)),
    capacityRaw,
    capacityFiltered,
    capacityGain: parseFloat((capacityFiltered - capacityRaw).toFixed(2))
  };
}

module.exports = { shannonCapacity, computeCapacity };
