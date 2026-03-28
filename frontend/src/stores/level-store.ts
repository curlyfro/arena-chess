import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeLevel } from "@/constants/xp-config";

interface LevelState {
  totalXp: number;
  addXp: (amount: number) => void;
  getLevel: () => ReturnType<typeof computeLevel>;
}

export const useLevelStore = create<LevelState>()(
  persist(
    (set, get) => ({
      totalXp: 0,

      addXp: (amount: number) =>
        set((state) => ({ totalXp: state.totalXp + amount })),

      getLevel: () => computeLevel(get().totalXp),
    }),
    {
      name: "chess-arena-level",
      version: 1,
    },
  ),
);
