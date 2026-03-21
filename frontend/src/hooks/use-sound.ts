import { useCallback } from "react";
import { useGameStore } from "@/stores/game-store";
import { playSound } from "@/lib/sounds";
import type { AnnotatedMove } from "@/types/chess";

export function useSound() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);

  const playSoundIfEnabled = useCallback(
    (type: Parameters<typeof playSound>[0]) => {
      if (soundEnabled) {
        playSound(type);
      }
    },
    [soundEnabled],
  );

  const playMoveSound = useCallback(
    (move: AnnotatedMove, isCheck: boolean) => {
      if (!soundEnabled) return;

      if (isCheck) {
        playSound("check");
      } else if (move.flags.includes("k") || move.flags.includes("q")) {
        // Kingside or queenside castle
        playSound("castle");
      } else if (move.captured) {
        playSound("capture");
      } else {
        playSound("move");
      }
    },
    [soundEnabled],
  );

  return { playSound: playSoundIfEnabled, playMoveSound };
}
