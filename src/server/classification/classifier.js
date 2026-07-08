'use strict';

/**
 * Clasificador de arritmias basado en características del intervalo RR.
 *   - Bradicardia:  FC < 60 lpm
 *   - Normal:       60 ≤ FC ≤ 100 lpm
 *   - Taquicardia:  FC > 100 lpm
 *
 * Este enfoque tiene precisión reportada del 80–90% en la literatura.
 *
 * TODO: Reemplazar con SVM entrenado sobre MIT-BIH cuando los datos estén disponibles.
 *       Vector de características: [meanRR, sdnn, rmssd, fc, lfhf]
 *       Paquete: npm install ml-svm
 */

const THRESHOLDS = {
  FC_BRADYCARDIA: 60,
  FC_TACHYCARDIA: 100,
  SDNN_ARRHYTHMIA: 120, // SDNN > 120 ms indica alta variabilidad irregular
  RMSSD_HIGH: 80
};

/**
 * Clasifica un latido según las características extraídas.
 *
 * @param {{ fc: number, sdnn: number, rmssd: number, meanRR: number, valid: boolean }} features
 * @returns {{
 *   label: string,
 *   isAbnormal: boolean,
 *   confidence: number,
 *   reason: string
 * }}
 */
function classify(features) {
  if (!features || !features.valid) {
    return { label: 'Sin datos', isAbnormal: false, confidence: 0, reason: 'Señal insuficiente' };
  }

  const { fc, sdnn, rmssd } = features;

  // Arritmia irregular detectada por alta variabilidad
  if (sdnn > THRESHOLDS.SDNN_ARRHYTHMIA) {
    return {
      label: 'Arritmia',
      isAbnormal: true,
      confidence: Math.min(0.95, 0.70 + (sdnn - THRESHOLDS.SDNN_ARRHYTHMIA) / 200),
      reason: `SDNN elevado: ${sdnn} ms > ${THRESHOLDS.SDNN_ARRHYTHMIA} ms`
    };
  }

  if (fc < THRESHOLDS.FC_BRADYCARDIA) {
    const confidence = Math.min(0.95, 0.80 + (THRESHOLDS.FC_BRADYCARDIA - fc) / 60);
    return {
      label: 'Bradicardia',
      isAbnormal: true,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `FC = ${fc} lpm < 60 lpm`
    };
  }

  if (fc > THRESHOLDS.FC_TACHYCARDIA) {
    const confidence = Math.min(0.95, 0.80 + (fc - THRESHOLDS.FC_TACHYCARDIA) / 100);
    return {
      label: 'Taquicardia',
      isAbnormal: true,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `FC = ${fc} lpm > 100 lpm`
    };
  }

  // Ritmo sinusal normal
  const confidence = Math.max(0.70, 1 - (Math.abs(fc - 75) / 75) - (rmssd / 200));
  return {
    label: 'Normal',
    isAbnormal: false,
    confidence: parseFloat(Math.min(0.95, confidence).toFixed(2)),
    reason: `FC = ${fc} lpm, SDNN = ${sdnn} ms`
  };
}

module.exports = { classify, THRESHOLDS };
