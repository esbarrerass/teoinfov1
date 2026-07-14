'use strict';

/**
 * Entrena un SVM binario (Normal=0 / Anormal=1) sobre ventanas de latidos de
 * MIT-BIH, usando el vector de características [meanRR, sdnn, rmssd, fc, lfhf]
 * ya definido en classifier.js (TODO histórico) y featureExtraction.js.
 *
 * Uso: node training/trainClassifier.js
 * Salida: training/model.json (soporte vectores del SVM + medias/desv. de normalización)
 *         + métricas impresas en consola (sensibilidad, especificidad, F1, matriz de confusión)
 */

const fs = require('fs');
const path = require('path');
const SVM = require('libsvm-js/asm');
const { buildDataset, listRecords } = require('./prepareDataset');

const FEATURE_KEYS = ['meanRR', 'sdnn', 'rmssd', 'fc', 'lfhf'];
const MODEL_PATH = path.join(__dirname, 'model.json');
const TEST_FRACTION = 0.25;

function toVector(features) {
  return FEATURE_KEYS.map((k) => (features[k] == null ? 0 : features[k]));
}

// Normalización z-score: SVM con kernel RBF es sensible a la escala,
// y fc (~60-180) y lfhf (~0-5) viven en rangos muy distintos.
function computeNormalization(vectors) {
  const n = vectors.length;
  const dims = vectors[0].length;
  const mean = new Array(dims).fill(0);
  const std = new Array(dims).fill(0);

  for (const v of vectors) for (let i = 0; i < dims; i++) mean[i] += v[i] / n;
  for (const v of vectors) for (let i = 0; i < dims; i++) std[i] += Math.pow(v[i] - mean[i], 2) / n;
  for (let i = 0; i < dims; i++) std[i] = Math.sqrt(std[i]) || 1;

  return { mean, std };
}

function normalize(vector, { mean, std }) {
  return vector.map((v, i) => (v - mean[i]) / std[i]);
}

// Split determinista por registro (no por fila) para evitar fuga de datos:
// ventanas del mismo registro comparten señal de fondo y no deben quedar
// repartidas entre train y test.
function splitByRecord(records, testFraction) {
  const nTest = Math.round(records.length * testFraction);
  const testRecords = new Set(records.slice(0, nTest));
  const trainRecords = new Set(records.slice(nTest));
  return { trainRecords, testRecords };
}

function confusionMatrix(yTrue, yPred) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else fn++;
  }
  return { tp, tn, fp, fn };
}

function computeMetrics({ tp, tn, fp, fn }) {
  const sensitivity = tp / (tp + fn || 1);   // recall de la clase Anormal
  const specificity = tn / (tn + fp || 1);   // recall de la clase Normal
  const precision = tp / (tp + fp || 1);
  const f1 = 2 * (precision * sensitivity) / (precision + sensitivity || 1);
  const accuracy = (tp + tn) / (tp + tn + fp + fn || 1);
  return { accuracy, sensitivity, specificity, precision, f1 };
}

function main() {
  console.log('Cargando registros MIT-BIH...');
  const records = listRecords();
  const { trainRecords, testRecords } = splitByRecord(records, TEST_FRACTION);

  console.log(`Train: ${trainRecords.size} registros — Test: ${testRecords.size} registros`);

  const allRows = buildDataset(records);
  const trainRows = allRows.filter((r) => trainRecords.has(r.record));
  const testRows = allRows.filter((r) => testRecords.has(r.record));

  console.log(`Ventanas train: ${trainRows.length} — Ventanas test: ${testRows.length}`);

  const trainVectorsRaw = trainRows.map((r) => toVector(r.features));
  const norm = computeNormalization(trainVectorsRaw);

  const trainVectors = trainVectorsRaw.map((v) => normalize(v, norm));
  const trainLabels = trainRows.map((r) => r.label);

  const testVectors = testRows.map((r) => normalize(toVector(r.features), norm));
  const testLabels = testRows.map((r) => r.label);

  console.log('Entrenando SVM (kernel RBF, libsvm)...');
  const svm = new SVM({
    kernel: SVM.KERNEL_TYPES.RBF,
    type: SVM.SVM_TYPES.C_SVC,
    gamma: 1 / FEATURE_KEYS.length, // regla práctica libsvm: 1/nFeatures
    cost: 1,
  });

  const t0 = Date.now();
  svm.train(trainVectors, trainLabels);
  console.log(`Entrenamiento completo en ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const predTrain = svm.predict(trainVectors);
  const predTest = svm.predict(testVectors);

  const trainCm = confusionMatrix(trainLabels, predTrain);
  const testCm = confusionMatrix(testLabels, predTest);

  const trainMetrics = computeMetrics(trainCm);
  const testMetrics = computeMetrics(testCm);

  console.log('\n=== Métricas — TRAIN ===');
  console.log(trainCm);
  console.log(trainMetrics);

  console.log('\n=== Métricas — TEST (registros nunca vistos en entrenamiento) ===');
  console.log(testCm);
  console.log(testMetrics);

  const model = {
    svm: svm.serializeModel(),
    normalization: norm,
    featureKeys: FEATURE_KEYS,
    testMetrics,
    testConfusionMatrix: testCm,
    trainedAt: new Date().toISOString(),
    trainRecords: [...trainRecords],
    testRecords: [...testRecords],
  };

  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2));
  console.log(`\nModelo guardado en ${MODEL_PATH}`);

  svm.free();
}

main();
