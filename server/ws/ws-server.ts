import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "http";
import { GameError, ValidationError } from "../errors/game-errors";
import { WS_HEARTBEAT_INTERVAL_MS } from "../config/constants";

// Connexion étendue avec flag heartbeat
interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
}

export class ConnectionManager {
  private socketToPlayer = new Map<WebSocket, number>();
  private playerToSocket = new Map<number, WebSocket>();

  register(socket: WebSocket, playerId: number): void {
    this.socketToPlayer.set(socket, playerId);
    this.playerToSocket.set(playerId, socket);
  }

  unregister(socket: WebSocket): number | null {
    const playerId = this.socketToPlayer.get(socket) ?? null;
    if (playerId !== null) {
      this.socketToPlayer.delete(socket);
      this.playerToSocket.delete(playerId);
    }
    return playerId;
  }

  unregisterByPlayerId(playerId: number): void {
    const socket = this.playerToSocket.get(playerId);
    if (socket) {
      this.socketToPlayer.delete(socket);
    }
    this.playerToSocket.delete(playerId);
  }

  getSocket(playerId: number): WebSocket | undefined {
    return this.playerToSocket.get(playerId);
  }

  getPlayerId(socket: WebSocket): number | null {
    return this.socketToPlayer.get(socket) ?? null;
  }
}

export interface HandlerContext {
  socket: WebSocket;
  playerId: number | null;
  setPlayerId: (id: number) => void;
  connectionManager: ConnectionManager;
}

export type MessageHandler = (ctx: HandlerContext, data: any) => Promise<void>;

export function setupWebSocketServer(
  httpServer: Server,
  handlers: Map<string, MessageHandler>,
  connectionManager: ConnectionManager,
  onDisconnect: (playerId: number) => Promise<void>
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Gérer manuellement les upgrades HTTP uniquement pour /ws
  // (évite de bloquer les autres WebSocket comme le HMR de Vite)
  httpServer.on('upgrade', (req, socket, head) => {
    const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : '';
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  // Heartbeat : ping toutes les 30s, terminate si pas de pong
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as AliveWebSocket;
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, WS_HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: WebSocket) => {
    const socket = ws as AliveWebSocket;
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    // Contexte mutable pour cette connexion
    let currentPlayerId: number | null = null;

    const ctx: HandlerContext = {
      socket,
      get playerId() { return currentPlayerId; },
      setPlayerId(id: number) {
        currentPlayerId = id;
        connectionManager.register(socket, id);
      },
      connectionManager
    };

    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as {
          event: string;
          data: any;
        };

        const handler = handlers.get(message.event);
        if (!handler) {
          console.warn(`Événement WebSocket inconnu: ${message.event}`);
          return;
        }

        await handler(ctx, message.data);
      } catch (error) {
        if (error instanceof ValidationError) {
          socket.send(JSON.stringify({
            event: 'error',
            data: error.userMessage,
            suggestedName: error.suggestedName
          }));
        } else if (error instanceof GameError) {
          socket.send(JSON.stringify({
            event: 'error',
            data: error.userMessage
          }));
        } else {
          console.error('Erreur WebSocket:', error);
          socket.send(JSON.stringify({
            event: 'error',
            data: 'Erreur serveur'
          }));
        }
      }
    });

    socket.on('close', async () => {
      const playerId = connectionManager.unregister(socket);
      if (playerId !== null) {
        try {
          await onDisconnect(playerId);
        } catch (error) {
          console.error('Erreur déconnexion:', error);
        }
      }
    });
  });

  return wss;
}
