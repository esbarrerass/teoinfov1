'use strict';

/**
 * Filtro IIR pasa-altas de 1er orden (Butterworth).
 * Elimina deriva de línea base por debajo de fc.
 * Ecuación: y[n] = α·y[n-1] + α·(x[n] - x[n-1])
 */
function applyHighPass(signal, fc, fs) {
  const K = Math.tan(Math.PI * fc / fs);
  const b0 = 1 / (1 + K);
  const b1 = -b0;
  const a1 = (K - 1) / (K + 1);

  const out = new Array(signal.length);
  out[0] = signal[0];
  for (let i = 1; i < signal.length; i++) {
    out[i] = b0 * signal[i] + b1 * signal[i - 1] - a1 * out[i - 1];
  }
  return out;
}

/**
 * Filtro IIR pasa-bajas de 1er orden (Butterworth).
 * Atenúa frecuencias de ruido por encima de fc.
 * Ecuación: y[n] = b0·x[n] + b1·x[n-1] - a1·y[n-1]
 */
function applyLowPass(signal, fc, fs) {
  const K = Math.tan(Math.PI * fc / fs);
  const b0 = K / (1 + K);
  const b1 = b0;
  const a1 = (K - 1) / (K + 1);

  const out = new Array(signal.length);
  out[0] = signal[0];
  for (let i = 1; i < signal.length; i++) {
    out[i] = b0 * signal[i] + b1 * signal[i - 1] - a1 * out[i - 1];
  }
  return out;
}

/**
 * Filtro IIR notch de 2do orden.
 * Suprime interferencia de la red eléctrica a fn Hz.
 * H(z): b = [1, -2cos(ω0), 1] / a = [1, -2r·cos(ω0), r²]
 */
function applyNotch(signal, fn, fs, bw = 4) {
  const r = 1 - (Math.PI * bw) / fs;
  const w0 = (2 * Math.PI * fn) / fs;
  const cosW0 = Math.cos(w0);

  // Coeficientes del numerador y denominador
  const bCoeffs = [1, -2 * cosW0, 1];
  const aCoeffs = [1, -2 * r * cosW0, r * r];

  // Normalizar ganancia en DC: H(1) = Σb / Σa ≈ 1 para bw pequeño
  const dcGain = (bCoeffs[0] + bCoeffs[1] + bCoeffs[2]) /
                 (aCoeffs[0] + aCoeffs[1] + aCoeffs[2]);
  const bNorm = bCoeffs.map(v => v / dcGain);

  const out = new Array(signal.length).fill(0);
  for (let i = 0; i < signal.length; i++) {
    out[i] = bNorm[0] * signal[i];
    if (i >= 1) out[i] += bNorm[1] * signal[i - 1] - aCoeffs[1] * out[i - 1];
    if (i >= 2) out[i] += bNorm[2] * signal[i - 2] - aCoeffs[2] * out[i - 2];
  }
  return out;
}

/**
 * Pipeline completa de preprocesamiento ECG.
 * 1. HPF 0.5 Hz  → elimina deriva de línea base
 * 2. LPF 40 Hz   → elimina ruido EMG muscular
 * 3. Notch 60 Hz → elimina interferencia de red eléctrica
 *
 * NOTA: se probó subir el corte del pasa-altas (hasta 1 Hz, 1er y 2do orden)
 * para eliminar una "joroba" ancha visible tras cada QRS. Análisis espectral
 * (FFT sobre señal cruda real) mostró que la energía dominante de esa joroba
 * cae en ~1.1-1.2 Hz, coincidiendo con la frecuencia cardíaca fundamental — es
 * decir, es la propia onda T/repolarización tal como la capta este sensor de
 * una derivación, no ruido de baja frecuencia separable. Subir el corte ahí
 * solo distorsiona la señal útil sin eliminar nada ajeno. Se mantiene 0.5 Hz.
 *
 * @param {number[]} rawSignal - señal ECG cruda
 * @param {number}   fs        - frecuencia de muestreo (Hz)
 * @returns {{ raw: number[], filtered: number[] }}
 */
function preprocess(rawSignal, fs = 360) {
  const nyquist = fs / 2;
  const lowPassFc = Math.min(40, nyquist * 0.9);
  // El notch de 60 Hz (interferencia de red) solo tiene sentido si esa frecuencia
  // cae claramente dentro de la banda útil. A fs bajas (p. ej. 49 Hz, Nyquist 24.5 Hz)
  // 60 Hz ni siquiera es representable — omitir el notch en vez de aplicarlo a una
  // frecuencia arbitraria que distorsionaría el QRS.
  const notchFn = 60;

  let filtered = applyHighPass(rawSignal, 0.5, fs);
  filtered = applyLowPass(filtered, lowPassFc, fs);
  if (notchFn < nyquist * 0.9) filtered = applyNotch(filtered, notchFn, fs, 4);
  return { raw: rawSignal, filtered };
}

module.exports = { preprocess, applyHighPass, applyLowPass, applyNotch };
