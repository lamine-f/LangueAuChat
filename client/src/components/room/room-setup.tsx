import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { validateRoomCode, formatPlayerName } from '@/lib/game-utils';

interface RoomSetupProps {
  onBack: () => void;
  onJoinRoom: (playerName: string, roomCode: string) => void;
}

export default function RoomSetup({ onBack, onJoinRoom }: RoomSetupProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = formatPlayerName(playerName);
    const trimmedCode = roomCode.trim().toUpperCase();

    if (!trimmedName) {
      return;
    }

    if (!validateRoomCode(trimmedCode)) {
      return;
    }

    setIsLoading(true);
    try {
      await onJoinRoom(trimmedName, trimmedCode);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);
    setRoomCode(value);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">Rejoindre une partie</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="playerName" className="text-sm font-medium text-gray-700">
            Votre nom
          </Label>
          <Input
            id="playerName"
            type="text"
            placeholder="Entrez votre nom"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            className="mt-2"
            required
          />
        </div>

        <div>
          <Label htmlFor="roomCode" className="text-sm font-medium text-gray-700">
            Code de la partie
          </Label>
          <Input
            id="roomCode"
            type="text"
            placeholder="ABCD"
            value={roomCode}
            onChange={handleRoomCodeChange}
            className="mt-2 text-center text-2xl font-mono tracking-widest"
            maxLength={4}
            required
          />
        </div>

        <Button 
          type="submit"
          disabled={!playerName.trim() || !validateRoomCode(roomCode) || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Connexion...' : 'Rejoindre la partie'}
        </Button>
      </form>
    </div>
  );
}
