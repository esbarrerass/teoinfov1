// Umbrales de interpretación de SNR filtrado, no un estándar formal —
// solo para traducir dB (poco intuitivo) a una señal accionable para el usuario.
export function signalQuality(snrFiltered) {
  if (snrFiltered == null || Number.isNaN(snrFiltered)) return null;
  if (snrFiltered >= 20) return { label: 'Buena', className: 'quality-good' };
  if (snrFiltered >= 10) return { label: 'Aceptable', className: 'quality-fair' };
  return { label: 'Baja — considera repetir la medición', className: 'quality-poor' };
}
