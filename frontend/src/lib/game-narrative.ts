import type { AnnotatedMove, PieceColor, MoveClassification } from "@/types/chess";

interface NarrativeInput {
  readonly playerColor: PieceColor;
  readonly playerWon: boolean;
  readonly isDraw: boolean;
  readonly openingName: string | null;
  readonly moveCount: number;
  readonly accuracy: number | null;
  readonly blunders: number;
  readonly mistakes: number;
  readonly classifications: ReadonlyMap<number, MoveClassification>;
  readonly history: readonly AnnotatedMove[];
}

/** Generate a 2-3 sentence game narrative from analysis data. */
export function generateNarrative(input: NarrativeInput): string {
  const parts: string[] = [];

  // Opening
  if (input.openingName) {
    parts.push(`You played the ${input.openingName}.`);
  }

  // Accuracy summary
  if (input.accuracy != null) {
    if (input.accuracy >= 90) {
      parts.push("Your play was excellent throughout.");
    } else if (input.accuracy >= 75) {
      parts.push("You played solidly overall.");
    } else if (input.accuracy >= 60) {
      parts.push("Your play was uneven with room to improve.");
    } else {
      parts.push("Several inaccuracies cost you in this game.");
    }
  }

  // Blunder narrative
  if (input.blunders > 0) {
    const blunderMoves = findClassifiedMoves(input.classifications, input.history, "blunder");
    if (blunderMoves.length > 0) {
      const first = blunderMoves[0];
      const moveNum = Math.ceil((first.index + 1) / 2);
      parts.push(`A critical blunder with ${first.san} on move ${moveNum} shifted the balance.`);
    }
  } else if (input.mistakes === 0 && input.accuracy != null && input.accuracy >= 85) {
    parts.push("No blunders or mistakes \u2014 a clean game.");
  }

  // Result-based closing
  if (input.playerWon) {
    if (input.moveCount < 25) {
      parts.push("A swift and decisive victory.");
    } else {
      parts.push("Well played!");
    }
  } else if (input.isDraw) {
    parts.push("A hard-fought draw.");
  } else {
    if (input.blunders > 2) {
      parts.push("Focus on avoiding blunders to improve your results.");
    } else {
      parts.push("A tough loss, but there's always the next game.");
    }
  }

  return parts.join(" ");
}

interface SuggestionInput {
  readonly playerWon: boolean;
  readonly isDraw: boolean;
  readonly accuracy: number | null;
  readonly blunders: number;
  readonly openingName: string | null;
  readonly sessionLevel: number | null;
  readonly maxLevel: number;
}

export interface GameSuggestion {
  readonly text: string;
  readonly link?: string;
  readonly action?: "nextLevel";
}

/** Generate contextual next-step suggestions. */
export function generateSuggestions(input: SuggestionInput): GameSuggestion[] {
  const suggestions: GameSuggestion[] = [];

  if (input.playerWon && input.sessionLevel != null && input.sessionLevel < input.maxLevel) {
    suggestions.push({
      text: `Ready for a harder challenge?`,
      action: "nextLevel",
    });
  }

  if (!input.playerWon && input.blunders > 1) {
    suggestions.push({
      text: "Sharpen your tactics with puzzles",
      link: "/puzzles",
    });
  }

  if (input.accuracy != null && input.accuracy < 65 && !input.playerWon) {
    suggestions.push({
      text: "Try the tutorials to build fundamentals",
      link: "/tutorials",
    });
  }

  if (input.openingName) {
    suggestions.push({
      text: `Explore the ${input.openingName}`,
      link: `/openings?q=${encodeURIComponent(input.openingName)}`,
    });
  }

  return suggestions.slice(0, 3);
}

function findClassifiedMoves(
  classifications: ReadonlyMap<number, MoveClassification>,
  history: readonly AnnotatedMove[],
  target: MoveClassification,
): { index: number; san: string }[] {
  const result: { index: number; san: string }[] = [];
  for (const [index, classification] of classifications) {
    if (classification === target && history[index]) {
      result.push({ index, san: history[index].san });
    }
  }
  return result;
}
