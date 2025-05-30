import { gameThemes, type GameTheme } from '@shared/schema';

export const getThemeInfo = (theme: GameTheme) => {
  return gameThemes[theme];
};

export const generatePlayerInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const formatScore = (score: number): string => {
  return score.toLocaleString('fr-FR');
};

export const getAlphabetProgress = (currentLetter: string): Array<{letter: string, status: 'completed' | 'current' | 'upcoming'}> => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const currentIndex = alphabet.indexOf(currentLetter);
  
  return alphabet.split('').map((letter, index) => ({
    letter,
    status: index < currentIndex ? 'completed' : 
            index === currentIndex ? 'current' : 'upcoming'
  }));
};

export const validateRoomCode = (code: string): boolean => {
  return /^[A-Z]{4}$/.test(code);
};

export const formatPlayerName = (name: string): string => {
  return name.trim().substring(0, 20);
};

export const isGameEnded = (currentLetter: string, activePlayers: number): boolean => {
  return currentLetter === 'Z' || activePlayers <= 1;
};

export const calculateTimeRemaining = (startTime: Date, maxDuration: number): number => {
  const elapsed = Date.now() - startTime.getTime();
  return Math.max(0, maxDuration - elapsed);
};

export const getLetterColor = (status: 'completed' | 'current' | 'upcoming'): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500 text-white';
    case 'current':
      return 'bg-amber-500 text-white';
    case 'upcoming':
      return 'bg-gray-200 text-gray-600';
  }
};

export const formatGameDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
  }
  return `${remainingMinutes}min`;
};
