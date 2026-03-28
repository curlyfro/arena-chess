import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useLevelStore } from "./level-store";
import {
  DAILY_CHALLENGE_POOL,
  WEEKLY_CHALLENGE_POOL,
  seededIndex,
  type ChallengeTemplate,
} from "@/constants/challenge-templates";

export interface ActiveChallenge {
  readonly templateId: string;
  readonly type: ChallengeTemplate["type"];
  readonly description: string;
  readonly target: number;
  readonly xpReward: number;
  progress: number;
  completed: boolean;
}

interface ChallengeStore {
  dailyChallenges: ActiveChallenge[];
  weeklyChallenges: ActiveChallenge[];
  lastDailyDate: string;
  lastWeeklyDate: string;

  /** Call on app mount / dashboard render to refresh challenges if needed. */
  refreshChallenges: () => void;

  /** Track game completion. */
  onGameComplete: (won: boolean, aiLevel: number, playerColor: "w" | "b") => void;

  /** Track puzzle solve. */
  onPuzzleSolved: () => void;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

function pickChallenges(
  pool: readonly ChallengeTemplate[],
  dateStr: string,
  count: number,
): ActiveChallenge[] {
  const picked: ActiveChallenge[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; picked.length < count && i < pool.length * 2; i++) {
    const idx = seededIndex(dateStr, pool, i);
    if (usedIndices.has(idx)) continue;
    usedIndices.add(idx);
    const t = pool[idx];
    picked.push({
      templateId: t.id,
      type: t.type,
      description: t.description,
      target: t.target,
      xpReward: t.xpReward,
      progress: 0,
      completed: false,
    });
  }
  return picked;
}

function incrementMatching(
  challenges: ActiveChallenge[],
  predicate: (c: ActiveChallenge) => boolean,
) {
  let xpEarned = 0;
  for (const c of challenges) {
    if (c.completed) continue;
    if (!predicate(c)) continue;
    c.progress = Math.min(c.progress + 1, c.target);
    if (c.progress >= c.target) {
      c.completed = true;
      xpEarned += c.xpReward;
    }
  }
  if (xpEarned > 0) {
    useLevelStore.getState().addXp(xpEarned);
  }
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    immer((set) => ({
      dailyChallenges: [],
      weeklyChallenges: [],
      lastDailyDate: "",
      lastWeeklyDate: "",

      refreshChallenges: () =>
        set((state) => {
          const today = getToday();
          const week = getWeekKey();
          if (state.lastDailyDate !== today) {
            state.dailyChallenges = pickChallenges(DAILY_CHALLENGE_POOL, today, 2);
            state.lastDailyDate = today;
          }
          if (state.lastWeeklyDate !== week) {
            state.weeklyChallenges = pickChallenges(WEEKLY_CHALLENGE_POOL, week, 1);
            state.lastWeeklyDate = week;
          }
        }),

      onGameComplete: (won, aiLevel, playerColor) =>
        set((state) => {
          // Mutate draft arrays directly — do NOT spread, or immer loses track
          const both = [state.dailyChallenges, state.weeklyChallenges];
          for (const arr of both) {
            incrementMatching(arr, (c) => c.type === "play-games");
            if (won) {
              incrementMatching(arr, (c) => c.type === "win-count");
              incrementMatching(arr, (c) => c.type === "beat-level" && aiLevel >= c.target);
              if (playerColor === "b") {
                incrementMatching(arr, (c) => c.type === "win-as-black");
              }
            }
          }
        }),

      onPuzzleSolved: () =>
        set((state) => {
          for (const arr of [state.dailyChallenges, state.weeklyChallenges]) {
            incrementMatching(arr, (c) => c.type === "solve-puzzles");
          }
        }),
    })),
    {
      name: "chess-arena-challenges",
      partialize: (state) => ({
        dailyChallenges: state.dailyChallenges,
        weeklyChallenges: state.weeklyChallenges,
        lastDailyDate: state.lastDailyDate,
        lastWeeklyDate: state.lastWeeklyDate,
      }),
    },
  ),
);
