import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, LogIn, Cat } from 'lucide-react';

interface HomeProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export default function Home({ onCreateRoom, onJoinRoom }: HomeProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Cat className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Langue au Chat</h1>
        <p className="text-gray-600">Jeu d'alphabet en ligne</p>
      </div>

      <div className="space-y-4 mb-8">
        <Button 
          onClick={onCreateRoom}
          className="w-full"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Créer une partie
        </Button>
        
        <Button 
          variant="outline"
          onClick={onJoinRoom}
          className="w-full"
          size="lg"
        >
          <LogIn className="h-5 w-5 mr-2" />
          Rejoindre une partie
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Comment jouer ?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">1.</span>
              <span>Choisissez une catégorie de mots</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">2.</span>
              <span>Trouvez un mot par lettre de A à Z</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">3.</span>
              <span>Évitez de donner votre langue au chat !</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
