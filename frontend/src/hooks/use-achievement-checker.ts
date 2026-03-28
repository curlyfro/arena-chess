import { useCallback } from "react";
import { useAchievementStore } from "@/stores/achievement-store";
import type { GameResult, GameStatus, PieceColor } from "@/types/chess";

export function useAchievementChecker() {
  const unlock = useAchievementStore((s) => s.unlock);

  const checkGameAchievements = useCallback(
    (params: {
      result: GameResult;
      playerColor: PieceColor;
      aiLevel: number;
      termination: GameStatus;
      moveCount: number;
      eloAfter: number | null;
    }) => {
      const { result, playerColor, aiLevel, termination, moveCount, eloAfter } = params;
      const won =
        (playerColor === "w" && result === "1-0") ||
        (playerColor === "b" && result === "0-1");
      if (!won) return;

      unlock("first-win");
      if (playerColor === "b") unlock("win-as-black");
      if (aiLevel >= 1) unlock("beat-l1");
      if (aiLevel >= 3) unlock("beat-l3");
      if (aiLevel >= 5) unlock("beat-l5");
      if (aiLevel >= 8) unlock("beat-l8");
      // moveCount is half-moves (plies); 40 plies = 20 full moves
      if (moveCount < 40) unlock("quick-win");
      if (termination === "flagged") unlock("flag-win");
      if (termination === "checkmate") unlock("checkmate-win");

      if (eloAfter != null) {
        if (eloAfter >= 1200) unlock("elo-1200");
        if (eloAfter >= 1400) unlock("elo-1400");
        if (eloAfter >= 1600) unlock("elo-1600");
        if (eloAfter >= 1800) unlock("elo-1800");
        if (eloAfter >= 2000) unlock("elo-2000");
      }
    },
    [unlock],
  );

  const checkPuzzleAchievements = useCallback(
    (totalSolved: number, currentStreak: number, dailyStreak: number) => {
      if (totalSolved >= 10) unlock("puzzle-10");
      if (totalSolved >= 50) unlock("puzzle-50");
      if (totalSolved >= 100) unlock("puzzle-100");
      if (currentStreak >= 5) unlock("puzzle-streak-5");
      if (dailyStreak >= 3) unlock("daily-3");
      if (dailyStreak >= 7) unlock("daily-7");
    },
    [unlock],
  );

  return { checkGameAchievements, checkPuzzleAchievements };
}
