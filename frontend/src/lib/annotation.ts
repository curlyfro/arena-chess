import { INITIAL_FEN } from "@/constants/chess";
import { FAVORABLE_CLASSIFICATIONS } from "@/constants/chess-labels";
import type { AnnotatedMove, MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";

export interface ViewedAnnotation {
  readonly moveIndex: number;
  readonly classification: MoveClassification;
  readonly playedMoveSan: string;
  readonly bestMoveUci: string;
  readonly fenBefore: string;
  readonly evalBefore: EvalScore;
  readonly evalAfter: EvalScore;
}

export function buildViewedAnnotation(
  viewingMoveIndex: number | null,
  classifications: ReadonlyMap<number, MoveClassification>,
  history: readonly AnnotatedMove[],
  analysisEvals: readonly EvalScore[],
  analysisBestMoves: readonly string[],
): ViewedAnnotation | null {
  if (viewingMoveIndex == null) return null;

  const classification = classifications.get(viewingMoveIndex);
  if (!classification) return null;
  if ((FAVORABLE_CLASSIFICATIONS as readonly string[]).includes(classification)) return null;

  const move = history[viewingMoveIndex];
  if (!move) return null;

  const evalBefore = analysisEvals[viewingMoveIndex];
  const evalAfter = analysisEvals[viewingMoveIndex + 1];
  const bestMoveUci = analysisBestMoves[viewingMoveIndex];
  if (!evalBefore || !evalAfter || !bestMoveUci) return null;

  const fenBefore = viewingMoveIndex === 0
    ? INITIAL_FEN
    : history[viewingMoveIndex - 1].fen;

  return {
    moveIndex: viewingMoveIndex,
    classification,
    playedMoveSan: move.san,
    bestMoveUci,
    fenBefore,
    evalBefore,
    evalAfter,
  };
}
