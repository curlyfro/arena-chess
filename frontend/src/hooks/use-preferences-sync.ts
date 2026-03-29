import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { useLevelStore } from "@/stores/level-store";
import { useAchievementStore } from "@/stores/achievement-store";
import { usePuzzleStore } from "@/stores/puzzle-store";
import { useTutorialStore } from "@/stores/tutorial-store";
import { useChallengeStore } from "@/stores/challenge-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { preferencesApi } from "@/lib/preferences-api";

const DEBOUNCE_MS = 2000;

function collectPreferences(): Record<string, unknown> {
  const game = useGameStore.getState();
  const level = useLevelStore.getState();
  const achievements = useAchievementStore.getState();
  const puzzles = usePuzzleStore.getState();
  const tutorials = useTutorialStore.getState();
  const challenges = useChallengeStore.getState();
  const onboarding = useOnboardingStore.getState();

  return {
    boardThemeId: game.boardThemeId,
    pieceSet: game.pieceSet,
    boardFlipped: game.boardFlipped,
    soundEnabled: game.soundEnabled,
    soundVolume: game.soundVolume,
    showCoordinates: game.showCoordinates,
    showEvalBar: game.showEvalBar,
    autoAnalyze: game.autoAnalyze,
    avatarId: game.avatarId,
    avatarImage: game.avatarImage,
    lastGameSettings: game.lastGameSettings,
    winStreak: game.winStreak,
    bestWinStreak: game.bestWinStreak,
    totalXp: level.totalXp,
    unlockedIds: achievements.unlockedIds,
    puzzleRating: puzzles.puzzleRating,
    puzzleCurrentStreak: puzzles.currentStreak,
    puzzleBestStreak: puzzles.bestStreak,
    puzzleTotalSolved: puzzles.totalSolved,
    puzzleTotalAttempted: puzzles.totalAttempted,
    seenPuzzleIds: puzzles.seenPuzzleIds,
    dailyCompletedDates: puzzles.dailyCompletedDates,
    completedLessons: tutorials.completedLessons,
    lessonProgress: tutorials.lessonProgress,
    dailyChallenges: challenges.dailyChallenges,
    weeklyChallenges: challenges.weeklyChallenges,
    lastDailyDate: challenges.lastDailyDate,
    lastWeeklyDate: challenges.lastWeeklyDate,
    hasCompletedOnboarding: onboarding.hasCompletedOnboarding,
  };
}

function applyPreferences(data: Record<string, unknown>) {
  useGameStore.setState({
    boardThemeId: data.boardThemeId as string,
    pieceSet: data.pieceSet as "merida" | "neo",
    boardFlipped: data.boardFlipped as boolean,
    soundEnabled: data.soundEnabled as boolean,
    soundVolume: data.soundVolume as number,
    showCoordinates: data.showCoordinates as boolean,
    showEvalBar: data.showEvalBar as boolean,
    autoAnalyze: data.autoAnalyze as boolean,
    avatarId: (data.avatarId as string) ?? null,
    avatarImage: (data.avatarImage as string) ?? null,
    lastGameSettings: data.lastGameSettings as ReturnType<
      typeof useGameStore.getState
    >["lastGameSettings"],
    winStreak: data.winStreak as number,
    bestWinStreak: data.bestWinStreak as number,
  });

  useLevelStore.setState({ totalXp: data.totalXp as number });

  useAchievementStore.setState({
    unlockedIds: data.unlockedIds as string[],
  });

  usePuzzleStore.setState({
    puzzleRating: data.puzzleRating as number,
    currentStreak: data.puzzleCurrentStreak as number,
    bestStreak: data.puzzleBestStreak as number,
    totalSolved: data.puzzleTotalSolved as number,
    totalAttempted: data.puzzleTotalAttempted as number,
    seenPuzzleIds: data.seenPuzzleIds as string[],
    dailyCompletedDates: data.dailyCompletedDates as string[],
  });

  useTutorialStore.setState({
    completedLessons: data.completedLessons as string[],
    lessonProgress: data.lessonProgress as Record<string, number>,
  });

  useChallengeStore.setState({
    dailyChallenges: data.dailyChallenges as ReturnType<
      typeof useChallengeStore.getState
    >["dailyChallenges"],
    weeklyChallenges: data.weeklyChallenges as ReturnType<
      typeof useChallengeStore.getState
    >["weeklyChallenges"],
    lastDailyDate: data.lastDailyDate as string,
    lastWeeklyDate: data.lastWeeklyDate as string,
  });

  useOnboardingStore.setState({
    hasCompletedOnboarding: data.hasCompletedOnboarding as boolean,
  });
}

export function usePreferencesSync() {
  const user = useAuthStore((s) => s.user);
  const versionRef = useRef(0);
  const isSyncingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    // Load preferences from server on login
    let cancelled = false;

    async function loadFromServer() {
      try {
        isSyncingRef.current = true;
        const { data: response } = await preferencesApi.get();
        if (cancelled) return;

        versionRef.current = response.version;

        if (response.data) {
          applyPreferences(response.data);
        }
      } catch {
        // Non-critical — local data is the fallback
      } finally {
        isSyncingRef.current = false;
      }
    }

    loadFromServer();

    // Subscribe to all stores for changes
    const unsubscribers = [
      useGameStore,
      useLevelStore,
      useAchievementStore,
      usePuzzleStore,
      useTutorialStore,
      useChallengeStore,
      useOnboardingStore,
    ].map((store) =>
      store.subscribe(() => {
        if (isSyncingRef.current) return;

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
          try {
            const prefs = collectPreferences();
            await preferencesApi.save(prefs, versionRef.current);
            versionRef.current++;
          } catch (err: unknown) {
            if (
              (err as { response?: { status?: number } }).response?.status ===
              409
            ) {
              // Version conflict — re-fetch from server
              try {
                isSyncingRef.current = true;
                const { data: response } = await preferencesApi.get();
                versionRef.current = response.version;
                if (response.data) {
                  applyPreferences(response.data);
                }
              } catch {
                // ignore
              } finally {
                isSyncingRef.current = false;
              }
            }
          }
        }, DEBOUNCE_MS);
      }),
    );

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsub) => unsub());
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user]);
}
