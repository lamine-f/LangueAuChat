import GameHeader from './game-header';
import AlphabetProgress from './alphabet-progress';
import PlayerScores from './player-scores';
import WordSubmissionForm from './word-submission-form';
import RecentWords from './recent-words';
import GameChat from './game-chat';
import type { GameState } from '@shared/schema';

interface ActiveGameProps {
  gameState: GameState;
  onSubmitWord: (word: string) => void;
  onGiveUp: () => void;
  onSendMessage: (message: string) => void;
  currentPlayerId: number;
}

export default function ActiveGame({
  gameState,
  onSubmitWord,
  onGiveUp,
  onSendMessage,
  currentPlayerId,
}: ActiveGameProps) {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const canSubmit = gameState.canSubmitWord && !currentPlayer?.isEliminated;

  return (
    <div className="container mx-auto px-4 py-4 max-w-md space-y-4">
      <GameHeader room={gameState.room} />

      <AlphabetProgress currentLetter={gameState.room.currentLetter} />

      <PlayerScores
        players={gameState.players}
        currentPlayerIndex={gameState.room.currentPlayerIndex}
        currentPlayerId={currentPlayerId}
      />

      {canSubmit && (
        <WordSubmissionForm
          currentLetter={gameState.room.currentLetter}
          theme={gameState.room.theme}
          nextPenalty={gameState.nextPenalty}
          onSubmitWord={onSubmitWord}
          onGiveUp={onGiveUp}
        />
      )}

      <RecentWords
        recentWords={gameState.recentWords}
        players={gameState.players}
      />

      <GameChat
        messages={gameState.chatMessages}
        players={gameState.players}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}
