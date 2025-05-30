import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, RotateCcw, Home, Clock, Target } from 'lucide-react';
import { generatePlayerInitials, formatScore, formatGameDuration } from '@/lib/game-utils';
import type { GameState } from '@shared/schema';

interface GameResultsProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onBackToHome: () => void;
  currentPlayerId: number;
}

export default function GameResults({ 
  gameState, 
  onPlayAgain, 
  onBackToHome, 
  currentPlayerId 
}: GameResultsProps) {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const currentPlayerRank = sortedPlayers.findIndex(p => p.id === currentPlayerId) + 1;
  
  // Calculate game stats
  const totalWords = gameState.recentWords.filter(w => !w.isGiveUp).length;
  const gameStartTime = gameState.room.createdAt;
  const gameDuration = gameStartTime 
    ? Math.floor((Date.now() - new Date(gameStartTime).getTime()) / 1000 / 60)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Partie terminée !</h2>
        {winner && (
          <p className="text-gray-600">
            {winner.id === currentPlayerId ? (
              <span className="text-yellow-600 font-semibold">🎉 Félicitations ! Vous avez gagné ! 🎉</span>
            ) : (
              <span><strong>{winner.name}</strong> remporte la victoire !</span>
            )}
          </p>
        )}
      </div>

      {/* Final Rankings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center">Classement final</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const isWinner = index === 0;
              const isCurrentPlayer = player.id === currentPlayerId;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center p-3 rounded-lg ${
                    isWinner 
                      ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' 
                      : isCurrentPlayer
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 text-white font-bold ${
                    isWinner 
                      ? 'bg-yellow-500' 
                      : 'bg-gray-400'
                  }`}>
                    {isWinner ? <Trophy className="h-5 w-5" /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {player.name} {isCurrentPlayer && '(Vous)'}
                    </div>
                    <div className={`text-sm ${
                      isWinner 
                        ? 'text-yellow-700 font-medium' 
                        : player.isEliminated 
                          ? 'text-red-600' 
                          : 'text-gray-600'
                    }`}>
                      {player.isEliminated 
                        ? 'Éliminé' 
                        : isWinner 
                          ? 'Gagnant' 
                          : `${index + 1}${index === 1 ? 'ème' : 'ème'} place`
                      }
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {formatScore(player.score)}
                    </div>
                    <div className="text-sm text-gray-500">points</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Game Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Statistiques de la partie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-primary mr-2" />
                <span className="text-2xl font-bold text-primary">{totalWords}</span>
              </div>
              <div className="text-sm text-gray-500">Mots trouvés</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <span className="text-2xl font-bold text-primary">
                  {formatGameDuration(gameDuration)}
                </span>
              </div>
              <div className="text-sm text-gray-500">Durée</div>
            </div>
          </div>
          
          {currentPlayer && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-sm text-blue-800 font-medium">Votre performance</div>
              <div className="text-xs text-blue-700">
                Rang : <strong>{currentPlayerRank}/{gameState.players.length}</strong> • 
                Score final : <strong>{formatScore(currentPlayer.score)} points</strong>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={onPlayAgain}
          className="w-full"
          size="lg"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Rejouer
        </Button>
        
        <Button 
          variant="outline"
          onClick={onBackToHome}
          className="w-full"
          size="lg"
        >
          <Home className="h-5 w-5 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
}
