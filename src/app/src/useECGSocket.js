import { useCallback, useEffect, useRef, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:4000/ws`;
const SCROLL_BUFFER_SIZE = 400; // muestras visibles en el gráfico (~ventana deslizante tipo monitor)

export function useECGSocket() {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const [scrollSignal, setScrollSignal] = useState([]);
  const wsRef = useRef(null);
  const scrollBufferRef = useRef([]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    // Precargar con ceros para que el gráfico arranque a ancho completo
    // y el llenado real se sienta como scroll desde el primer momento.
    scrollBufferRef.current = new Array(SCROLL_BUFFER_SIZE).fill(0);
    setScrollSignal(scrollBufferRef.current);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'signal') {
        // Streaming muestra por muestra tal como llega del servidor (~25 envíos/seg,
        // chunks pequeños) — se dibuja de inmediato, sin espaciarlo artificialmente.
        const incoming = msg.filtered || msg.raw || [];
        if (incoming.length > 0) {
          const buffer = scrollBufferRef.current.concat(incoming);
          scrollBufferRef.current = buffer.slice(-SCROLL_BUFFER_SIZE);
          setScrollSignal(scrollBufferRef.current);
        }
        return;
      }

      if (msg.type === 'analysis') {
        setData(msg);
      }
    };
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { connected, data, scrollSignal, connect, disconnect };
}
