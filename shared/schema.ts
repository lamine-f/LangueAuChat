import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Game themes available
export const gameThemes = {
  animaux: { name: "Animaux", icon: "🐾", examples: ["Chat", "Chien", "Éléphant"] },
  fruits: { name: "Fruits", icon: "🍎", examples: ["Pomme", "Banane", "Orange"] },
  legumes: { name: "Légumes", icon: "🥕", examples: ["Carotte", "Tomate", "Salade"] },
  pays: { name: "Pays", icon: "🌍", examples: ["France", "Italie", "Espagne"] }
} as const;

export type GameTheme = keyof typeof gameThemes;

// Player schema
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roomId: text("room_id").notNull(),
  score: integer("score").notNull().default(1000),
  isHost: boolean("is_host").notNull().default(false),
  isEliminated: boolean("is_eliminated").notNull().default(false),
  hasSubmittedWord: boolean("has_submitted_word").notNull().default(false),
  socketId: text("socket_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// Room schema
export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  theme: text("theme").notNull(),
  currentLetter: text("current_letter").notNull().default("A"),
  currentPlayerIndex: integer("current_player_index").notNull().default(0),
  gameStarted: boolean("game_started").notNull().default(false),
  gameEnded: boolean("game_ended").notNull().default(false),
  roundInProgress: boolean("round_in_progress").notNull().default(false),
  winnerId: integer("winner_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// Game words history
export const gameWords = pgTable("game_words", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  playerId: integer("player_id").notNull(),
  letter: text("letter").notNull(),
  word: text("word"),
  isGiveUp: boolean("is_give_up").notNull().default(false),
  penaltyAmount: integer("penalty_amount").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  playerId: integer("player_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Insert schemas
export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  createdAt: true
});

export const insertGameWordSchema = createInsertSchema(gameWords).omit({
  id: true,
  createdAt: true
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true
});

// Types
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type GameWord = typeof gameWords.$inferSelect;
export type InsertGameWord = z.infer<typeof insertGameWordSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Game state types
export interface GameState {
  room: Room;
  players: Player[];
  recentWords: GameWord[];
  chatMessages: ChatMessage[];
  myPlayerId: number;
  isMyTurn: boolean;
  nextPenalty: number;
  canSubmitWord: boolean;
  playersWaiting: number;
}

// Socket event types
export interface ServerToClientEvents {
  gameStateUpdate: (gameState: GameState) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: number) => void;
  gameStarted: () => void;
  gameEnded: (winnerId: number) => void;
  wordSubmitted: (word: GameWord) => void;
  chatMessage: (message: ChatMessage & { playerName: string }) => void;
  turnChanged: (currentPlayerId: number) => void;
  letterChanged: (letter: string) => void;
  error: (message: string, suggestedName?: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (data: { playerName: string; theme: GameTheme }) => void;
  joinRoom: (data: { roomCode: string; playerName: string }) => void;
  rejoinRoom: (data: { playerId: number }) => void;
  startGame: () => void;
  submitWord: (word: string) => void;
  giveUp: () => void;
  sendChatMessage: (message: string) => void;
  leaveRoom: () => void;
}
