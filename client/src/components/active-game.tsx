import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Flag, Crown, AlertTriangle } from 'lucide-react';
import { generatePlayerInitials, getThemeInfo, getAlphabetProgress, getLetterColor, formatScore } from '@/lib/game-utils';
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
  currentPlayerId 
}: ActiveGameProps) {
  const [currentWord, setCurrentWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeInfo = getThemeInfo(gameState.room.theme as any);
  const alphabetProgress = getAlphabetProgress(gameState.room.currentLetter);
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const isMyTurn = gameState.isMyTurn;

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitWord(currentWord.trim());
      setCurrentWord('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGiveUp = async () => {
    if (isSubmitting) return;
    
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir donner votre langue au chat ? Cela vous coûtera ${gameState.nextPenalty} points.`
    );
    
    if (confirmed) {
      setIsSubmitting(true);
      try {
        await onGiveUp();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const validateCurrentWord = (word: string): boolean => {
    if (!word.trim()) return false;
    return word.trim().toLowerCase().startsWith(gameState.room.currentLetter.toLowerCase());
  };

  const isValidWord = validateCurrentWord(currentWord);

  return (
    <div className="container mx-auto px-4 py-4 max-w-md space-y-4">
      {/* Game Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">Room {gameState.room.code}</div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {themeInfo.icon} {themeInfo.name}
            </Badge>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-1">
              {gameState.room.currentLetter}
            </div>
            <div className="text-sm text-gray-600">Lettre actuelle</div>
          </div>
        </CardContent>
      </Card>

      {/* Alphabet Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-13 gap-2">
            {alphabetProgress.map(({ letter, status }) => (
              <div
                key={letter}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getLetterColor(status)}`}
              >
                {letter}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Players Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gameState.players
              .sort((a, b) => b.score - a.score)
              .map((player) => {
                const isCurrent = gameState.players[gameState.room.currentPlayerIndex]?.id === player.id;
                const isMe = player.id === currentPlayerId;
                
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isCurrent 
                        ? 'bg-emerald-50 border-2 border-emerald-200' 
                        : 'bg-gray-50'
                    } ${player.isEliminated ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={isCurrent ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}>
                          {generatePlayerInitials(player.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {player.name} {isMe && '(Vous)'}
                        </div>
                        <div className={`text-xs ${
                          isCurrent 
                            ? 'text-emerald-600 font-medium' 
                            : player.isEliminated 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                        }`}>
                          {player.isEliminated 
                            ? 'Éliminé' 
                            : isCurrent 
                              ? 'À son tour !' 
                              : 'En attente'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatScore(player.score)}
                      </div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Current Turn Interface */}
      {isMyTurn && !currentPlayer?.isEliminated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">C'est votre tour !</CardTitle>
            <p className="text-center text-gray-600">
              Trouvez un(e) <strong>{themeInfo.name.toLowerCase()}</strong> commençant par <strong>{gameState.room.currentLetter}</strong>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitWord} className="space-y-4">
              <Input
                type="text"
                placeholder="Votre réponse..."
                value={currentWord}
                onChange={(e) => setCurrentWord(e.target.value)}
                className="text-lg"
                disabled={isSubmitting}
              />
              
              <div className="flex gap-3">
                <Button 
                  type="submit"
                  disabled={!isValidWord || isSubmitting}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Envoi...' : 'Valider'}
                </Button>
                
                <Button 
                  type="button"
                  variant="destructive"
                  onClick={handleGiveUp}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Langue au chat
                </Button>
              </div>
            </form>

            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention :</strong> Donner sa langue au chat vous coûtera <strong>{gameState.nextPenalty} points</strong> !
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Recent Words */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mots récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gameState.recentWords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun mot encore...</p>
            ) : (
              gameState.recentWords.slice(-5).reverse().map((word) => {
                const player = gameState.players.find(p => p.id === word.playerId);
                return (
                  <div key={word.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        word.isGiveUp ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                      }`}>
                        {word.letter}
                      </div>
                      <span className={`font-medium ${word.isGiveUp ? 'text-red-600' : 'text-gray-900'}`}>
                        {word.isGiveUp ? 'Langue au chat' : word.word}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {player?.name}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat */}
      <GameChat
        messages={gameState.chatMessages}
        players={gameState.players}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}
