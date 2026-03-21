import type { MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import type { PostGameStats } from "@/types/game";

/**
 * Classify a move by centipawn loss relative to engine's best evaluation.
 * Thresholds per spec section 4.5:
 * - Blunder: >200cp loss
 * - Mistake: >100cp loss
 * - Inaccuracy: >50cp loss
 * - Good: within 50cp
 * - Best: within 20cp
 */
export function classifyMove(cpLoss: number): MoveClassification {
  if (cpLoss >= 200) return "blunder";
  if (cpLoss >= 100) return "mistake";
  if (cpLoss >= 50) return "inaccuracy";
  if (cpLoss >= 20) return "good";
  return "best";
}

/**
 * Compute post-game statistics from the evaluation history.
 * Evaluations alternate: position after white's move, after black's move, etc.
 */
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

  // Accuracy = 100 - (avgCpLoss / 2), clamped 0-100
  const whiteAccuracy = Math.max(0, Math.min(100, 100 - whiteAvgCpLoss / 2));
  const blackAccuracy = Math.max(0, Math.min(100, 100 - blackAvgCpLoss / 2));

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
