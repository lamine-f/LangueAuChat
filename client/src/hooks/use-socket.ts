import { useEffect, useRef, useCallback, useState } from 'react';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/schema';

type ServerEvent = keyof ServerToClientEvents;
type EventHandler = (...args: any[]) => void;

const MAX_RECONNECT_DELAY = 30_000;
const INITIAL_RECONNECT_DELAY = 1_000;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<ServerEvent, Set<EventHandler>>>(new Map());
  const messageQueueRef = useRef<string[]>([]);
  const intentionalCloseRef = useRef(false);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushQueue = useCallback((socket: WebSocket) => {
    while (messageQueueRef.current.length > 0) {
      const msg = messageQueueRef.current.shift()!;
      socket.send(msg);
    }
  }, []);

  const setupSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      flushQueue(socket);
    };

    socket.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;

      if (!intentionalCloseRef.current) {
        // Auto-reconnect avec backoff exponentiel
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
        reconnectTimerRef.current = setTimeout(setupSocket, delay);
      }
    };

    socket.onerror = () => {
      // onclose sera appelé juste après
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as {
          event: ServerEvent;
          data: any;
          suggestedName?: string;
        };

        const eventHandlers = handlersRef.current.get(message.event);
        if (eventHandlers) {
          eventHandlers.forEach((handler) => {
            if (message.event === 'error') {
              handler(message.data, message.suggestedName);
            } else {
              handler(message.data);
            }
          });
        }
      } catch (err) {
        console.error('Erreur parsing message WebSocket:', err);
      }
    };
  }, [flushQueue]);

  const connect = useCallback(() => {
    intentionalCloseRef.current = false;
    setupSocket();
  }, [setupSocket]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const emit = useCallback(<K extends keyof ClientToServerEvents>(
    event: K,
    data: Parameters<ClientToServerEvents[K]>[0]
  ) => {
    const msg = JSON.stringify({ event, data });
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(msg);
    } else {
      messageQueueRef.current.push(msg);
    }
  }, []);

  const on = useCallback(<K extends ServerEvent>(
    event: K,
    handler: EventHandler
  ): (() => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    // Retourne un unsubscribe
    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, connect, disconnect, emit, on };
}
