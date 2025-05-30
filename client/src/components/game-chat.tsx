import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, ChevronUp, ChevronDown, Send } from 'lucide-react';
import type { ChatMessage, Player } from '@shared/schema';

interface GameChatProps {
  messages: ChatMessage[];
  players: Player[];
  onSendMessage: (message: string) => void;
}

export default function GameChat({ messages, players, onSendMessage }: GameChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;
    
    onSendMessage(currentMessage.trim());
    setCurrentMessage('');
  };

  const getPlayerName = (playerId: number): string => {
    return players.find(p => p.id === playerId)?.name || 'Joueur inconnu';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Messages */}
          <div className="max-h-32 overflow-y-auto mb-4 space-y-2 text-sm">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-2">Aucun message...</p>
            ) : (
              messages.slice(-10).map((message) => (
                <div key={message.id} className="flex items-start gap-2">
                  <span className="font-medium text-gray-700 min-w-0 flex-shrink-0">
                    {getPlayerName(message.playerId)}:
                  </span>
                  <span className="text-gray-600 break-words">
                    {message.message}
                  </span>
                </div>
              ))
            )}
          </div>
          
          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              placeholder="Tapez votre message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              className="flex-1 text-sm"
              maxLength={200}
            />
            <Button type="submit" size="icon" disabled={!currentMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
