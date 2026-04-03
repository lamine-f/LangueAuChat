import { type IStorage } from "../storage";
import { type Room, type Player, gameThemes, type GameTheme } from "@shared/schema";
import { ValidationService } from "./validation-service";
import {
  ROOM_CODE_LENGTH,
  ROOM_CODE_CHARS,
  MAX_PLAYERS_PER_ROOM,
  INITIAL_SCORE,
  STARTING_LETTER
} from "../config/constants";
import {
  ValidationError,
  RoomNotFoundError,
  RoomFullError,
  GameAlreadyStartedError,
  MissingFieldsError,
  PlayerNotFoundError
} from "../errors/game-errors";

export interface LeaveResult {
  roomId: string;
  roomDeleted: boolean;
  newHostId?: number;
  winnerId?: number;
}

export class RoomService {
  constructor(
    private storage: IStorage,
    private validationService: ValidationService
  ) {}

  async createRoom(playerName: string, theme: string): Promise<{ room: Room; player: Player }> {
    if (!playerName?.trim() || !gameThemes[theme as GameTheme]) {
      throw new MissingFieldsError('Nom du joueur et thème requis');
    }

    const nameValidation = await this.validationService.validatePlayerName(playerName);
    if (!nameValidation.isValid) {
      throw new ValidationError(
        nameValidation.reason || 'Nom non autorisé',
        nameValidation.suggestedName
      );
    }

    const roomCode = await this.generateUniqueRoomCode();
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room = await this.storage.createRoom({
      id: roomId,
      code: roomCode,
      theme,
      currentLetter: STARTING_LETTER,
      currentPlayerIndex: 0,
      gameStarted: false,
      gameEnded: false,
      roundInProgress: false,
      winnerId: null
    });

    const player = await this.storage.createPlayer({
      name: nameValidation.suggestedName || playerName.trim(),
      roomId,
      score: INITIAL_SCORE,
      isHost: true,
      isEliminated: false,
      hasSubmittedWord: false,
      socketId: null
    });

    return { room, player };
  }

  async joinRoom(roomCode: string, playerName: string): Promise<{ room: Room; player: Player }> {
    if (!roomCode?.trim() || !playerName?.trim()) {
      throw new MissingFieldsError('Code de room et nom du joueur requis');
    }

    const nameValidation = await this.validationService.validatePlayerName(playerName);
    if (!nameValidation.isValid) {
      throw new ValidationError(
        nameValidation.reason || 'Nom non autorisé',
        nameValidation.suggestedName
      );
    }

    const room = await this.storage.getRoomByCode(roomCode.toUpperCase());
    if (!room) {
      throw new RoomNotFoundError();
    }

    if (room.gameStarted) {
      throw new GameAlreadyStartedError();
    }

    const existingPlayers = await this.storage.getPlayersByRoomId(room.id);
    if (existingPlayers.length >= MAX_PLAYERS_PER_ROOM) {
      throw new RoomFullError();
    }

    const player = await this.storage.createPlayer({
      name: nameValidation.suggestedName || playerName.trim(),
      roomId: room.id,
      score: INITIAL_SCORE,
      isHost: false,
      isEliminated: false,
      hasSubmittedWord: false,
      socketId: null
    });

    return { room, player };
  }

  async rejoinRoom(playerId: number): Promise<{ room: Room; player: Player }> {
    const player = await this.storage.getPlayerById(playerId);
    if (!player) {
      throw new PlayerNotFoundError();
    }

    const room = await this.storage.getRoomById(player.roomId);
    if (!room) {
      // La room n'existe plus, nettoyer le joueur
      await this.storage.deletePlayer(playerId);
      throw new RoomNotFoundError();
    }

    return { room, player };
  }

  async leaveRoom(playerId: number): Promise<LeaveResult> {
    const player = await this.storage.getPlayerById(playerId);
    if (!player) {
      throw new PlayerNotFoundError();
    }

    const roomId = player.roomId;
    await this.storage.deletePlayer(playerId);

    const remainingPlayers = await this.storage.getPlayersByRoomId(roomId);

    if (remainingPlayers.length === 0) {
      await this.storage.deleteRoom(roomId);
      return { roomId, roomDeleted: true };
    }

    let newHostId: number | undefined;
    if (player.isHost) {
      newHostId = remainingPlayers[0].id;
      await this.storage.updatePlayer(newHostId, { isHost: true });
    }

    // Si la partie est en cours et qu'il ne reste qu'un joueur, il gagne
    const room = await this.storage.getRoomById(roomId);
    if (room && room.gameStarted && !room.gameEnded && remainingPlayers.length === 1) {
      const winner = remainingPlayers[0];
      await this.storage.updateRoom(roomId, { gameEnded: true, winnerId: winner.id });
      return { roomId, roomDeleted: false, newHostId, winnerId: winner.id };
    }

    return { roomId, roomDeleted: false, newHostId };
  }

  private generateRoomCode(): string {
    let result = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      result += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
    }
    return result;
  }

  private async generateUniqueRoomCode(): Promise<string> {
    let code: string;
    let exists: boolean;
    do {
      code = this.generateRoomCode();
      exists = !!(await this.storage.getRoomByCode(code));
    } while (exists);
    return code;
  }
}
