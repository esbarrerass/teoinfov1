'use strict';

/**
 * Clasificador de arritmias en dos etapas:
 *   1. SVM (kernel RBF, libsvm) entrenado sobre MIT-BIH Arrhythmia Database,
 *      decide Normal vs. Anormal sobre [meanRR, sdnn, rmssd, fc] (ver
 *      training/model.json → featureKeys).
 *      Métricas sobre 12 registros de test nunca vistos en entrenamiento:
 *      accuracy 95.1%, sensibilidad 82.6%, especificidad 98.9%, F1 88.6%
 *      (ver training/trainClassifier.js y training/model.json).
 *   2. Si el SVM marca Anormal, se usan los umbrales de FC/SDNN únicamente
 *      para dar la sub-etiqueta específica (Bradicardia/Taquicardia/Arritmia),
 *      ya que el SVM es binario y el resto del sistema (UI, entropía) espera
 *      las 4 clases.
 *
 * Si el modelo entrenado no está disponible (training/model.json ausente),
 * cae a clasificación por umbrales pura (comportamiento previo).
 *
 * lfhf se excluyó del vector de entrenamiento: se calcula por FFT sobre
 * ~15-20 intervalos RR (ventana de 15s) y su distribución en MIT-BIH es
 * extremadamente estrecha — con datos reales del Arduino, personas con
 * FC/HRV normales pero lfhf fuera de ese rango angosto eran marcadas como
 * "anormal" solo por ese valor. Ver training/trainClassifier.js.
 *
 * LIMITACIÓN CONOCIDA — modo DEMO (data/ecgGenerator.js): panTompkins.js
 * comete errores ocasionales de detección (~1 de cada 6 latidos,
 * desplazamiento de decenas de ms) con la morfología sintética de
 * ecgGenerator.js, lo que infla el SDNN medido y hace que el ECG "normal"
 * sintético se clasifique como anormal. No afecta al Arduino real (señal
 * fisiológica real, sin ese patrón de error de detección) ni a la validación
 * contra MIT-BIH real. No corregido: requiere ajustar panTompkins.js o la
 * morfología sintética, fuera del alcance de esta integración.
 */

const path = require('path');
const fs = require('fs');
const SVM = require('libsvm-js/asm');

const THRESHOLDS = {
  FC_BRADYCARDIA: 60,
  FC_TACHYCARDIA: 100,
  SDNN_ARRHYTHMIA: 120, // SDNN > 120 ms indica alta variabilidad irregular
  RMSSD_HIGH: 80
};

const MODEL_PATH = path.join(__dirname, '../training/model.json');

let _svmModel = null; // { svm, normalization, testMetrics, featureKeys } | undefined si no hay modelo

function loadSvmModel() {
  if (_svmModel !== null) return _svmModel;
  if (!fs.existsSync(MODEL_PATH)) {
    _svmModel = undefined;
    return _svmModel;
  }
  const saved = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf-8'));
  _svmModel = {
    svm: SVM.load(saved.svm),
    normalization: saved.normalization,
    testMetrics: saved.testMetrics,
    featureKeys: saved.featureKeys
  };
  return _svmModel;
}

function toFeatureVector(features, featureKeys) {
  return featureKeys.map((k) => (features[k] == null ? 0 : features[k]));
}

function normalizeVector(vector, { mean, std }) {
  return vector.map((v, i) => (v - mean[i]) / std[i]);
}

/**
 * Sub-etiqueta interpretable para un caso ya marcado como anormal por el SVM.
 * No decide isAbnormal — solo elige el nombre de la anomalía.
 */
function subLabel(features) {
  const { fc, sdnn } = features;
  if (sdnn > THRESHOLDS.SDNN_ARRHYTHMIA) {
    return { label: 'Arritmia', reason: `SDNN elevado: ${sdnn} ms > ${THRESHOLDS.SDNN_ARRHYTHMIA} ms` };
  }
  if (fc < THRESHOLDS.FC_BRADYCARDIA) {
    return { label: 'Bradicardia', reason: `FC = ${fc} lpm < 60 lpm` };
  }
  if (fc > THRESHOLDS.FC_TACHYCARDIA) {
    return { label: 'Taquicardia', reason: `FC = ${fc} lpm > 100 lpm` };
  }
  // El SVM detectó anomalía que los umbrales simples no explican
  // (p.ej. alta variabilidad moderada o patrón en lfhf/rmssd).
  return { label: 'Arritmia', reason: `FC = ${fc} lpm, SDNN = ${sdnn} ms (patrón detectado por SVM)` };
}

/**
 * Clasificación por umbrales pura (fallback si no hay modelo SVM entrenado).
 */
function classifyByThresholds(features) {
  const { fc, sdnn, rmssd } = features;

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

  const confidence = Math.max(0.70, 1 - (Math.abs(fc - 75) / 75) - (rmssd / 200));
  return {
    label: 'Normal',
    isAbnormal: false,
    confidence: parseFloat(Math.min(0.95, confidence).toFixed(2)),
    reason: `FC = ${fc} lpm, SDNN = ${sdnn} ms`
  };
}

/**
 * Clasifica una ventana de latidos a partir de sus características extraídas.
 *
 * @param {{ fc: number, sdnn: number, rmssd: number, meanRR: number, valid: boolean }} features
 * @returns {{
 *   label: string,
 *   isAbnormal: boolean,
 *   confidence: number,
 *   reason: string,
 *   source: 'svm' | 'umbral'
 * }}
 */
function classify(features) {
  if (!features || !features.valid) {
    return { label: 'Sin datos', isAbnormal: false, confidence: 0, reason: 'Señal insuficiente', source: 'umbral' };
  }

  const model = loadSvmModel();
  if (!model) {
    return { ...classifyByThresholds(features), source: 'umbral' };
  }

  const rawVector = toFeatureVector(features, model.featureKeys);
  const vector = normalizeVector(rawVector, model.normalization);
  const featureVector = { keys: model.featureKeys, raw: rawVector, normalized: vector };

  const [isAbnormalRaw] = model.svm.predict([vector]);
  const isAbnormal = isAbnormalRaw === 1;

  if (!isAbnormal) {
    const { fc, sdnn } = features;
    return {
      label: 'Normal',
      isAbnormal: false,
      confidence: model.testMetrics.specificity,
      reason: `FC = ${fc} lpm, SDNN = ${sdnn} ms (SVM: normal)`,
      source: 'svm',
      featureVector
    };
  }

  const { label, reason } = subLabel(features);
  return {
    label,
    isAbnormal: true,
    confidence: model.testMetrics.sensitivity,
    reason: `${reason} (SVM: anormal)`,
    source: 'svm',
    featureVector
  };
}

module.exports = { classify, classifyByThresholds, THRESHOLDS };
