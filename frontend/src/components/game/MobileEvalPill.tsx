import { memo } from "react";
import type { EvalScore } from "@/types/engine";
import type { PieceColor } from "@/types/chess";
import { evalToPercent, evalToLabel } from "@/lib/eval-utils";

interface MobileEvalPillProps {
  readonly evaluation: EvalScore | null;
  readonly playerColor: PieceColor;
  readonly flipped: boolean;
}

export const MobileEvalPill = memo(function MobileEvalPill({
  evaluation,
  playerColor,
  flipped,
}: MobileEvalPillProps) {
  const whitePercent = evalToPercent(evaluation);
  const bottomIsWhite = flipped ? playerColor === "b" : playerColor === "w";
  const advantagePercent = bottomIsWhite ? whitePercent : 100 - whitePercent;
  const isWhiteAdvantage = whitePercent > 50;

  const label = evalToLabel(evaluation);

  return (
    <div className="mx-auto h-6 w-40 overflow-hidden rounded-full md:hidden">
      <div className="relative flex h-full w-full">
        <div
          className="bg-zinc-100 transition-all duration-300 ease-out"
          style={{ width: `${advantagePercent}%` }}
        />
        <div className="flex-1 bg-zinc-800" />
        <span
          className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
            isWhiteAdvantage ? "text-zinc-800" : "text-zinc-200"
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
});
