import { WebSocket } from "ws";
import { type IStorage } from "../storage";
import { ConnectionManager } from "./ws-server";
import { GameService } from "../services/game-service";
import { type ServerToClientEvents } from "@shared/schema";

export class Broadcaster {
  constructor(
    private storage: IStorage,
    private connectionManager: ConnectionManager,
    private gameService: GameService
  ) {}

  async broadcastToRoom(roomId: string, event: keyof ServerToClientEvents, data: any): Promise<void> {
    const players = await this.storage.getPlayersByRoomId(roomId);
    for (const player of players) {
      const socket = this.connectionManager.getSocket(player.id);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event, data }));
      }
    }
  }

  async sendGameStateToRoom(roomId: string): Promise<void> {
    const players = await this.storage.getPlayersByRoomId(roomId);

    for (const player of players) {
      const socket = this.connectionManager.getSocket(player.id);
      if (socket && socket.readyState === WebSocket.OPEN) {
        const gameState = await this.gameService.buildGameStateForPlayer(roomId, player.id);
        if (gameState) {
          socket.send(JSON.stringify({
            event: 'gameStateUpdate',
            data: gameState
          }));
        }
      }
    }
  }
}
