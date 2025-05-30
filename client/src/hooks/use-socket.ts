import { useEffect, useRef, useState } from 'react';
import type { ServerToClientEvents, ClientToServerEvents, GameState } from '@shared/schema';

type SocketEventHandlers = {
  [K in keyof ServerToClientEvents]: (data: any, extra?: any) => void;
};

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Partial<SocketEventHandlers>>({});

  const connect = () => {
    console.log("Connecting to WebSocket...");
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = () => {
      setError('Erreur de connexion WebSocket');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handler = handlersRef.current[message.event as keyof ServerToClientEvents];
        if (handler) {
          if (message.event === 'error') {
            handler(message.data, message.suggestedName);
          } else {
            handler(message.data);
          }
        }

        // Handle specific events
        switch (message.event) {
          case 'gameStateUpdate':
            setGameState(message.data);
            break;
          case 'error':
            setError(message.data);
            break;
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setGameState(null);
  };

  const emit = <K extends keyof ClientToServerEvents>(
    event: K,
    data: Parameters<ClientToServerEvents[K]>[0]
  ) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, data }));
    }
  };

  const on = <K extends keyof ServerToClientEvents>(
    event: K,
    handler: (data: any, extra?: any) => void
  ) => {
    handlersRef.current[event] = handler;
  };

  const off = (event: keyof ServerToClientEvents) => {
    delete handlersRef.current[event];
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    gameState,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    clearError: () => setError(null)
  };
}
