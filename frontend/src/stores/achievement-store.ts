import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AchievementStore {
  unlockedIds: string[];
  pendingToast: string | null;
  pendingCelebration: string | null;
  unlock: (id: string) => void;
  dismissToast: () => void;
  dismissCelebration: () => void;
}

export const useAchievementStore = create<AchievementStore>()(
  persist(
    (set, get) => ({
      unlockedIds: [],
      pendingToast: null,
      pendingCelebration: null,

      unlock: (id: string) => {
        if (get().unlockedIds.includes(id)) return;
        set((state) => ({
          unlockedIds: [...state.unlockedIds, id],
          pendingToast: id,
          pendingCelebration: id,
        }));
      },

      dismissToast: () => set({ pendingToast: null }),
      dismissCelebration: () => set({ pendingCelebration: null }),
    }),
    {
      name: "chess-arena-achievements",
      partialize: (state) => ({
        unlockedIds: state.unlockedIds,
      }),
    },
  ),
);
