import { memo, useEffect, useRef, useState } from "react";
import type { PieceColor } from "@/types/chess";
import { cn } from "@/lib/cn";

interface ClockPanelProps {
  readonly color: PieceColor;
  readonly timeMsRef: React.RefObject<number>;
  readonly timeMs: number;
  readonly isActive: boolean;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";

  const totalSeconds = Math.ceil(ms / 1000);

  if (totalSeconds < 60) {
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
  timeMsRef,
  timeMs,
  isActive,
}: ClockPanelProps) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [timeClass, setTimeClass] = useState<"normal" | "low" | "critical">("normal");

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(rafRef.current);
      if (displayRef.current) {
        displayRef.current.textContent = formatTime(timeMs);
      }
      // Sync styling from React state when not ticking
      const ms = timeMs;
      setTimeClass(ms > 0 && ms < 5_000 ? "critical" : ms > 0 && ms < 10_000 ? "low" : "normal");
      return;
    }

    let lastText = "";
    let lastClass: "normal" | "low" | "critical" = "normal";
    const update = () => {
      const ms = timeMsRef.current;
      const el = displayRef.current;
      if (el) {
        const text = formatTime(ms);
        if (text !== lastText) {
          lastText = text;
          el.textContent = text;
        }
      }
      // Update styling when time thresholds are crossed
      const cls = ms > 0 && ms < 5_000 ? "critical" : ms > 0 && ms < 10_000 ? "low" : "normal";
      if (cls !== lastClass) {
        lastClass = cls;
        setTimeClass(cls);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);

    return () => cancelAnimationFrame(rafRef.current);
    // Only restart RAF when isActive changes — timeMs is read from ref during ticking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeMsRef]);

  return (
    <div
      ref={containerRef}
      role="timer"
      aria-label={`${color === "w" ? "White" : "Black"} clock`}
      aria-live={timeClass === "critical" ? "assertive" : "off"}
      className={cn(
        "flex items-center justify-end rounded-lg px-4 py-2 font-mono text-2xl font-bold transition-colors",
        isActive ? "ring-2 ring-accent" : "",
        timeClass === "critical"
          ? "animate-pulse bg-red-900/80 text-red-300"
          : timeClass === "low"
            ? "bg-red-900/40 text-red-400"
            : "bg-muted text-foreground",
      )}
    >
      <span ref={displayRef}>{formatTime(timeMs)}</span>
    </div>
  );
});
