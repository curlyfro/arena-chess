import { memo, useMemo } from "react";
import type { MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import { uciToSan } from "@/lib/uci";

interface MoveAnnotationProps {
  readonly moveIndex: number;
  readonly classification: MoveClassification;
  readonly playedMoveSan: string;
  readonly bestMoveUci: string;
  readonly fenBefore: string;
  readonly evalBefore: EvalScore;
  readonly evalAfter: EvalScore;
}

const CLASSIFICATION_LABELS: Record<string, { label: string; className: string }> = {
  blunder: { label: "Blunder", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  mistake: { label: "Mistake", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  inaccuracy: { label: "Inaccuracy", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

function formatEval(ev: EvalScore): string {
  if (ev.type === "mate") return `M${Math.abs(ev.value)}`;
  const pawns = ev.value / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(1)}`;
}

export const MoveAnnotation = memo(function MoveAnnotation({
  moveIndex,
  classification,
  playedMoveSan,
  bestMoveUci,
  fenBefore,
  evalBefore,
  evalAfter,
}: MoveAnnotationProps) {
  const config = CLASSIFICATION_LABELS[classification];
  if (!config) return null;

  const bestMoveSan = useMemo(
    () => uciToSan(fenBefore, bestMoveUci),
    [fenBefore, bestMoveUci],
  );

  const moveNum = Math.floor(moveIndex / 2) + 1;
  const isWhite = moveIndex % 2 === 0;
  const moveLabel = `${moveNum}${isWhite ? "." : "..."} `;

  const cpLoss = evalBefore.type === "cp" && evalAfter.type === "cp"
    ? Math.abs(evalBefore.value - evalAfter.value)
    : null;

  return (
    <div className={`rounded-lg border p-3 ${config.className}`}>
      <div className="text-xs font-bold uppercase mb-1">{config.label}</div>
      <div className="text-sm">
        <span className="font-mono font-bold">{moveLabel}{playedMoveSan}</span>
        <span className="text-xs ml-1 opacity-80">({formatEval(evalAfter)})</span>
      </div>
      <div className="text-xs mt-1 opacity-80">
        Best was{" "}
        <span className="font-mono font-bold">{bestMoveSan}</span>
        <span className="ml-1">({formatEval(evalBefore)})</span>
        {cpLoss != null && (
          <span className="ml-1">
            — lost {(cpLoss / 100).toFixed(1)} pawns
          </span>
        )}
      </div>
    </div>
  );
});
