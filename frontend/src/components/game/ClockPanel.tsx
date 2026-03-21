import { memo } from "react";
import type { PieceColor } from "@/types/chess";
import { cn } from "@/lib/cn";

interface ClockPanelProps {
  readonly color: PieceColor;
  readonly timeMs: number;
  readonly isActive: boolean;
  readonly isLowTime: boolean;
  readonly isCriticalTime: boolean;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";

  const totalSeconds = Math.ceil(ms / 1000);

  if (totalSeconds < 60) {
    // Show tenths below 1 minute
    const secs = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${secs}.${tenths}`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export const ClockPanel = memo(function ClockPanel({
  color,
  timeMs,
  isActive,
  isLowTime,
  isCriticalTime,
}: ClockPanelProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-4 py-2 font-mono text-2xl font-bold transition-colors",
        isActive ? "ring-2 ring-accent" : "",
        isCriticalTime
          ? "animate-pulse bg-red-900/80 text-red-300"
          : isLowTime
            ? "bg-red-900/40 text-red-400"
            : "bg-muted text-foreground",
      )}
    >
      <span className="text-sm font-normal text-muted-foreground uppercase">
        {color === "w" ? "White" : "Black"}
      </span>
      <span>{formatTime(timeMs)}</span>
    </div>
  );
});
