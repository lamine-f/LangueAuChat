import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { getThemeInfo } from '@/lib/game-utils';
import type { Room } from '@shared/schema';

interface GameHeaderProps {
  room: Room;
  playerName?: string;
}

export default function GameHeader({ room, playerName }: GameHeaderProps) {
  const themeInfo = getThemeInfo(room.theme as any);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">Room {room.code}</div>
          {playerName && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <User className="h-4 w-4" />
              {playerName}
            </div>
          )}
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {themeInfo.icon} {themeInfo.name}
          </Badge>
        </div>

        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-1">
            {room.currentLetter}
          </div>
          <div className="text-sm text-gray-600">Lettre actuelle</div>
        </div>
      </CardContent>
    </Card>
  );
}
