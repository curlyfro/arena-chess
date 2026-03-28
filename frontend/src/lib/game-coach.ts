import type { AnnotatedMove } from "@/types/chess";
import type { EvalScore } from "@/types/engine";

export interface CoachTip {
  readonly message: string;
  readonly type: "praise" | "warning" | "teaching";
}

/**
 * Generate contextual coaching tips based on the current game state.
 * Returns null if no tip is warranted for this position.
 */
export function getCoachTip(
  history: readonly AnnotatedMove[],
  evaluation: EvalScore | null,
  prevEvaluation: EvalScore | null,
  playerColor: "w" | "b",
  isPlayerTurn: boolean,
): CoachTip | null {
  const moveCount = history.length;
  const playerMoveCount = playerColor === "w"
    ? Math.ceil(moveCount / 2)
    : Math.floor(moveCount / 2);

  // Only give tips after the player's move (when it's now the opponent's turn)
  if (isPlayerTurn) return null;
  if (moveCount === 0) return null;

  const lastMove = history[moveCount - 1];
  const lastMoveByPlayer =
    (playerColor === "w" && moveCount % 2 === 1) ||
    (playerColor === "b" && moveCount % 2 === 0);

  if (!lastMoveByPlayer) return null;

  // Detect eval drop (blunder/mistake by the player)
  if (evaluation && prevEvaluation) {
    const evalDiff = getEvalCp(evaluation, playerColor) - getEvalCp(prevEvaluation, playerColor);
    if (evalDiff < -200) {
      return {
        message: "That move lost material! Always check if your pieces are safe before moving.",
        type: "warning",
      };
    }
    if (evalDiff < -80) {
      return {
        message: "Not the strongest move. Look for pieces that could be attacked.",
        type: "warning",
      };
    }
    if (evalDiff > 150) {
      return {
        message: "Excellent move! You found a strong continuation.",
        type: "praise",
      };
    }
  }

  // Opening tips (moves 1-10)
  if (moveCount <= 20) {
    // Moved queen too early
    if (lastMove.san.startsWith("Q") && playerMoveCount <= 4) {
      return {
        message: "Developing your queen early can be risky \u2014 it may get chased by opponent pieces.",
        type: "teaching",
      };
    }

    // Good: castled
    if (lastMove.san === "O-O" || lastMove.san === "O-O-O") {
      return {
        message: "Great! Castling protects your king and activates your rook.",
        type: "praise",
      };
    }

    // Developing knights/bishops
    if ((lastMove.san.startsWith("N") || lastMove.san.startsWith("B")) && playerMoveCount <= 6) {
      return {
        message: "Good development! Getting your pieces out early controls the center.",
        type: "praise",
      };
    }

    // Moving the same piece twice in opening — only check last 2 player moves
    if (moveCount >= 6 && playerMoveCount <= 8) {
      const step = 2; // player moves are every other half-move
      const lastIdx = playerColor === "w" ? moveCount - 2 : moveCount - 1;
      const prevIdx = lastIdx - step;
      if (prevIdx >= 0 && lastIdx < history.length) {
        const lastPiece = history[lastIdx].san[0];
        const prevPiece = history[prevIdx].san[0];
        if (lastPiece === prevPiece && history[lastIdx].to !== history[prevIdx].to &&
            "NBRQK".includes(lastPiece)) {
          return {
            message: "Try to develop a different piece instead of moving the same one twice.",
            type: "teaching",
          };
        }
      }
    }
  }

  // Checkmate tip
  if (lastMove.san.includes("#")) {
    return {
      message: "Checkmate! Outstanding finish!",
      type: "praise",
    };
  }

  // Check tip
  if (lastMove.san.includes("+")) {
    return {
      message: "Check! Keep the pressure on.",
      type: "praise",
    };
  }

  // Capture tip (every ~3rd capture in midgame)
  if (lastMove.san.includes("x") && moveCount > 10 && moveCount % 3 === 0) {
    return {
      message: "Good capture! Make sure you're trading favorably.",
      type: "teaching",
    };
  }

  return null;
}

function getEvalCp(evalScore: EvalScore, playerColor: "w" | "b"): number {
  const sign = playerColor === "w" ? 1 : -1;
  if (evalScore.type === "mate") {
    return evalScore.value > 0 ? sign * 10000 : sign * -10000;
  }
  return evalScore.value * sign;
}
