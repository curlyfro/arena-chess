import { memo } from "react";
import type { EvalScore } from "@/types/engine";
import type { PieceColor } from "@/types/chess";
import { cn } from "@/lib/cn";

interface EvalBarProps {
  readonly evaluation: EvalScore | null;
  readonly playerColor: PieceColor;
  readonly flipped: boolean;
}

function evalToPercent(evalScore: EvalScore | null): number {
  if (!evalScore) return 50;

  if (evalScore.type === "mate") {
    return evalScore.value > 0 ? 100 : 0;
  }

  // Clamp centipawns to ±1000 (±10 pawns) and map to 0-100
  const clamped = Math.max(-1000, Math.min(1000, evalScore.value));
  // Sigmoid-like mapping for visual clarity
  return 50 + (clamped / 1000) * 50;
}

function evalToLabel(evalScore: EvalScore | null): string {
  if (!evalScore) return "0.0";

  if (evalScore.type === "mate") {
    return `M${Math.abs(evalScore.value)}`;
  }

  const pawns = evalScore.value / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(1)}`;
}

export const EvalBar = memo(function EvalBar({
  evaluation,
  playerColor,
  flipped,
}: EvalBarProps) {
  const whitePercent = evalToPercent(evaluation);
  // If board is flipped or player is black, we need to adjust
  const bottomIsWhite = flipped ? playerColor === "b" : playerColor === "w";
  const bottomPercent = bottomIsWhite ? whitePercent : 100 - whitePercent;

  const label = evalToLabel(evaluation);
  const isWhiteAdvantage = whitePercent > 50;

  return (
    <div className="flex h-full w-6 flex-col-reverse overflow-hidden rounded bg-zinc-800">
      {/* White portion from bottom */}
      <div
        className="bg-zinc-100 transition-all duration-300 ease-out"
        style={{ height: `${bottomPercent}%` }}
      />
      {/* Label positioned at midpoint */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "text-[9px] font-bold",
            isWhiteAdvantage ? "text-zinc-800" : "text-zinc-200",
          )}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
});
