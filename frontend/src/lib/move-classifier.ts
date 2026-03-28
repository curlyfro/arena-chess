import type { MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import type { PostGameStats } from "@/types/game";

const MATE_CP = 10_000;

/** Convert any eval to centipawns. Mate evals become large values (closer mate = more extreme). */
function evalToCp(ev: EvalScore): number {
  if (ev.type === "cp") return ev.value;
  const sign = ev.value > 0 ? 1 : -1;
  return sign * Math.max(0, MATE_CP - Math.abs(ev.value) * 10);
}

/** Compute centipawn loss for a single move transition. */
function moveCpLoss(evalHistory: readonly EvalScore[], moveIndex: number): number {
  const prevCp = evalToCp(evalHistory[moveIndex - 1]);
  const currCp = evalToCp(evalHistory[moveIndex]);
  const isWhiteMove = moveIndex % 2 === 1;
  return isWhiteMove
    ? Math.max(0, prevCp - currCp)
    : Math.max(0, currCp - prevCp);
}

export function classifyMove(cpLoss: number): MoveClassification {
  if (cpLoss >= 200) return "blunder";
  if (cpLoss >= 100) return "mistake";
  if (cpLoss >= 50) return "inaccuracy";
  if (cpLoss >= 20) return "good";
  return "best";
}

/**
 * Classify each move given the full eval history.
 * evalHistory[0] = starting position, evalHistory[i+1] = position after move i.
 */
export function classifyMoves(
  evalHistory: readonly EvalScore[],
): ReadonlyMap<number, MoveClassification> {
  const result = new Map<number, MoveClassification>();
  for (let i = 1; i < evalHistory.length; i++) {
    result.set(i - 1, classifyMove(moveCpLoss(evalHistory, i)));
  }
  return result;
}

export function computePostGameStats(
  evalHistory: readonly EvalScore[],
): PostGameStats {
  let whiteCpLossTotal = 0;
  let blackCpLossTotal = 0;
  let whiteMoveCount = 0;
  let blackMoveCount = 0;
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;

  for (let i = 1; i < evalHistory.length; i++) {
    const cpLoss = moveCpLoss(evalHistory, i);
    const isWhiteMove = i % 2 === 1;

    const classification = classifyMove(cpLoss);
    if (classification === "blunder") blunders++;
    else if (classification === "mistake") mistakes++;
    else if (classification === "inaccuracy") inaccuracies++;

    if (isWhiteMove) {
      whiteCpLossTotal += cpLoss;
      whiteMoveCount++;
    } else {
      blackCpLossTotal += cpLoss;
      blackMoveCount++;
    }
  }

  const whiteAvgCpLoss =
    whiteMoveCount > 0 ? whiteCpLossTotal / whiteMoveCount : 0;
  const blackAvgCpLoss =
    blackMoveCount > 0 ? blackCpLossTotal / blackMoveCount : 0;

  // Lichess accuracy formula: better distribution across skill levels
  const acplToAccuracy = (acpl: number) =>
    Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * acpl) - 3.1669));
  const whiteAccuracy = acplToAccuracy(whiteAvgCpLoss);
  const blackAccuracy = acplToAccuracy(blackAvgCpLoss);

  const totalAvgCpLoss =
    whiteMoveCount + blackMoveCount > 0
      ? (whiteCpLossTotal + blackCpLossTotal) /
        (whiteMoveCount + blackMoveCount)
      : 0;

  return {
    accuracy: { white: whiteAccuracy, black: blackAccuracy },
    blunders,
    mistakes,
    inaccuracies,
    averageCentipawnLoss: totalAvgCpLoss,
  };
}
