import { useCallback, useEffect, useRef, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:4000/ws`;
const SCROLL_BUFFER_SIZE = 400;

/**
 * Igual que useECGSocket pero mantiene raw y filtered por separado (para el
 * panel de "Limpieza de señal", que necesita mostrar ambas curvas a la vez) y
 * expone un botón de pausa — requerido por accesibilidad en gráficos de
 * streaming en tiempo real (permite congelar la lectura para inspeccionarla).
 */
export function useProcessSocket() {
  const [connected, setConnected] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [rawSignal, setRawSignal] = useState([]);
  const [filteredSignal, setFilteredSignal] = useState([]);
  const [paused, setPaused] = useState(false);

  const wsRef = useRef(null);
  const rawBufferRef = useRef([]);
  const filteredBufferRef = useRef([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    rawBufferRef.current = new Array(SCROLL_BUFFER_SIZE).fill(0);
    filteredBufferRef.current = new Array(SCROLL_BUFFER_SIZE).fill(0);
    setRawSignal(rawBufferRef.current);
    setFilteredSignal(filteredBufferRef.current);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      if (pausedRef.current) return;
      const msg = JSON.parse(event.data);

      if (msg.type === 'signal') {
        if (msg.raw?.length) {
          rawBufferRef.current = rawBufferRef.current.concat(msg.raw).slice(-SCROLL_BUFFER_SIZE);
          setRawSignal(rawBufferRef.current);
        }
        if (msg.filtered?.length) {
          filteredBufferRef.current = filteredBufferRef.current.concat(msg.filtered).slice(-SCROLL_BUFFER_SIZE);
          setFilteredSignal(filteredBufferRef.current);
        }
        return;
      }

      if (msg.type === 'analysis') {
        setAnalysis(msg);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connected, analysis, rawSignal, filteredSignal, paused, togglePause };
}
