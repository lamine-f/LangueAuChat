import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Play, Users, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePlayerInitials, getThemeInfo } from '@/lib/game-utils';
import { MAX_PLAYERS_PER_ROOM, MIN_PLAYERS_TO_START } from '@/config/constants';
import type { GameState } from '@shared/schema';

interface GameLobbyProps {
  gameState: GameState;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  isHost: boolean;
}

export default function GameLobby({ gameState, onStartGame, onLeaveRoom, isHost }: GameLobbyProps) {
  const { toast } = useToast();
  const themeInfo = getThemeInfo(gameState.room.theme as any);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(gameState.room.code);
      toast({
        title: "Code copié !",
        description: "Le code de la partie a été copié dans le presse-papiers",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  const canStartGame = gameState.players.length >= MIN_PLAYERS_TO_START;

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Room <span className="font-mono text-primary">{gameState.room.code}</span>
        </h2>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {themeInfo.icon} {themeInfo.name}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Joueurs
            </CardTitle>
            <Badge variant="outline">
              {gameState.players.length}/{MAX_PLAYERS_PER_ROOM}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gameState.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">
                      {generatePlayerInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900">{player.name}</div>
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      En ligne
                    </div>
                  </div>
                </div>
                {player.isHost && (
                  <Badge variant="outline" className="text-xs">
                    Hôte
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">Code de la partie</div>
              <div className="text-sm text-gray-600">Partager avec vos amis</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-primary tracking-wider">
                {gameState.room.code}
              </span>
              <Button variant="ghost" size="icon" onClick={handleCopyRoomCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!canStartGame && (
        <div className="text-center text-sm text-gray-600 mb-6">
          En attente d'au moins {MIN_PLAYERS_TO_START - gameState.players.length} joueur(s) supplémentaire(s)...
        </div>
      )}

      <div className="space-y-3">
        {isHost && (
          <Button 
            onClick={onStartGame}
            disabled={!canStartGame}
            className="w-full"
            size="lg"
          >
            <Play className="h-5 w-5 mr-2" />
            Commencer la partie
          </Button>
        )}

        <Button 
          variant="outline" 
          onClick={onLeaveRoom}
          className="w-full"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Quitter la room
        </Button>
      </div>
    </div>
  );
}
