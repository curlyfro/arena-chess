import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PuzzleStore {
  puzzleRating: number;
  currentStreak: number;
  bestStreak: number;
  totalSolved: number;
  totalAttempted: number;

  recordCorrect: (puzzleRating: number) => void;
  recordIncorrect: () => void;
}

const K_FACTOR = 32;

export const usePuzzleStore = create<PuzzleStore>()(
  persist(
    (set) => ({
      puzzleRating: 1000,
      currentStreak: 0,
      bestStreak: 0,
      totalSolved: 0,
      totalAttempted: 0,

      recordCorrect: (puzzleRating: number) =>
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
        }),

      recordIncorrect: () =>
        set((state) => {
          const newRating = Math.round(state.puzzleRating - K_FACTOR * 0.5);
          return {
            puzzleRating: Math.max(400, newRating),
            currentStreak: 0,
            totalAttempted: state.totalAttempted + 1,
          };
        }),
    }),
    {
      name: "chess-arena-puzzles",
    },
  ),
);
