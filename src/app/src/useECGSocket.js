import { useCallback, useEffect, useRef, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:4000/ws`;
const SCROLL_BUFFER_SIZE = 400; // muestras visibles en el gráfico (~ventana deslizante tipo monitor)

export function useECGSocket() {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const [scrollSignal, setScrollSignal] = useState([]);
  const wsRef = useRef(null);
  const scrollBufferRef = useRef([]);
  const pendingQueueRef = useRef([]);
  const sampleIntervalMsRef = useRef(1000 / 49);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);

  const stopPlayback = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback((now) => {
    if (lastTickRef.current === 0) lastTickRef.current = now;
    const elapsed = now - lastTickRef.current;
    const samplesToEmit = Math.floor(elapsed / sampleIntervalMsRef.current);

    if (samplesToEmit > 0 && pendingQueueRef.current.length > 0) {
      const emitted = pendingQueueRef.current.splice(0, samplesToEmit);
      lastTickRef.current = now;

      if (emitted.length > 0) {
        const buffer = scrollBufferRef.current.concat(emitted);
        scrollBufferRef.current = buffer.slice(-SCROLL_BUFFER_SIZE);
        setScrollSignal(scrollBufferRef.current);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopPlayback();
    setConnected(false);
  }, [stopPlayback]);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    // Precargar con ceros para que el gráfico arranque a ancho completo
    // y el llenado real se sienta como scroll desde el primer momento.
    scrollBufferRef.current = new Array(SCROLL_BUFFER_SIZE).fill(0);
    pendingQueueRef.current = [];
    lastTickRef.current = 0;
    setScrollSignal(scrollBufferRef.current);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    };
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      stopPlayback();
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setData(msg);

      const incoming = msg.filtered || msg.raw || [];
      // Espaciar la próxima ráfaga de muestras a lo largo del intervalo real entre frames,
      // para que se "dibujen" gradualmente en vez de aparecer todas de golpe.
      pendingQueueRef.current.push(...incoming);
    };
  }, [tick, stopPlayback]);

  useEffect(() => () => disconnect(), [disconnect]);

  return { connected, data, scrollSignal, connect, disconnect };
}
