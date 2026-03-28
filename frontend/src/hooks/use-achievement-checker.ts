import { useCallback } from "react";
import { useAchievementStore } from "@/stores/achievement-store";
import { useLevelStore } from "@/stores/level-store";
import { XP_REWARDS } from "@/constants/xp-config";
import { isPlayerWin } from "@/lib/game-utils";
import type { GameResult, GameStatus, PieceColor } from "@/types/chess";

export function useAchievementChecker() {
  const unlock = useAchievementStore((s) => s.unlock);
  const unlocked = useAchievementStore((s) => s.unlockedIds);
  const addXp = useLevelStore((s) => s.addXp);

  /** Unlock with XP reward (only awards XP on first unlock) */
  const unlockWithXp = useCallback(
    (id: string) => {
      const isNew = !unlocked.includes(id);
      unlock(id);
      if (isNew) addXp(XP_REWARDS.achievementUnlock);
    },
    [unlock, unlocked, addXp],
  );

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
      const won = isPlayerWin(playerColor, result);
      if (!won) return;

      unlockWithXp("first-win");
      if (playerColor === "b") unlockWithXp("win-as-black");
      if (aiLevel >= 1) unlockWithXp("beat-l1");
      if (aiLevel >= 3) unlockWithXp("beat-l3");
      if (aiLevel >= 5) unlockWithXp("beat-l5");
      if (aiLevel >= 8) unlockWithXp("beat-l8");
      // moveCount is half-moves (plies); 40 plies = 20 full moves
      if (moveCount < 40) unlockWithXp("quick-win");
      if (termination === "flagged") unlockWithXp("flag-win");
      if (termination === "checkmate") unlockWithXp("checkmate-win");

      if (eloAfter != null) {
        if (eloAfter >= 1200) unlockWithXp("elo-1200");
        if (eloAfter >= 1400) unlockWithXp("elo-1400");
        if (eloAfter >= 1600) unlockWithXp("elo-1600");
        if (eloAfter >= 1800) unlockWithXp("elo-1800");
        if (eloAfter >= 2000) unlockWithXp("elo-2000");
      }
    },
    [unlockWithXp],
  );

  const checkPuzzleAchievements = useCallback(
    (totalSolved: number, currentStreak: number, dailyStreak: number) => {
      if (totalSolved >= 10) unlockWithXp("puzzle-10");
      if (totalSolved >= 50) unlockWithXp("puzzle-50");
      if (totalSolved >= 100) unlockWithXp("puzzle-100");
      if (currentStreak >= 5) unlockWithXp("puzzle-streak-5");
      if (dailyStreak >= 3) unlockWithXp("daily-3");
      if (dailyStreak >= 7) unlockWithXp("daily-7");
    },
    [unlockWithXp],
  );

  const checkTutorialAchievements = useCallback(
    (completedCount: number, allBasicsComplete: boolean, allComplete: boolean) => {
      if (completedCount >= 1) unlockWithXp("tutorial-first");
      if (allBasicsComplete) unlockWithXp("tutorial-basics");
      if (allComplete) unlockWithXp("tutorial-all");
    },
    [unlockWithXp],
  );

  return { checkGameAchievements, checkPuzzleAchievements, checkTutorialAchievements };
}
