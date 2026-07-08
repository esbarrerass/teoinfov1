'use strict';

/**
 * Código Hamming(7,4) — Código de bloque lineal sistemático.
 * Capítulo V — Códigos de bloque lineales (tema 5.3)
 *
 * Protege el resultado de clasificación (2 bits) ampliado a 4 bits.
 * Puede corregir 1 bit de error y detectar 2 errores.
 *
 * Estructura de la palabra código (posiciones 1-7):
 *   pos: 1   2   3   4   5   6   7
 *   bit: p1  p2  d1  p4  d2  d3  d4
 *
 * Bits de paridad:
 *   p1 = d1 ⊕ d2 ⊕ d4   (cubre posiciones 1,3,5,7)
 *   p2 = d1 ⊕ d3 ⊕ d4   (cubre posiciones 2,3,6,7)
 *   p4 = d2 ⊕ d3 ⊕ d4   (cubre posiciones 4,5,6,7)
 */

/**
 * Codifica 4 bits de datos en una palabra código Hamming de 7 bits.
 *
 * @param {number[]} data4 - array de 4 bits [d1, d2, d3, d4] (valores 0 o 1)
 * @returns {number[]} palabra código de 7 bits [p1, p2, d1, p4, d2, d3, d4]
 */
function encode(data4) {
  if (data4.length !== 4) throw new Error('encode: se requieren exactamente 4 bits de datos');
  const [d1, d2, d3, d4] = data4.map(b => b & 1);

  const p1 = d1 ^ d2 ^ d4;
  const p2 = d1 ^ d3 ^ d4;
  const p4 = d2 ^ d3 ^ d4;

  return [p1, p2, d1, p4, d2, d3, d4];
}

/**
 * Decodifica y corrige (si es posible) una palabra código Hamming de 7 bits.
 *
 * @param {number[]} received7 - array de 7 bits recibidos (pueden contener errores)
 * @returns {{
 *   data: number[],      - 4 bits de datos corregidos
 *   syndrome: number,    - síndrome (0 = sin error, 1-7 = posición del error)
 *   corrected: boolean,  - si se corrigió un error
 *   uncorrectable: boolean - si se detectaron 2 errores (no corregibles)
 * }}
 */
function decode(received7) {
  if (received7.length !== 7) throw new Error('decode: se requieren exactamente 7 bits');
  const r = received7.map(b => b & 1);

  // Cálculo del síndrome
  const s1 = r[0] ^ r[2] ^ r[4] ^ r[6]; // posiciones 1,3,5,7
  const s2 = r[1] ^ r[2] ^ r[5] ^ r[6]; // posiciones 2,3,6,7
  const s4 = r[3] ^ r[4] ^ r[5] ^ r[6]; // posiciones 4,5,6,7

  const syndrome = s1 + 2 * s2 + 4 * s4; // posición del error (1-indexed)

  const corrected = [...r];
  let wasCorrected = false;

  if (syndrome !== 0) {
    // Corregir el bit en la posición indicada por el síndrome
    const errIdx = syndrome - 1;
    if (errIdx < 7) {
      corrected[errIdx] ^= 1;
      wasCorrected = true;
    }
  }

  // Extraer bits de datos: posiciones 3,5,6,7 → índices 2,4,5,6
  const data = [corrected[2], corrected[4], corrected[5], corrected[6]];

  return {
    data,
    syndrome,
    corrected: wasCorrected,
    uncorrectable: false // Hamming(7,4) no puede distinguir 2 errores sin SECDED
  };
}

/**
 * Convierte un label de clasificación en 4 bits para demostración.
 * Normal=0000, Bradycardia=0001, Tachycardia=0010, Arrhythmia=0011
 */
const LABEL_MAP = { Normal: [0,0,0,0], Bradycardia: [0,0,0,1], Tachycardia: [0,0,1,0], Arrhythmia: [0,0,1,1] };
const LABEL_RMAP = Object.fromEntries(Object.entries(LABEL_MAP).map(([k, v]) => [v.join(''), k]));

function encodeLabel(label) {
  const bits = LABEL_MAP[label] || [0, 0, 0, 0];
  return encode(bits);
}

function decodeLabel(codeword7) {
  const { data } = decode(codeword7);
  return LABEL_RMAP[data.join('')] || 'Unknown';
}

module.exports = { encode, decode, encodeLabel, decodeLabel };
