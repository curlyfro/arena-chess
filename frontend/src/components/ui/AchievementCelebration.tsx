import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import confetti from "canvas-confetti";
import { useAchievementStore } from "@/stores/achievement-store";
import { getAchievementDef } from "@/constants/achievements";
import { XP_REWARDS } from "@/constants/xp-config";
import { playSound } from "@/lib/sounds";
import { useGameStore } from "@/stores/game-store";

const HIGH_TIER_PREFIXES = ["elo-", "streak-10", "beat-l8", "puzzle-100", "tutorial-all"];

export function AchievementCelebration() {
  const pendingId = useAchievementStore((s) => s.pendingCelebration);
  const dismiss = useAchievementStore((s) => s.dismissCelebration);
  const achievement = pendingId ? getAchievementDef(pendingId) : null;
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const soundVolume = useGameStore((s) => s.soundVolume);
  const confettiFiredRef = useRef(false);

  const isHighTier = pendingId
    ? HIGH_TIER_PREFIXES.some((p) => pendingId.startsWith(p))
    : false;

  useEffect(() => {
    if (achievement) {
      if (soundEnabled) playSound("achievement", soundVolume / 100);
      if (isHighTier && !confettiFiredRef.current) {
        confettiFiredRef.current = true;
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
      }
    } else {
      confettiFiredRef.current = false;
    }
  }, [achievement, isHighTier, soundEnabled, soundVolume]);

  if (!achievement) return null;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl ring-1 ring-border text-center animate-in zoom-in-95 fade-in duration-200">
          <div className="text-5xl mb-3">{achievement.icon}</div>
          <Dialog.Title className="text-xl font-bold text-foreground mb-1">
            {achievement.name}
          </Dialog.Title>
          <p className="text-sm text-muted-foreground mb-1">
            {achievement.description}
          </p>
          <p className="text-xs font-medium text-accent mb-4">
            +{XP_REWARDS.achievementUnlock} XP
          </p>
          <button
            onClick={dismiss}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent/80"
          >
            Awesome!
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
