import { memo, useEffect, useRef, useState } from "react";
import type { PieceColor } from "@/types/chess";

interface CircularClockProps {
  readonly color: PieceColor;
  readonly timeMsRef: React.RefObject<number>;
  readonly timeMs: number;
  readonly initialMs: number;
  readonly isActive: boolean;
  readonly size?: number;
}

const SIZE = 72;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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

function getStrokeColor(fraction: number): string {
  if (fraction > 0.5) return "#5b9e6f";   // green
  if (fraction > 0.1) return "#e89858";    // warning orange
  return "#d94040";                         // red/critical
}

export const CircularClock = memo(function CircularClock({
  color,
  timeMsRef,
  timeMs,
  initialMs,
  isActive,
  size: renderSize,
}: CircularClockProps) {
  const textRef = useRef<SVGTextElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const rafRef = useRef(0);
  const [timeClass, setTimeClass] = useState<"normal" | "low" | "critical">("normal");

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(rafRef.current);
      // Sync display from React state
      if (textRef.current) textRef.current.textContent = formatTime(timeMs);
      if (circleRef.current) {
        const frac = initialMs > 0 ? Math.max(0, timeMs / initialMs) : 0;
        circleRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - frac));
        circleRef.current.style.stroke = getStrokeColor(frac);
      }
      const ms = timeMs;
      setTimeClass(ms > 0 && ms < 5_000 ? "critical" : ms > 0 && ms < 10_000 ? "low" : "normal");
      return;
    }

    let lastText = "";
    let lastClass: "normal" | "low" | "critical" = "normal";

    const update = () => {
      const ms = timeMsRef.current;

      if (textRef.current) {
        const text = formatTime(ms);
        if (text !== lastText) {
          lastText = text;
          textRef.current.textContent = text;
        }
      }

      if (circleRef.current) {
        const frac = initialMs > 0 ? Math.max(0, ms / initialMs) : 0;
        circleRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - frac));
        circleRef.current.style.stroke = getStrokeColor(frac);
      }

      const cls = ms > 0 && ms < 5_000 ? "critical" : ms > 0 && ms < 10_000 ? "low" : "normal";
      if (cls !== lastClass) {
        lastClass = cls;
        setTimeClass(cls);
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeMsRef, initialMs]);

  const fraction = initialMs > 0 ? Math.max(0, timeMs / initialMs) : 0;
  const offset = CIRCUMFERENCE * (1 - fraction);
  const strokeColor = getStrokeColor(fraction);

  return (
    <div
      role="timer"
      aria-label={`${color === "w" ? "White" : "Black"} clock`}
      aria-live={timeClass === "critical" ? "assertive" : "off"}
      className="relative flex-shrink-0"
    >
      <svg
        width={renderSize ?? SIZE}
        height={renderSize ?? SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={timeClass === "critical" ? "animate-pulse" : ""}
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border, #3d2f34)"
          strokeWidth={STROKE}
        />
        {/* Progress ring */}
        <circle
          ref={circleRef}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="transition-[stroke] duration-300"
        />
        {/* Time text */}
        <text
          ref={textRef}
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-foreground, #f0ddd4)"
          fontSize="16"
          fontFamily="var(--font-mono, monospace)"
          fontWeight="bold"
        >
          {formatTime(timeMs)}
        </text>
      </svg>
      {/* Active indicator glow */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 12px 2px ${strokeColor}40`,
          }}
        />
      )}
    </div>
  );
});
