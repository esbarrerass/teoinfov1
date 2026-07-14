'use strict';

/**
 * Prepara el dataset de entrenamiento a partir de MIT-BIH Arrhythmia Database
 * (CSV pre-extraído: <reg>_ekg.csv con señal + índice, <reg>_annotations_1.csv
 * con índice de pico R + símbolo AAMI).
 *
 * Genera ventanas deslizantes de latidos (mismo criterio que runPipeline() en
 * index.js: features por ventana, no por latido aislado) y extrae el vector
 * [meanRR, sdnn, rmssd, fc, lfhf] con el propio featureExtraction.js del proyecto.
 */

const fs = require('fs');
const path = require('path');
const { extractFeatures } = require('../signalProcessing/featureExtraction');

const DATA_DIR = path.join(__dirname, '../data/mitbih/archive');
const FS = 360; // fs real de MIT-BIH (confirmado: ~650001 muestras / 1800s)

// Símbolos AAMI que cuentan como "normal" vs. el resto como "anormal".
// Se excluyen símbolos que no son latidos (+, ~, |, Q sin clase clara, etc.).
const NORMAL_SYMBOLS = new Set(['N', 'L', 'R', '·']);
const ABNORMAL_SYMBOLS = new Set(['A', 'a', 'J', 'S', 'V', 'r', 'F', 'e', 'j', 'E', 'f']);
const IGNORED_SYMBOLS = new Set(['/', '+', '~', '|', 'Q', '?', '!', '[', ']', 'x']);

const WINDOW_BEATS = 20; // latidos por ventana (similar orden de magnitud al buffer de 15s de index.js)
const STEP_BEATS = 10;   // solapamiento del 50% entre ventanas consecutivas

function parseAnnotations(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).slice(1);
  const beats = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const [idxStr, symbolRaw] = line.split(',');
    const idx = parseInt(idxStr, 10);
    const symbol = (symbolRaw || '').trim();
    if (Number.isNaN(idx)) continue;
    if (NORMAL_SYMBOLS.has(symbol)) beats.push({ idx, label: 0 });
    else if (ABNORMAL_SYMBOLS.has(symbol)) beats.push({ idx, label: 1 });
    // símbolos ignorados (ritmo, calidad, pausas, etc.) no se agregan como latido
  }
  return beats;
}

function listRecords() {
  return fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('_ekg.csv'))
    .map((f) => f.replace('_ekg.csv', ''))
    .sort();
}

/**
 * Construye ventanas deslizantes de latidos y extrae features + etiqueta de ventana.
 * Etiqueta de ventana = 1 (anormal) si algún latido en la ventana es anormal,
 * igual criterio que usa el clasificador en producción (ventana, no latido aislado).
 */
function buildWindowsForRecord(record) {
  const annFile = path.join(DATA_DIR, `${record}_annotations_1.csv`);
  if (!fs.existsSync(annFile)) return [];

  const beats = parseAnnotations(annFile);
  if (beats.length < WINDOW_BEATS) return [];

  const rows = [];
  for (let start = 0; start + WINDOW_BEATS <= beats.length; start += STEP_BEATS) {
    const window = beats.slice(start, start + WINDOW_BEATS);
    const peaks = window.map((b) => b.idx);
    const features = extractFeatures(peaks, FS);
    if (!features.valid) continue;

    const label = window.some((b) => b.label === 1) ? 1 : 0;
    rows.push({ record, features, label });
  }
  return rows;
}

function buildDataset(records) {
  const rows = [];
  for (const record of records) {
    const windows = buildWindowsForRecord(record);
    rows.push(...windows);
  }
  return rows;
}

module.exports = { buildDataset, buildWindowsForRecord, listRecords, parseAnnotations, WINDOW_BEATS, STEP_BEATS, FS };
