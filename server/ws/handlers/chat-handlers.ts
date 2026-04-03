import { type MessageHandler } from "../ws-server";
import { type IStorage } from "../../storage";
import { Broadcaster } from "../broadcast";

export function createChatHandlers(
  storage: IStorage,
  broadcaster: Broadcaster
): Map<string, MessageHandler> {
  const handlers = new Map<string, MessageHandler>();

  handlers.set('sendChatMessage', async (ctx, data) => {
    if (!ctx.playerId) return;

    const messageText = typeof data === 'string' ? data.trim() : data?.trim?.() ?? '';
    if (!messageText) return;

    const player = await storage.getPlayerById(ctx.playerId);
    if (!player) return;

    const chatMessage = await storage.createChatMessage({
      roomId: player.roomId,
      playerId: player.id,
      message: messageText
    });

    await broadcaster.broadcastToRoom(player.roomId, 'chatMessage', {
      ...chatMessage,
      playerName: player.name
    });
  });

  return handlers;
}
