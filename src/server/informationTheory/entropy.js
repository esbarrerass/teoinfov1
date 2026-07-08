'use strict';

/**
 * Entropía de Shannon: H(X) = -Σ p(x) · log₂(p(x))
 * Capítulo IV — Teoría de la Información (tema 4.2)
 *
 * @param {number[]|string[]} symbols - secuencia de símbolos (labels o valores cuantizados)
 * @returns {number} entropía en bits
 */
function shannonEntropy(symbols) {
  if (!symbols || symbols.length === 0) return 0;

  const counts = {};
  for (const s of symbols) {
    counts[s] = (counts[s] || 0) + 1;
  }

  const N = symbols.length;
  let H = 0;
  for (const count of Object.values(counts)) {
    const p = count / N;
    if (p > 0) H -= p * Math.log2(p);
  }

  return parseFloat(H.toFixed(4));
}

/**
 * Entropía de la secuencia de clasificaciones de latidos.
 * Cuanto mayor sea la entropía, más impredecible (y potencialmente más patológico) es el ritmo.
 *
 * @param {string[]} labels - array de 'Normal' | 'Bradycardia' | 'Tachycardia'
 * @returns {{ entropy: number, probabilities: object, bitsPerBeat: number }}
 */
function beatEntropy(labels) {
  if (!labels || labels.length === 0) {
    return { entropy: 0, probabilities: {}, bitsPerBeat: 0 };
  }

  const counts = {};
  for (const l of labels) counts[l] = (counts[l] || 0) + 1;

  const N = labels.length;
  const probabilities = {};
  for (const [label, count] of Object.entries(counts)) {
    probabilities[label] = parseFloat((count / N).toFixed(4));
  }

  const entropy = shannonEntropy(labels);

  return { entropy, probabilities, bitsPerBeat: entropy };
}

module.exports = { shannonEntropy, beatEntropy };
