import { useGameContext } from '@/context/GameContext';
import { useGameSocket } from '@/hooks/use-game-socket';
import Home from './home';
import ThemeSelection from '@/components/room/theme-selection';
import RoomSetup from '@/components/room/room-setup';
import GameLobby from '@/components/game/game-lobby';
import ActiveGame from '@/components/game/active-game';
import GameResults from '@/components/game/game-results';

function ConnectionLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Connexion au serveur...</p>
      </div>
    </div>
  );
}

export default function Game() {
  const { state, dispatch } = useGameContext();
  const { createRoom, joinRoom, startGame, submitWord, giveUp, sendChatMessage, leaveRoom } = useGameSocket();

  const { screen, gameState, currentPlayerId, isConnected } = state;
  const currentPlayer = gameState?.players.find(p => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost ?? false;

  if (!isConnected) return <ConnectionLoader />;

  switch (screen) {
    case 'home':
      return (
        <Home
          onCreateRoom={() => dispatch({ type: 'SET_SCREEN', screen: 'theme-selection' })}
          onJoinRoom={() => dispatch({ type: 'SET_SCREEN', screen: 'room-setup' })}
        />
      );

    case 'theme-selection':
      return (
        <ThemeSelection
          onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          onThemeSelect={(theme) => createRoom('Joueur' + Math.floor(Math.random() * 1000), theme)}
        />
      );

    case 'room-setup':
      return (
        <RoomSetup
          onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          onJoinRoom={(playerName, roomCode) => joinRoom(roomCode, playerName)}
        />
      );

    case 'lobby':
      return gameState ? (
        <GameLobby
          gameState={gameState}
          onStartGame={startGame}
          onLeaveRoom={leaveRoom}
          isHost={isHost}
        />
      ) : null;

    case 'game':
      return gameState && currentPlayerId ? (
        <ActiveGame
          gameState={gameState}
          onSubmitWord={submitWord}
          onGiveUp={giveUp}
          onSendMessage={sendChatMessage}
          currentPlayerId={currentPlayerId}
        />
      ) : null;

    case 'results':
      return gameState && currentPlayerId ? (
        <GameResults
          gameState={gameState}
          onPlayAgain={() => dispatch({ type: 'SET_SCREEN', screen: 'theme-selection' })}
          onBackToHome={leaveRoom}
          currentPlayerId={currentPlayerId}
        />
      ) : null;

    default:
      return (
        <Home
          onCreateRoom={() => dispatch({ type: 'SET_SCREEN', screen: 'theme-selection' })}
          onJoinRoom={() => dispatch({ type: 'SET_SCREEN', screen: 'room-setup' })}
        />
      );
  }
}
