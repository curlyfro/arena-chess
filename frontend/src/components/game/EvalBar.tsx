import { memo } from "react";
import type { EvalScore } from "@/types/engine";
import type { PieceColor } from "@/types/chess";
import { cn } from "@/lib/cn";
import { evalToPercent, evalToLabel } from "@/lib/eval-utils";

interface EvalBarProps {
  readonly evaluation: EvalScore | null;
  readonly playerColor: PieceColor;
  readonly flipped: boolean;
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
