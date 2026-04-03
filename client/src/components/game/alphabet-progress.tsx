import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAlphabetProgress, getLetterColor } from '@/lib/game-utils';

interface AlphabetProgressProps {
  currentLetter: string;
}

export default function AlphabetProgress({ currentLetter }: AlphabetProgressProps) {
  const progress = getAlphabetProgress(currentLetter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {progress.map(({ letter, status }) => (
            <div
              key={letter}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getLetterColor(status)}`}
            >
              {letter}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
