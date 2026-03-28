import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingStore {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: "chess-arena-onboarding",
    },
  ),
);
