import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useLevelStore } from "./level-store";
import { getLessonsForCategory, TUTORIAL_LESSONS } from "@/constants/tutorial-lessons";
import type { TutorialCategory } from "@/types/tutorial";

interface TutorialStore {
  completedLessons: string[];
  lessonProgress: Record<string, number>;
  completeLesson: (lessonId: string, xpReward: number) => void;
  setLessonProgress: (lessonId: string, stepIndex: number) => void;
  isLessonCompleted: (lessonId: string) => boolean;
  getCategoryProgress: (category: TutorialCategory) => { completed: number; total: number };
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      completedLessons: [],
      lessonProgress: {},

      completeLesson: (lessonId: string, xpReward: number) => {
        const state = get();
        if (state.completedLessons.includes(lessonId)) return;
        set({ completedLessons: [...state.completedLessons, lessonId] });
        useLevelStore.getState().addXp(xpReward);
      },

      setLessonProgress: (lessonId: string, stepIndex: number) => {
        const state = get();
        const current = state.lessonProgress[lessonId] ?? -1;
        if (stepIndex > current) {
          set({ lessonProgress: { ...state.lessonProgress, [lessonId]: stepIndex } });
        }
      },

      isLessonCompleted: (lessonId: string) => {
        return get().completedLessons.includes(lessonId);
      },

      getCategoryProgress: (category: TutorialCategory) => {
        const lessons = getLessonsForCategory(category);
        const completed = lessons.filter((l) => get().completedLessons.includes(l.id)).length;
        return { completed, total: lessons.length };
      },
    }),
    {
      name: "chess-arena-tutorials",
    },
  ),
);

export function getTotalLessonCount(): number {
  return TUTORIAL_LESSONS.length;
}

export function getCompletedLessonCount(): number {
  return useTutorialStore.getState().completedLessons.length;
}

export function areAllBasicsComplete(): boolean {
  const completed = useTutorialStore.getState().completedLessons;
  return getLessonsForCategory("basics").every((l) => completed.includes(l.id));
}

export function areAllLessonsComplete(): boolean {
  const completed = useTutorialStore.getState().completedLessons;
  return TUTORIAL_LESSONS.every((l) => completed.includes(l.id));
}
