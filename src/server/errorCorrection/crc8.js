'use strict';

/**
 * CRC-8 con polinomio generador x^8 + x^2 + x + 1 (0x07).
 * Capítulo V — Códigos cíclicos (tema 5.4)
 *
 * Se usa para verificar la integridad de los paquetes seriales Arduino → Node.
 * Estructura del paquete: [0xFF, HIGH_BYTE, LOW_BYTE, CRC8]
 */

// Tabla de búsqueda precalculada (más eficiente que computar bit a bit)
const CRC8_TABLE = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xFF : (crc << 1) & 0xFF;
    }
    table[i] = crc;
  }
  return table;
})();

/**
 * Calcula el CRC-8 de un array de bytes.
 *
 * @param {number[]|Uint8Array} bytes - datos a verificar
 * @returns {number} byte CRC (0–255)
 */
function computeCRC8(bytes) {
  return bytes.reduce((crc, byte) => CRC8_TABLE[crc ^ (byte & 0xFF)], 0x00);
}

/**
 * Verifica si el CRC de los datos coincide con el CRC recibido.
 *
 * @param {number[]} data - bytes de datos (sin el CRC)
 * @param {number}   crc  - byte CRC recibido
 * @returns {boolean}
 */
function verifyCRC8(data, crc) {
  return computeCRC8(data) === crc;
}

/**
 * Simula el efecto de errores de canal en un array de bytes.
 * Útil para la demo de corrección de errores en el frontend.
 *
 * @param {number[]} bytes - datos originales
 * @param {number}   ber   - tasa de error de bit (0.0–1.0)
 * @returns {number[]} datos con errores introducidos
 */
function introduceErrors(bytes, ber = 0.01) {
  return bytes.map(byte => {
    let corrupted = byte;
    for (let bit = 0; bit < 8; bit++) {
      if (Math.random() < ber) corrupted ^= (1 << bit);
    }
    return corrupted & 0xFF;
  });
}

module.exports = { computeCRC8, verifyCRC8, introduceErrors };
