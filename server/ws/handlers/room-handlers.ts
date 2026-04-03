import { type MessageHandler } from "../ws-server";
import { type ConnectionManager } from "../ws-server";
import { RoomService } from "../../services/room-service";
import { Broadcaster } from "../broadcast";

export function createRoomHandlers(
  roomService: RoomService,
  broadcaster: Broadcaster,
  connectionManager: ConnectionManager
): Map<string, MessageHandler> {
  const handlers = new Map<string, MessageHandler>();

  handlers.set('createRoom', async (ctx, data) => {
    const { playerName, theme } = data;
    const { room, player } = await roomService.createRoom(playerName, theme);

    ctx.setPlayerId(player.id);
    await broadcaster.sendGameStateToRoom(room.id);
  });

  handlers.set('joinRoom', async (ctx, data) => {
    const { roomCode, playerName } = data;
    const { room, player } = await roomService.joinRoom(roomCode, playerName);

    ctx.setPlayerId(player.id);
    await broadcaster.broadcastToRoom(room.id, 'playerJoined', player);
    await broadcaster.sendGameStateToRoom(room.id);
  });

  handlers.set('rejoinRoom', async (ctx, data) => {
    const { playerId } = data;
    const { room, player } = await roomService.rejoinRoom(playerId);

    ctx.setPlayerId(player.id);
    await broadcaster.sendGameStateToRoom(room.id);
  });

  handlers.set('leaveRoom', async (ctx) => {
    if (!ctx.playerId) return;

    const result = await roomService.leaveRoom(ctx.playerId);
    connectionManager.unregisterByPlayerId(ctx.playerId);

    await broadcaster.broadcastToRoom(result.roomId, 'playerLeft', ctx.playerId);

    if (!result.roomDeleted) {
      await broadcaster.sendGameStateToRoom(result.roomId);
    }
  });

  return handlers;
}
