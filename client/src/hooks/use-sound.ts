import { useRef, useCallback, useEffect } from 'react';

// Sons MP3 disponibles
import errorSound from '@/assets/sounds/error.mp3';
import giveupSound from '@/assets/sounds/giveup.mp3';
import playerJoinSound from '@/assets/sounds/player-join.mp3';
import victorySound from '@/assets/sounds/victory.mp3';

export type SoundName = 'success' | 'error' | 'giveup' | 'newRound' | 'playerJoin' | 'gameStart' | 'victory';

// Synthétiser un son court via Web Audio API
function createSynthSound(
  type: OscillatorType,
  frequencies: Array<{ freq: number; start: number; duration: number }>,
  volume = 0.3
): () => void {
  return () => {
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      frequencies.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gain);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      });

      // Fade out
      const totalDuration = Math.max(...frequencies.map(f => f.start + f.duration));
      gain.gain.setValueAtTime(volume, ctx.currentTime + totalDuration - 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + totalDuration);

      setTimeout(() => ctx.close(), (totalDuration + 0.5) * 1000);
    } catch {
      // Audio non supporté
    }
  };
}

// Sons synthétisés pour les fichiers manquants
const synthSounds: Partial<Record<SoundName, () => void>> = {
  // Success : deux notes montantes (ding ding !)
  success: createSynthSound('sine', [
    { freq: 523, start: 0, duration: 0.15 },     // Do5
    { freq: 659, start: 0.12, duration: 0.15 },   // Mi5
    { freq: 784, start: 0.24, duration: 0.25 },   // Sol5
  ], 0.25),

  // New round : notification montante
  newRound: createSynthSound('sine', [
    { freq: 440, start: 0, duration: 0.1 },       // La4
    { freq: 554, start: 0.1, duration: 0.1 },     // Do#5
    { freq: 659, start: 0.2, duration: 0.15 },    // Mi5
    { freq: 880, start: 0.32, duration: 0.2 },    // La5
  ], 0.2),

  // Game start : fanfare courte
  gameStart: createSynthSound('square', [
    { freq: 392, start: 0, duration: 0.15 },      // Sol4
    { freq: 392, start: 0.18, duration: 0.1 },    // Sol4
    { freq: 392, start: 0.3, duration: 0.1 },     // Sol4
    { freq: 523, start: 0.42, duration: 0.35 },   // Do5
  ], 0.15),
};

// Fichiers MP3 mappés par nom
const fileSounds: Partial<Record<SoundName, string>> = {
  error: errorSound,
  giveup: giveupSound,
  playerJoin: playerJoinSound,
  victory: victorySound,
};

export function useSound() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Précharger les fichiers MP3
  useEffect(() => {
    Object.entries(fileSounds).forEach(([name, src]) => {
      if (!audioCache.current.has(name)) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 0.4;
        audioCache.current.set(name, audio);
      }
    });
  }, []);

  const play = useCallback((name: SoundName) => {
    // D'abord essayer le fichier MP3
    const cached = audioCache.current.get(name);
    if (cached) {
      cached.currentTime = 0;
      cached.play().catch(() => {});
      return;
    }

    // Sinon utiliser le son synthétisé
    const synth = synthSounds[name];
    if (synth) {
      synth();
    }
  }, []);

  return { play };
}
