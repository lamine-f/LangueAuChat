import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown } from 'lucide-react';
import { generatePlayerInitials, formatScore } from '@/lib/game-utils';
import type { Player } from '@shared/schema';

interface PlayerScoresProps {
  players: Player[];
  currentPlayerIndex: number;
  currentPlayerId: number;
}

export default function PlayerScores({ players, currentPlayerIndex, currentPlayerId }: PlayerScoresProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedPlayers.map((player) => {
            const isCurrent = players[currentPlayerIndex]?.id === player.id;
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
  );
}
