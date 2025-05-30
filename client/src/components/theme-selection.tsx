import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, PawPrint, Apple, Carrot, Globe } from 'lucide-react';
import { gameThemes, type GameTheme } from '@shared/schema';

interface ThemeSelectionProps {
  onBack: () => void;
  onThemeSelect: (theme: GameTheme) => void;
}

const themeIcons = {
  animaux: PawPrint,
  fruits: Apple,
  legumes: Carrot,
  pays: Globe
};

const themeColors = {
  animaux: 'text-amber-600 bg-amber-100',
  fruits: 'text-red-600 bg-red-100',
  legumes: 'text-green-600 bg-green-100',
  pays: 'text-blue-600 bg-blue-100'
};

export default function ThemeSelection({ onBack, onThemeSelect }: ThemeSelectionProps) {
  const [selectedTheme, setSelectedTheme] = useState<GameTheme | null>(null);

  const handleThemeClick = (theme: GameTheme) => {
    setSelectedTheme(theme);
  };

  const handleConfirm = () => {
    if (selectedTheme) {
      onThemeSelect(selectedTheme);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">Choisir un thème</h2>
      </div>

      <div className="space-y-3 mb-6">
        {Object.entries(gameThemes).map(([key, theme]) => {
          const themeKey = key as GameTheme;
          const Icon = themeIcons[themeKey];
          const isSelected = selectedTheme === themeKey;
          
          return (
            <Card 
              key={themeKey}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary border-2 bg-primary/5' 
                  : 'border-gray-200 hover:border-primary/50'
              }`}
              onClick={() => handleThemeClick(themeKey)}
            >
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${themeColors[themeKey]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                    <p className="text-sm text-gray-600">
                      {theme.examples.slice(0, 3).join(', ')}...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button 
        onClick={handleConfirm}
        disabled={!selectedTheme}
        className="w-full"
        size="lg"
      >
        Continuer
      </Button>
    </div>
  );
}
