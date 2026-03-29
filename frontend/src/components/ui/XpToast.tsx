import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useLevelStore } from "@/stores/level-store";

export function XpToast() {
  const pendingXpGain = useLevelStore((s) => s.pendingXpGain);
  const pendingLevelUp = useLevelStore((s) => s.pendingLevelUp);
  const clearPendingXp = useLevelStore((s) => s.clearPendingXp);
  const getLevel = useLevelStore((s) => s.getLevel);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (pendingXpGain <= 0) return;

    setVisible(true);

    if (pendingLevelUp) {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.8 } });
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      clearPendingXp();
    }, 2500);

    return () => clearTimeout(timerRef.current);
  }, [pendingXpGain, pendingLevelUp, clearPendingXp]);

  if (!visible) return null;

  const { level } = getLevel();

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="rounded-full bg-muted px-4 py-2 shadow-lg ring-1 ring-warning/30">
        <span className="text-sm font-bold text-warning">+{pendingXpGain} XP</span>
        {pendingLevelUp && (
          <span className="ml-2 text-sm font-bold text-warning">Level {level}!</span>
        )}
      </div>
    </div>
  );
}
