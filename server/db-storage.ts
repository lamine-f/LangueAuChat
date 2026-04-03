import { eq, desc, asc } from "drizzle-orm";
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
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
  type InsertChatMessage,
} from "@shared/schema";
import { type IStorage } from "./storage";

export class DbStorage implements IStorage {
  constructor(private db: NodePgDatabase) {}

  // Room methods
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await this.db.insert(rooms).values(insertRoom).returning();
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async getRoomById(id: string): Promise<Room | undefined> {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const [room] = await this.db
      .update(rooms)
      .set(updates)
      .where(eq(rooms.id, id))
      .returning();
    return room;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const result = await this.db.delete(rooms).where(eq(rooms.id, id)).returning();
    return result.length > 0;
  }

  // Player methods
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await this.db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    const [player] = await this.db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async getPlayersByRoomId(roomId: string): Promise<Player[]> {
    return this.db.select().from(players).where(eq(players.roomId, roomId));
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const [player] = await this.db
      .update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async deletePlayer(id: number): Promise<boolean> {
    const result = await this.db.delete(players).where(eq(players.id, id)).returning();
    return result.length > 0;
  }

  async deletePlayersByRoomId(roomId: string): Promise<boolean> {
    await this.db.delete(players).where(eq(players.roomId, roomId));
    return true;
  }

  // Game words methods
  async createGameWord(insertWord: InsertGameWord): Promise<GameWord> {
    const [word] = await this.db.insert(gameWords).values(insertWord).returning();
    return word;
  }

  async getGameWordsByRoomId(roomId: string): Promise<GameWord[]> {
    return this.db
      .select()
      .from(gameWords)
      .where(eq(gameWords.roomId, roomId))
      .orderBy(asc(gameWords.createdAt));
  }

  async getRecentWordsByRoomId(roomId: string, limit: number = 10): Promise<GameWord[]> {
    // Récupérer les N derniers mots (ORDER BY DESC + LIMIT puis inverser)
    const words = await this.db
      .select()
      .from(gameWords)
      .where(eq(gameWords.roomId, roomId))
      .orderBy(desc(gameWords.createdAt))
      .limit(limit);
    return words.reverse();
  }

  // Chat methods
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await this.db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }

  async getChatMessagesByRoomId(roomId: string): Promise<ChatMessage[]> {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(asc(chatMessages.createdAt));
  }
}
