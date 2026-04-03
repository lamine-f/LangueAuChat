import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenCount = useRef(messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compteur de messages non lus quand le chat est fermé
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
      lastSeenCount.current = messages.length;
    } else if (messages.length > lastSeenCount.current) {
      setUnreadCount(messages.length - lastSeenCount.current);
    }
  }, [messages.length, isExpanded]);

  // Auto-scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isExpanded]);

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
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat
            {!isExpanded && unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="max-h-40 overflow-y-auto mb-3 space-y-1.5 text-sm">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-2">Aucun message...</p>
            ) : (
              messages.slice(-20).map((msg) => (
                <div key={msg.id} className="flex gap-1.5 py-0.5">
                  <span className="font-semibold text-primary shrink-0">
                    {getPlayerName(msg.playerId)}
                  </span>
                  <span className="text-gray-600 break-words min-w-0">
                    {msg.message}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              placeholder="Message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              className="flex-1 text-sm h-9"
              maxLength={200}
            />
            <Button type="submit" size="sm" disabled={!currentMessage.trim()} className="h-9 px-3">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
