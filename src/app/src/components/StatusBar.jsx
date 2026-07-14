export default function StatusBar({ connected, classification }) {
  const isAbnormal = classification?.isAbnormal;
  const label = classification?.label || '—';

  return (
    <div className="status-bar">
      <span className={`dot ${connected ? 'dot-on' : 'dot-off'}`} />
      <span>{connected ? 'Conectado' : 'Desconectado'}</span>
      <span className={`classification ${isAbnormal ? 'abnormal' : 'normal'}`}>
        {label}
      </span>
    </div>
  );
}
