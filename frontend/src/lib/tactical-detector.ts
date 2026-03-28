import type { AnnotatedMove, MoveClassification } from "@/types/chess";

export interface TacticalSuggestion {
  readonly pattern: string;
  readonly moveIndex: number;
  readonly moveSan: string;
  readonly tutorialId: string;
  readonly tutorialTitle: string;
}

const TACTICAL_TUTORIALS: readonly {
  pattern: string;
  tutorialId: string;
  tutorialTitle: string;
  /** Detect from the best move UCI and the position context. */
  detect: (bestMoveUci: string) => boolean;
}[] = [
  {
    pattern: "fork",
    tutorialId: "midgame-fork",
    tutorialTitle: "Forks",
    detect: (bestMoveUci) => {
      const from = bestMoveUci.slice(0, 2);
      const to = bestMoveUci.slice(2, 4);
      const fileDiff = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
      const rankDiff = Math.abs(Number(from[1]) - Number(to[1]));
      return (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);
    },
  },
  {
    pattern: "pin",
    tutorialId: "midgame-pin",
    tutorialTitle: "Pins",
    detect: (bestMoveUci) => {
      const from = bestMoveUci.slice(0, 2);
      const to = bestMoveUci.slice(2, 4);
      const fileDiff = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
      const rankDiff = Math.abs(Number(from[1]) - Number(to[1]));
      return fileDiff === rankDiff && fileDiff >= 2;
    },
  },
  {
    pattern: "skewer",
    tutorialId: "midgame-skewer",
    tutorialTitle: "Skewers",
    detect: (bestMoveUci) => {
      const from = bestMoveUci.slice(0, 2);
      const to = bestMoveUci.slice(2, 4);
      const fileDiff = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
      const rankDiff = Math.abs(Number(from[1]) - Number(to[1]));
      return (fileDiff === 0 && rankDiff >= 3) || (rankDiff === 0 && fileDiff >= 3);
    },
  },
];

/**
 * Detect tactical patterns from the player's blunders by analyzing what the best move was.
 * Returns up to 2 unique suggestions.
 */
export function detectTacticalPatterns(
  classifications: ReadonlyMap<number, MoveClassification>,
  history: readonly AnnotatedMove[],
  analysisBestMoves: readonly string[],
  completedTutorialIds: ReadonlySet<string>,
): TacticalSuggestion[] {
  const suggestions: TacticalSuggestion[] = [];
  const seenPatterns = new Set<string>();

  for (const [moveIndex, classification] of classifications) {
    if (classification !== "blunder" && classification !== "mistake") continue;

    const bestMoveUci = analysisBestMoves[moveIndex + 1];
    if (!bestMoveUci || bestMoveUci.length < 4) continue;

    for (const tactic of TACTICAL_TUTORIALS) {
      if (seenPatterns.has(tactic.pattern)) continue;
      if (completedTutorialIds.has(tactic.tutorialId)) continue;

      if (tactic.detect(bestMoveUci)) {
        seenPatterns.add(tactic.pattern);
        suggestions.push({
          pattern: tactic.pattern,
          moveIndex,
          moveSan: history[moveIndex]?.san ?? "",
          tutorialId: tactic.tutorialId,
          tutorialTitle: tactic.tutorialTitle,
        });
        break;
      }
    }

    if (suggestions.length >= 2) break;
  }

  return suggestions;
}
