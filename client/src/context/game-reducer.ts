import type { GameContextState, GameAction, GameScreen } from './game-types';
import { initialGameState } from './game-types';

function deriveScreen(state: GameContextState, gameStarted: boolean, gameEnded: boolean): GameScreen {
  if (gameEnded) return 'results';
  if (gameStarted) return 'game';
  // Si on est dans un flow de création/join, on passe au lobby
  const preGameScreens: GameScreen[] = ['home', 'theme-selection', 'room-setup'];
  if (preGameScreens.includes(state.screen)) return 'lobby';
  return state.screen;
}

export function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_GAME_STATE': {
      const gs = action.gameState;
      const screen = deriveScreen(state, gs.room.gameStarted, gs.room.gameEnded);
      const currentPlayerId = gs.myPlayerId ?? state.currentPlayerId;

      return {
        ...state,
        gameState: gs,
        screen,
        currentPlayerId,
      };
    }

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_PLAYER_ID':
      return { ...state, currentPlayerId: action.playerId };

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.isConnected };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'ADD_CHAT_MESSAGE': {
      if (!state.gameState) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          chatMessages: [...state.gameState.chatMessages, action.message],
        },
      };
    }

    case 'RESET':
      return { ...initialGameState, isConnected: state.isConnected };

    default:
      return state;
  }
}
