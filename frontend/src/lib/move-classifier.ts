import type { MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import type { PostGameStats } from "@/types/game";

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
    const prev = evalHistory[i - 1];
    const curr = evalHistory[i];
    if (prev.type === "mate" || curr.type === "mate") continue;

    const isWhiteMove = i % 2 === 1;
    const cpLoss = isWhiteMove
      ? Math.max(0, prev.value - curr.value)
      : Math.max(0, curr.value - prev.value);

    result.set(i - 1, classifyMove(cpLoss));
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
    const prev = evalHistory[i - 1];
    const curr = evalHistory[i];

    // Skip mate evaluations for cp loss calculation
    if (prev.type === "mate" || curr.type === "mate") continue;

    const isWhiteMove = i % 2 === 1; // Odd indices = after white's move (0-indexed)
    const cpLoss = isWhiteMove
      ? Math.max(0, prev.value - curr.value) // White wants positive eval
      : Math.max(0, curr.value - prev.value); // Black wants negative eval

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
