import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { GameContextState, GameAction } from './game-types';
import { initialGameState } from './game-types';
import { gameReducer } from './game-reducer';

interface GameContextValue {
  state: GameContextState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGameContext doit être utilisé dans un GameProvider');
  }
  return ctx;
}
