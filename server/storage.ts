import { 
  players, 
  rooms, 
  gameWords, 
  chatMessages,
  type Player, 
  type InsertPlayer,
  type Room, 
  type InsertRoom,
  type GameWord,
  type InsertGameWord,
  type ChatMessage,
  type InsertChatMessage
} from "@shared/schema";

export interface IStorage {
  // Room methods
  createRoom(room: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  getRoomById(id: string): Promise<Room | undefined>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<boolean>;

  // Player methods
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayerById(id: number): Promise<Player | undefined>;
  getPlayersByRoomId(roomId: string): Promise<Player[]>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;
  deletePlayersByRoomId(roomId: string): Promise<boolean>;

  // Game words methods
  createGameWord(word: InsertGameWord): Promise<GameWord>;
  getGameWordsByRoomId(roomId: string): Promise<GameWord[]>;
  getRecentWordsByRoomId(roomId: string, limit?: number): Promise<GameWord[]>;

  // Chat methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByRoomId(roomId: string): Promise<ChatMessage[]>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room> = new Map();
  private players: Map<number, Player> = new Map();
  private gameWords: Map<number, GameWord> = new Map();
  private chatMessages: Map<number, ChatMessage> = new Map();
  
  private playerIdCounter = 1;
  private gameWordIdCounter = 1;
  private chatMessageIdCounter = 1;

  // Room methods
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      id: insertRoom.id,
      code: insertRoom.code,
      theme: insertRoom.theme,
      currentLetter: insertRoom.currentLetter ?? 'A',
      currentPlayerIndex: insertRoom.currentPlayerIndex ?? 0,
      gameStarted: insertRoom.gameStarted ?? false,
      gameEnded: insertRoom.gameEnded ?? false,
      roundInProgress: insertRoom.roundInProgress ?? false,
      winnerId: insertRoom.winnerId ?? null,
      createdAt: new Date()
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  async getRoomById(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: string): Promise<boolean> {
    return this.rooms.delete(id);
  }

  // Player methods
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerIdCounter++;
    const player: Player = {
      id,
      name: insertPlayer.name,
      roomId: insertPlayer.roomId,
      score: insertPlayer.score ?? 1000,
      isHost: insertPlayer.isHost ?? false,
      isEliminated: insertPlayer.isEliminated ?? false,
      hasSubmittedWord: insertPlayer.hasSubmittedWord ?? false,
      socketId: insertPlayer.socketId ?? null,
      createdAt: new Date()
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayersByRoomId(roomId: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.roomId === roomId);
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async deletePlayer(id: number): Promise<boolean> {
    return this.players.delete(id);
  }

  async deletePlayersByRoomId(roomId: string): Promise<boolean> {
    const playersToDelete = Array.from(this.players.values())
      .filter(player => player.roomId === roomId);
    
    playersToDelete.forEach(player => this.players.delete(player.id));
    return true;
  }

  // Game words methods
  async createGameWord(insertWord: InsertGameWord): Promise<GameWord> {
    const id = this.gameWordIdCounter++;
    const gameWord: GameWord = {
      id,
      roomId: insertWord.roomId,
      playerId: insertWord.playerId,
      letter: insertWord.letter,
      word: insertWord.word ?? null,
      isGiveUp: insertWord.isGiveUp ?? false,
      penaltyAmount: insertWord.penaltyAmount ?? 0,
      createdAt: new Date()
    };
    this.gameWords.set(id, gameWord);
    return gameWord;
  }

  async getGameWordsByRoomId(roomId: string): Promise<GameWord[]> {
    return Array.from(this.gameWords.values())
      .filter(word => word.roomId === roomId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async getRecentWordsByRoomId(roomId: string, limit: number = 10): Promise<GameWord[]> {
    const words = await this.getGameWordsByRoomId(roomId);
    return words.slice(-limit);
  }

  // Chat methods
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.chatMessageIdCounter++;
    const chatMessage: ChatMessage = {
      ...insertMessage,
      id,
      createdAt: new Date()
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }

  async getChatMessagesByRoomId(roomId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.roomId === roomId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }
}

