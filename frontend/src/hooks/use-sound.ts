import { useCallback } from "react";
import { useGameStore } from "@/stores/game-store";
import { playSound } from "@/lib/sounds";
import type { AnnotatedMove } from "@/types/chess";

export function useSound() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const soundVolume = useGameStore((s) => s.soundVolume);

  const vol = soundVolume / 100;

  const playSoundIfEnabled = useCallback(
    (type: Parameters<typeof playSound>[0]) => {
      if (soundEnabled) {
        playSound(type, vol);
      }
    },
    [soundEnabled, vol],
  );

  const playMoveSound = useCallback(
    (move: AnnotatedMove, isCheck: boolean) => {
      if (!soundEnabled) return;

      if (isCheck) {
        playSound("check", vol);
      } else if (move.flags.includes("k") || move.flags.includes("q")) {
        playSound("castle", vol);
      } else if (move.captured) {
        playSound("capture", vol);
      } else {
        playSound("move", vol);
      }
    },
    [soundEnabled, vol],
  );

  return { playSound: playSoundIfEnabled, playMoveSound };
}
