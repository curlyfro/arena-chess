import { create } from "zustand";
import { persist } from "zustand/middleware";
import { XP_REWARDS } from "@/constants/xp-config";
import { useLevelStore } from "@/stores/level-store";
import { useChallengeStore } from "@/stores/challenge-store";

interface PuzzleStore {
  puzzleRating: number;
  currentStreak: number;
  bestStreak: number;
  totalSolved: number;
  totalAttempted: number;
  seenPuzzleIds: string[];
  dailyCompletedDates: string[];

  recordCorrect: (puzzleRating: number) => void;
  recordIncorrect: () => void;
  addSeenPuzzle: (id: string) => void;
  addDailyCompletion: (date: string) => void;
  getDailyStreak: () => number;
}

const K_FACTOR = 32;
const MAX_SEEN = 400;

function computeDailyStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  if (sorted[0] !== today) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export const usePuzzleStore = create<PuzzleStore>()(
  persist(
    (set, get) => ({
      puzzleRating: 1000,
      currentStreak: 0,
      bestStreak: 0,
      totalSolved: 0,
      totalAttempted: 0,
      seenPuzzleIds: [],
      dailyCompletedDates: [],

      recordCorrect: (puzzleRating: number) => {
        set((state) => {
          const expected = 1 / (1 + Math.pow(10, (puzzleRating - state.puzzleRating) / 400));
          const newRating = Math.round(state.puzzleRating + K_FACTOR * (1 - expected));
          const newStreak = state.currentStreak + 1;
          return {
            puzzleRating: Math.max(400, newRating),
            currentStreak: newStreak,
            bestStreak: Math.max(state.bestStreak, newStreak),
            totalSolved: state.totalSolved + 1,
            totalAttempted: state.totalAttempted + 1,
          };
        });
        // Award XP for solving a puzzle
        useLevelStore.getState().addXp(XP_REWARDS.puzzleSolve);
        useChallengeStore.getState().onPuzzleSolved();
      },

      recordIncorrect: () =>
        set((state) => {
          const newRating = Math.round(state.puzzleRating - K_FACTOR * 0.5);
          return {
            puzzleRating: Math.max(400, newRating),
            currentStreak: 0,
            totalAttempted: state.totalAttempted + 1,
          };
        }),

      addSeenPuzzle: (id: string) =>
        set((state) => {
          if (state.seenPuzzleIds.includes(id)) return state;
          const next = [...state.seenPuzzleIds, id];
          return { seenPuzzleIds: next.length > MAX_SEEN ? next.slice(-MAX_SEEN) : next };
        }),

      addDailyCompletion: (date: string) =>
        set((state) => {
          if (state.dailyCompletedDates.includes(date)) return state;
          return { dailyCompletedDates: [...state.dailyCompletedDates, date] };
        }),

      getDailyStreak: () => computeDailyStreak(get().dailyCompletedDates),
    }),
    {
      name: "chess-arena-puzzles",
    },
  ),
);
