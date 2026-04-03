import type { Express } from "express";
import { createServer, type Server } from "http";
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { type IStorage, MemStorage } from "./storage";
import { DbStorage } from "./db-storage";
import { ValidationService } from "./services/validation-service";
import { RoomService } from "./services/room-service";
import { GameService } from "./services/game-service";
import { ConnectionManager, setupWebSocketServer, type MessageHandler } from "./ws/ws-server";
import { Broadcaster } from "./ws/broadcast";
import { createRoomHandlers } from "./ws/handlers/room-handlers";
import { createGameHandlers } from "./ws/handlers/game-handlers";
import { createChatHandlers } from "./ws/handlers/chat-handlers";
import { log } from "./vite";

dotenv.config();

function createStorage(): IStorage {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);
    log("Utilisation de PostgreSQL");
    return new DbStorage(db);
  }
  log("Utilisation du stockage en mémoire (pas de DATABASE_URL)");
  return new MemStorage();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Instanciation des dépendances
  const storage = createStorage();
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

  // Callback de déconnexion — ne supprime PAS le joueur pour permettre le rejoin
  const onDisconnect = async (_playerId: number) => {
    // Le joueur reste dans la room pour pouvoir se reconnecter (refresh).
    // La suppression ne se fait que sur leaveRoom explicite.
  };

  // Démarrage du serveur WebSocket
  setupWebSocketServer(httpServer, allHandlers, connectionManager, onDisconnect);

  return httpServer;
}
