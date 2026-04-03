import { useEffect, useCallback } from 'react';
import { useSocket } from './use-socket';
import { useSound } from './use-sound';
import { useGameContext } from '@/context/GameContext';
import { useToast } from './use-toast';
import type { GameTheme } from '@shared/schema';

export function useGameSocket() {
  const { state, dispatch } = useGameContext();
  const { isConnected, connect, disconnect, emit, on } = useSocket();
  const { toast } = useToast();
  const { play } = useSound();

  // Synchroniser l'état de connexion avec le contexte
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', isConnected });
  }, [isConnected, dispatch]);

  // Connexion automatique au montage
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Enregistrement des event handlers
  useEffect(() => {
    const unsubs = [
      on('gameStateUpdate', (gameState) => {
        dispatch({ type: 'SET_GAME_STATE', gameState });
      }),

      on('gameStarted', () => {
        play('gameStart');
        toast({
          title: 'Partie commencée !',
          description: 'La partie vient de commencer',
        });
      }),

      on('gameEnded', (winnerId) => {
        play('victory');
        const winner = state.gameState?.players.find(p => p.id === winnerId);
        toast({
          title: 'Partie terminée !',
          description: winner ? `${winner.name} a gagné !` : 'La partie est terminée',
        });
      }),

      on('playerJoined', (player) => {
        play('playerJoin');
        toast({
          title: 'Nouveau joueur',
          description: `${player.name} a rejoint la partie`,
        });
      }),

      on('playerLeft', () => {
        toast({
          title: 'Joueur parti',
          description: 'Un joueur a quitté la partie',
        });
      }),

      on('letterChanged', (letter) => {
        play('newRound');
        toast({
          title: 'Nouvelle lettre !',
          description: `La lettre est maintenant : ${letter}`,
        });
      }),

      on('error', (message, suggestedName) => {
        play('error');
        dispatch({ type: 'SET_ERROR', error: message });
        toast({
          title: 'Erreur',
          description: message,
          variant: 'destructive',
        });
        if (suggestedName) {
          toast({
            title: 'Suggestion',
            description: `Essayez : ${suggestedName}`,
          });
        }
      }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [on, dispatch, toast, play, state.gameState?.players]);

  // Action creators
  const createRoom = useCallback((playerName: string, theme: GameTheme) => {
    emit('createRoom', { playerName, theme });
  }, [emit]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    emit('joinRoom', { roomCode, playerName });
  }, [emit]);

  const startGame = useCallback(() => {
    emit('startGame', undefined as any);
  }, [emit]);

  const submitWord = useCallback((word: string) => {
    emit('submitWord', word);
  }, [emit]);

  const giveUp = useCallback(() => {
    emit('giveUp', undefined as any);
  }, [emit]);

  const sendChatMessage = useCallback((message: string) => {
    emit('sendChatMessage', message);
  }, [emit]);

  const leaveRoom = useCallback(() => {
    emit('leaveRoom', undefined as any);
    dispatch({ type: 'RESET' });
  }, [emit, dispatch]);

  return {
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    giveUp,
    sendChatMessage,
    leaveRoom,
  };
}
