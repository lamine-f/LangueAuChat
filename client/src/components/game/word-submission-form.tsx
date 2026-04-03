import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSound } from '@/hooks/use-sound';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Check, Flag, AlertTriangle } from 'lucide-react';
import { getThemeInfo, validateWordForLetter } from '@/lib/game-utils';

interface WordSubmissionFormProps {
  currentLetter: string;
  theme: string;
  nextPenalty: number;
  onSubmitWord: (word: string) => void;
  onGiveUp: () => void;
}

export default function WordSubmissionForm({
  currentLetter,
  theme,
  nextPenalty,
  onSubmitWord,
  onGiveUp,
}: WordSubmissionFormProps) {
  const [currentWord, setCurrentWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { play } = useSound();

  const themeInfo = getThemeInfo(theme as any);
  const isValidWord = validateWordForLetter(currentWord, currentLetter);

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      onSubmitWord(currentWord.trim());
      play('success');
      setCurrentWord('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGiveUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      play('giveup');
      onGiveUp();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-center">C'est votre tour !</CardTitle>
        <p className="text-center text-gray-600">
          Trouvez un(e) <strong>{themeInfo.name.toLowerCase()}</strong> commençant par <strong>{currentLetter}</strong>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitWord} className="space-y-4">
          <Input
            type="text"
            placeholder="Votre réponse..."
            value={currentWord}
            onChange={(e) => setCurrentWord(e.target.value)}
            className="text-lg"
            disabled={isSubmitting}
          />

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!isValidWord || isSubmitting}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Envoi...' : 'Valider'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Langue au chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Donner sa langue au chat ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cela vous coûtera <strong>{nextPenalty} points</strong>. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleGiveUp}>
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>

        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention :</strong> Donner sa langue au chat vous coûtera <strong>{nextPenalty} points</strong> !
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
