import type { GameState, ChatMessage } from '@shared/schema';

export type GameScreen = 'home' | 'theme-selection' | 'room-setup' | 'lobby' | 'game' | 'results';

export interface GameContextState {
  screen: GameScreen;
  currentPlayerId: number | null;
  gameState: GameState | null;
  isConnected: boolean;
  error: string | null;
}

export type GameAction =
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_PLAYER_ID'; playerId: number }
  | { type: 'SET_GAME_STATE'; gameState: GameState }
  | { type: 'SET_CONNECTED'; isConnected: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage & { playerName: string } }
  | { type: 'RESET' };

export const initialGameState: GameContextState = {
  screen: 'home',
  currentPlayerId: null,
  gameState: null,
  isConnected: false,
  error: null,
};
