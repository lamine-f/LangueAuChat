import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RECENT_WORDS_DISPLAY_LIMIT } from '@/config/constants';
import type { GameWord, Player } from '@shared/schema';

interface RecentWordsProps {
  recentWords: GameWord[];
  players: Player[];
}

export default function RecentWords({ recentWords, players }: RecentWordsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mots récents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentWords.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun mot encore...</p>
          ) : (
            recentWords.slice(-RECENT_WORDS_DISPLAY_LIMIT).reverse().map((word) => {
              const player = players.find(p => p.id === word.playerId);
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
  );
}
