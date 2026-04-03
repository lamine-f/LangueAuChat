import { type MessageHandler } from "../ws-server";
import { type ConnectionManager } from "../ws-server";
import { GameService } from "../../services/game-service";
import { Broadcaster } from "../broadcast";

export function createGameHandlers(
  gameService: GameService,
  broadcaster: Broadcaster,
  connectionManager: ConnectionManager
): Map<string, MessageHandler> {
  const handlers = new Map<string, MessageHandler>();

  handlers.set('startGame', async (ctx) => {
    if (!ctx.playerId) return;

    const roomId = await gameService.startGame(ctx.playerId);
    await broadcaster.broadcastToRoom(roomId, 'gameStarted', null);
    await broadcaster.sendGameStateToRoom(roomId);
  });

  handlers.set('submitWord', async (ctx, data) => {
    if (!ctx.playerId) return;

    const word = typeof data === 'string' ? data.trim() : data?.trim?.() ?? '';
    const { roomId, roundResult } = await gameService.submitWord(ctx.playerId, word);

    if (roundResult.gameEnded && roundResult.winnerId !== undefined) {
      await broadcaster.broadcastToRoom(roomId, 'gameEnded', roundResult.winnerId);
    } else if (roundResult.advanced && roundResult.nextLetter) {
      await broadcaster.broadcastToRoom(roomId, 'letterChanged', roundResult.nextLetter);
    }

    await broadcaster.sendGameStateToRoom(roomId);
  });

  handlers.set('giveUp', async (ctx) => {
    if (!ctx.playerId) return;

    const { roomId, roundResult } = await gameService.giveUp(ctx.playerId);

    if (roundResult.gameEnded && roundResult.winnerId !== undefined) {
      await broadcaster.broadcastToRoom(roomId, 'gameEnded', roundResult.winnerId);
    } else if (roundResult.advanced && roundResult.nextLetter) {
      await broadcaster.broadcastToRoom(roomId, 'letterChanged', roundResult.nextLetter);
    }

    await broadcaster.sendGameStateToRoom(roomId);
  });

  return handlers;
}
