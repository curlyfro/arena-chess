import { useEffect, useRef } from "react";
import { useAchievementStore } from "@/stores/achievement-store";
import { getAchievementDef } from "@/constants/achievements";

export function AchievementToast() {
  const pendingToast = useAchievementStore((s) => s.pendingToast);
  const dismissToast = useAchievementStore((s) => s.dismissToast);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!pendingToast) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismissToast, 4000);
    return () => clearTimeout(timerRef.current);
  }, [pendingToast, dismissToast]);

  if (!pendingToast) return null;

  const achievement = getAchievementDef(pendingToast);
  if (!achievement) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 shadow-lg ring-1 ring-border">
        <span className="text-2xl">{achievement.icon}</span>
        <div>
          <div className="text-xs font-medium text-accent uppercase">Achievement Unlocked</div>
          <div className="text-sm font-bold text-foreground">{achievement.name}</div>
          <div className="text-xs text-muted-foreground">{achievement.description}</div>
        </div>
      </div>
    </div>
  );
}
