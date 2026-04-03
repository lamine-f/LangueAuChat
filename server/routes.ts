import type { Express } from "express";
import { createServer, type Server } from "http";
import dotenv from "dotenv";

import { MemStorage } from "./storage";
import { ValidationService } from "./services/validation-service";
import { RoomService } from "./services/room-service";
import { GameService } from "./services/game-service";
import { ConnectionManager, setupWebSocketServer, type MessageHandler } from "./ws/ws-server";
import { Broadcaster } from "./ws/broadcast";
import { createRoomHandlers } from "./ws/handlers/room-handlers";
import { createGameHandlers } from "./ws/handlers/game-handlers";
import { createChatHandlers } from "./ws/handlers/chat-handlers";

dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Instanciation des dépendances
  const storage = new MemStorage();
  const validationService = new ValidationService(process.env.GROQ_API_KEY);
  const connectionManager = new ConnectionManager();
  const roomService = new RoomService(storage, validationService);
  const gameService = new GameService(storage, validationService);
  const broadcaster = new Broadcaster(storage, connectionManager, gameService);

  // Assemblage des handlers
  const allHandlers = new Map<string, MessageHandler>();

  const handlerGroups = [
    createRoomHandlers(roomService, broadcaster, connectionManager),
    createGameHandlers(gameService, broadcaster, connectionManager),
    createChatHandlers(storage, broadcaster)
  ];

  handlerGroups.forEach(group => {
    group.forEach((handler, key) => {
      allHandlers.set(key, handler);
    });
  });

  // Callback de déconnexion
  const onDisconnect = async (playerId: number) => {
    try {
      const result = await roomService.leaveRoom(playerId);
      await broadcaster.broadcastToRoom(result.roomId, 'playerLeft', playerId);
      if (!result.roomDeleted) {
        await broadcaster.sendGameStateToRoom(result.roomId);
      }
    } catch {
      // Le joueur n'existe peut-être plus
    }
  };

  // Démarrage du serveur WebSocket
  setupWebSocketServer(httpServer, allHandlers, connectionManager, onDisconnect);

  return httpServer;
}
