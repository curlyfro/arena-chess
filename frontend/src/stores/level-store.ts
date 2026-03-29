import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeLevel } from "@/constants/xp-config";

interface LevelState {
  totalXp: number;
  pendingXpGain: number;
  pendingLevelUp: boolean;
  addXp: (amount: number) => void;
  clearPendingXp: () => void;
  getLevel: () => ReturnType<typeof computeLevel>;
}

export const useLevelStore = create<LevelState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      pendingXpGain: 0,
      pendingLevelUp: false,

      addXp: (amount: number) => {
        const oldLevel = computeLevel(get().totalXp).level;
        const newTotal = get().totalXp + amount;
        const newLevel = computeLevel(newTotal).level;
        set({
          totalXp: newTotal,
          pendingXpGain: amount,
          pendingLevelUp: newLevel > oldLevel,
        });
      },

      clearPendingXp: () =>
        set({ pendingXpGain: 0, pendingLevelUp: false }),

      getLevel: () => computeLevel(get().totalXp),
    }),
    {
      name: "chess-arena-level",
      version: 1,
      partialize: (state) => ({ totalXp: state.totalXp }),
    },
  ),
);
