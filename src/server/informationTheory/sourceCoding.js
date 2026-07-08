'use strict';

const { shannonEntropy } = require('./entropy');

/**
 * Construye el árbol de Huffman desde una tabla de frecuencias.
 * Capítulo IV — Codificación de la fuente (tema 4.3)
 *
 * @param {{ [symbol: string]: number }} freqMap - mapa símbolo → frecuencia
 * @returns {object} raíz del árbol de Huffman
 */
function buildHuffmanTree(freqMap) {
  let nodes = Object.entries(freqMap).map(([sym, freq]) => ({
    sym, freq, left: null, right: null
  }));

  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq);
    const left = nodes.shift();
    const right = nodes.shift();
    nodes.push({ sym: null, freq: left.freq + right.freq, left, right });
  }

  return nodes[0] || null;
}

/**
 * Asigna códigos binarios a cada hoja del árbol de Huffman.
 */
function assignCodes(node, prefix = '', codes = {}) {
  if (!node) return codes;
  if (!node.left && !node.right) {
    codes[node.sym] = prefix || '0'; // caso de un solo símbolo
    return codes;
  }
  assignCodes(node.left, prefix + '0', codes);
  assignCodes(node.right, prefix + '1', codes);
  return codes;
}

/**
 * Cuantiza los intervalos RR en bins de 50 ms y calcula la codificación Huffman.
 * Demuestra el primer teorema de Shannon: longitud media ≈ H(fuente).
 *
 * @param {number[]} rrIntervals - intervalos RR en ms
 * @returns {{
 *   bins: string[],
 *   codes: object,
 *   avgCodeLength: number,
 *   entropy: number,
 *   redundancy: number,
 *   freqMap: object
 * }}
 */
function huffmanCode(rrIntervals) {
  if (!rrIntervals || rrIntervals.length < 2) {
    return { bins: [], codes: {}, avgCodeLength: 0, entropy: 0, redundancy: 0, freqMap: {} };
  }

  // Cuantizar en bins de 50 ms (ej: "600-650", "650-700", ...)
  const BIN_WIDTH = 50;
  const bins = rrIntervals.map(rr => {
    const lo = Math.floor(rr / BIN_WIDTH) * BIN_WIDTH;
    return `${lo}-${lo + BIN_WIDTH}`;
  });

  // Tabla de frecuencias
  const freqMap = {};
  for (const b of bins) freqMap[b] = (freqMap[b] || 0) + 1;

  const tree = buildHuffmanTree(freqMap);
  const codes = assignCodes(tree);

  // Longitud media del código Huffman: Σ p(si) · |code(si)|
  const N = bins.length;
  let avgCodeLength = 0;
  for (const [sym, freq] of Object.entries(freqMap)) {
    avgCodeLength += (freq / N) * (codes[sym] ? codes[sym].length : 0);
  }

  const entropy = shannonEntropy(bins);
  const redundancy = parseFloat((avgCodeLength - entropy).toFixed(4));

  return {
    bins,
    codes,
    avgCodeLength: parseFloat(avgCodeLength.toFixed(4)),
    entropy,
    redundancy,
    freqMap
  };
}

module.exports = { huffmanCode, buildHuffmanTree, assignCodes };
