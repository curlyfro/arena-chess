import { memo } from "react";
import { useLevelStore } from "@/stores/level-store";

interface LevelBadgeProps {
  /** Show XP progress bar underneath */
  readonly showProgress?: boolean;
  /** "sm" (default) for inline use, "lg" for profile headers */
  readonly size?: "sm" | "lg";
}

export const LevelBadge = memo(function LevelBadge({ showProgress, size = "sm" }: LevelBadgeProps) {
  const getLevel = useLevelStore((s) => s.getLevel);
  const { level, progress } = getLevel();

  const textClass = size === "lg" ? "text-base" : "text-xs";
  const barWidth = size === "lg" ? "w-20" : "w-12";
  const barHeight = size === "lg" ? "h-1.5" : "h-1";

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span className={`${textClass} font-bold text-warning`}>
        Lv.{level}☆
      </span>
      {showProgress && (
        <div className={`${barHeight} ${barWidth} overflow-hidden rounded-full bg-border`}>
          <div
            className="h-full rounded-full bg-warning transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
});
