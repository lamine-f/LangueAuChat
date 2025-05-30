import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useToast } from '@/hooks/use-toast';
import { formatPlayerName } from '@/lib/game-utils';
import Home from './home';
import ThemeSelection from '@/components/theme-selection';
import RoomSetup from '@/components/room-setup';
import GameLobby from '@/components/game-lobby';
import ActiveGame from '@/components/active-game';
import GameResults from '@/components/game-results';
import type { GameTheme } from '@shared/schema';

type GameScreen = 'home' | 'theme-selection' | 'room-setup' | 'lobby' | 'game' | 'results';

export default function Game() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('home');
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
  const { isConnected, gameState, error, connect, disconnect, emit, on, off, clearError } = useSocket();
  const { toast } = useToast();

  useEffect(() => {
    connect();

    // Socket event handlers
    on('gameStateUpdate', (state) => {
      if (state.room.gameStarted && !state.room.gameEnded) {
        setCurrentScreen('game');
      } else if (state.room.gameEnded) {
        setCurrentScreen('results');
      } else {
        setCurrentScreen('lobby');
      }
    });

    on('gameStarted', () => {
      toast({
        title: "Partie commencée !",
        description: "La partie vient de commencer",
      });
    });

    on('gameEnded', (winnerId) => {
      const winner = gameState?.players.find(p => p.id === winnerId);
      toast({
        title: "Partie terminée !",
        description: winner ? `${winner.name} a gagné !` : "La partie est terminée",
      });
      setCurrentScreen('results');
    });

    on('playerJoined', (player) => {
      toast({
        title: "Nouveau joueur",
        description: `${player.name} a rejoint la partie`,
      });
    });

    on('playerLeft', (playerId) => {
      const player = gameState?.players.find(p => p.id === playerId);
      if (player) {
        toast({
          title: "Joueur parti",
          description: `${player.name} a quitté la partie`,
        });
      }
    });

    on('turnChanged', (playerId) => {
      const player = gameState?.players.find(p => p.id === playerId);
      if (player) {
        if (playerId === currentPlayerId) {
          toast({
            title: "Votre tour !",
            description: `Trouvez un mot commençant par ${gameState?.room.currentLetter}`,
          });
        } else {
          toast({
            title: "Tour suivant",
            description: `C'est au tour de ${player.name}`,
          });
        }
      }
    });

    on('wordSubmitted', (word) => {
      const player = gameState?.players.find(p => p.id === word.playerId);
      console.log("Word submitted:", word, "by player:", player);
      if (player && word.word) {
        toast({
          title: "Mot validé",
          description: `${player.name} a proposé "${word.word}"`,
        });
      }
    });

    on('error', (message) => {
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    });

    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error,
        variant: "destructive",
      });
      clearError();
    }
  }, [error]);

  const handleCreateRoom = () => {
    setCurrentScreen('theme-selection');
  };

  const handleJoinRoom = () => {
    setCurrentScreen('room-setup');
  };

  const handleThemeSelect = (theme: GameTheme) => {
    const playerName = formatPlayerName('Joueur' + Math.floor(Math.random() * 1000));
    emit('createRoom', { playerName, theme });
  };

  const handleJoinRoomSubmit = (playerName: string, roomCode: string) => {
    emit('joinRoom', { roomCode, playerName });
  };

  const handleStartGame = () => {
    emit('startGame', undefined);
  };

  const handleSubmitWord = (word: string) => {
    emit('submitWord', word);
  };

  const handleGiveUp = () => {
    emit('giveUp', undefined);
  };

  const handleSendMessage = (message: string) => {
    emit('sendChatMessage', message);
  };

  const handleLeaveRoom = () => {
    emit('leaveRoom', undefined);
    setCurrentScreen('home');
    setCurrentPlayerId(null);
  };

  const handleBackToHome = () => {
    handleLeaveRoom();
  };

  const handlePlayAgain = () => {
    setCurrentScreen('theme-selection');
  };

  const goBack = () => {
    setCurrentScreen('home');
  };

  // Determine current player ID from game state
  if (gameState && !currentPlayerId) {
    // Try to identify current player (in a real app, this would be managed differently)
    const myPlayer = gameState.players.find(p => p.name.includes('Joueur'));
    if (myPlayer) {
      setCurrentPlayerId(myPlayer.id);
    }
  }

  const currentPlayer = gameState?.players.find(p => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost || false;

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Connexion au serveur...</p>
        </div>
      </div>
    );
  }

  switch (currentScreen) {
    case 'home':
      return <Home onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
    
    case 'theme-selection':
      return <ThemeSelection onBack={goBack} onThemeSelect={handleThemeSelect} />;
    
    case 'room-setup':
      return <RoomSetup onBack={goBack} onJoinRoom={handleJoinRoomSubmit} />;
    
    case 'lobby':
      return gameState ? (
        <GameLobby 
          gameState={gameState}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          isHost={isHost}
        />
      ) : null;
    
    case 'game':
      return gameState && currentPlayerId ? (
        <ActiveGame
          gameState={gameState}
          onSubmitWord={handleSubmitWord}
          onGiveUp={handleGiveUp}
          onSendMessage={handleSendMessage}
          currentPlayerId={currentPlayerId}
        />
      ) : null;
    
    case 'results':
      return gameState && currentPlayerId ? (
        <GameResults
          gameState={gameState}
          onPlayAgain={handlePlayAgain}
          onBackToHome={handleBackToHome}
          currentPlayerId={currentPlayerId}
        />
      ) : null;
    
    default:
      return <Home onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }
}
