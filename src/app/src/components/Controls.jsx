export default function Controls({ connected, onStart, onStop }) {
  return (
    <div className="controls">
      <button className="btn btn-start" onClick={onStart} disabled={connected}>
        Iniciar
      </button>
      <button className="btn btn-stop" onClick={onStop} disabled={!connected}>
        Detener
      </button>
    </div>
  );
}
