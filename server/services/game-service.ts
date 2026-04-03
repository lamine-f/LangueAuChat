import { type IStorage } from "../storage";
import { type GameState, type Player, type Room } from "@shared/schema";
import { ValidationService } from "./validation-service";
import {
  ALPHABET,
  BASE_PENALTY,
  PENALTY_REDUCTION_PER_GIVEUP,
  MIN_PENALTY,
  MIN_PLAYERS_TO_START,
  RECENT_WORDS_LIMIT
} from "../config/constants";
import {
  NotHostError,
  NotEnoughPlayersError,
  AlreadySubmittedError,
  InvalidWordError,
  PlayerNotFoundError,
  GameError
} from "../errors/game-errors";

export interface RoundAdvanceResult {
  advanced: boolean;
  gameEnded: boolean;
  winnerId?: number;
  nextLetter?: string;
}

export class GameService {
  constructor(
    private storage: IStorage,
    private validationService: ValidationService
  ) {}

  async startGame(playerId: number): Promise<string> {
    const player = await this.storage.getPlayerById(playerId);
    if (!player) throw new PlayerNotFoundError();
    if (!player.isHost) throw new NotHostError();

    const players = await this.storage.getPlayersByRoomId(player.roomId);
    if (players.length < MIN_PLAYERS_TO_START) throw new NotEnoughPlayersError();

    await this.storage.updateRoom(player.roomId, { gameStarted: true });
    return player.roomId;
  }

  async submitWord(playerId: number, word: string): Promise<{ roomId: string; roundResult: RoundAdvanceResult }> {
    const player = await this.storage.getPlayerById(playerId);
    if (!player) throw new PlayerNotFoundError();

    const room = await this.storage.getRoomById(player.roomId);
    if (!room || !room.gameStarted || room.gameEnded) {
      throw new GameError('Partie non en cours');
    }

    if (player.hasSubmittedWord) throw new AlreadySubmittedError();

    if (!this.validateWordStartsWithLetter(word, room.currentLetter)) {
      throw new InvalidWordError(room.currentLetter);
    }

    const wordValidation = await this.validationService.validateGameWord(word, room.theme, room.currentLetter);
    if (!wordValidation.isValid) {
      throw new GameError(wordValidation.reason || 'Mot non valide pour cette catégorie');
    }

    await this.storage.updatePlayer(player.id, { hasSubmittedWord: true });

    await this.storage.createGameWord({
      roomId: room.id,
      playerId: player.id,
      letter: room.currentLetter,
      word: word.trim(),
      isGiveUp: false,
      penaltyAmount: 0
    });

    const roundResult = await this.checkAndAdvanceRound(room.id);
    return { roomId: room.id, roundResult };
  }

  async giveUp(playerId: number): Promise<{ roomId: string; roundResult: RoundAdvanceResult }> {
    const player = await this.storage.getPlayerById(playerId);
    if (!player) throw new PlayerNotFoundError();

    const room = await this.storage.getRoomById(player.roomId);
    if (!room || !room.gameStarted || room.gameEnded) {
      throw new GameError('Partie non en cours');
    }

    if (player.hasSubmittedWord) {
      throw new AlreadySubmittedError();
    }

    const previousWords = await this.storage.getGameWordsByRoomId(room.id);
    const playerGiveUps = previousWords.filter(w => w.playerId === player.id && w.isGiveUp);
    const penalty = this.calculatePenalty(playerGiveUps.length);

    const newScore = Math.max(0, player.score - penalty);
    const isEliminated = newScore === 0;

    await this.storage.updatePlayer(player.id, {
      score: newScore,
      isEliminated,
      hasSubmittedWord: true
    });

    await this.storage.createGameWord({
      roomId: room.id,
      playerId: player.id,
      letter: room.currentLetter,
      word: null,
      isGiveUp: true,
      penaltyAmount: penalty
    });

    const roundResult = await this.checkAndAdvanceRound(room.id);
    return { roomId: room.id, roundResult };
  }

  async buildGameStateForPlayer(roomId: string, playerId: number): Promise<GameState | null> {
    const room = await this.storage.getRoomById(roomId);
    if (!room) return null;

    const players = await this.storage.getPlayersByRoomId(roomId);
    const recentWords = await this.storage.getRecentWordsByRoomId(roomId, RECENT_WORDS_LIMIT);
    const chatMessages = await this.storage.getChatMessagesByRoomId(roomId);

    const player = players.find(p => p.id === playerId);
    const activePlayers = players.filter(p => !p.isEliminated);

    const playerGiveUps = recentWords.filter(w => w.playerId === playerId && w.isGiveUp).length;
    const nextPenalty = this.calculatePenalty(playerGiveUps);

    const canSubmitWord = player ? !player.hasSubmittedWord && !player.isEliminated : false;
    const playersWaiting = activePlayers.filter(p => !p.hasSubmittedWord).length;

    return {
      room,
      players,
      recentWords,
      chatMessages,
      myPlayerId: playerId,
      isMyTurn: true,
      nextPenalty,
      canSubmitWord,
      playersWaiting
    };
  }

  private async checkAndAdvanceRound(roomId: string): Promise<RoundAdvanceResult> {
    const players = await this.storage.getPlayersByRoomId(roomId);
    const activePlayers = players.filter(p => !p.isEliminated);
    const allSubmitted = activePlayers.every(p => p.hasSubmittedWord);

    if (!allSubmitted) {
      return { advanced: false, gameEnded: false };
    }

    return this.advanceToNextRound(roomId);
  }

  private async advanceToNextRound(roomId: string): Promise<RoundAdvanceResult> {
    const room = await this.storage.getRoomById(roomId);
    if (!room) return { advanced: false, gameEnded: false };

    const players = await this.storage.getPlayersByRoomId(roomId);
    const activePlayers = players.filter(p => !p.isEliminated);

    // Fin par élimination
    if (activePlayers.length <= 1) {
      const winner = activePlayers[0] || this.getHighestScorer(players);
      await this.storage.updateRoom(roomId, { gameEnded: true, winnerId: winner.id });
      return { advanced: true, gameEnded: true, winnerId: winner.id };
    }

    // Fin par alphabet
    const nextLetter = this.getNextLetter(room.currentLetter);
    if (nextLetter === null) {
      const winner = this.getHighestScorer(activePlayers);
      await this.storage.updateRoom(roomId, { gameEnded: true, winnerId: winner.id });
      return { advanced: true, gameEnded: true, winnerId: winner.id };
    }

    // Tour suivant
    for (const player of players) {
      await this.storage.updatePlayer(player.id, { hasSubmittedWord: false });
    }

    await this.storage.updateRoom(roomId, {
      currentLetter: nextLetter,
      roundInProgress: false
    });

    return { advanced: true, gameEnded: false, nextLetter };
  }

  private getNextLetter(currentLetter: string): string | null {
    const currentIndex = ALPHABET.indexOf(currentLetter);
    if (currentIndex === -1 || currentIndex >= ALPHABET.length - 1) {
      return null;
    }
    return ALPHABET[currentIndex + 1];
  }

  private getHighestScorer(players: Player[]): Player {
    return players.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
  }

  private calculatePenalty(giveUpCount: number): number {
    return Math.max(BASE_PENALTY - giveUpCount * PENALTY_REDUCTION_PER_GIVEUP, MIN_PENALTY);
  }

  private validateWordStartsWithLetter(word: string, letter: string): boolean {
    if (!word || !word.trim()) return false;
    return word.trim().toLowerCase().startsWith(letter.toLowerCase());
  }
}
