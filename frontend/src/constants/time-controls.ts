import type { TimeControlPreset } from "@/types/clock";

export const TIME_CONTROLS: readonly TimeControlPreset[] = [
  // Bullet
  {
    id: "bullet-1-0",
    label: "1+0",
    category: "bullet",
    initialMs: 1 * 60 * 1000,
    incrementMs: 0,
  },
  // Blitz
  {
    id: "blitz-5-0",
    label: "5+0",
    category: "blitz",
    initialMs: 5 * 60 * 1000,
    incrementMs: 0,
  },
  {
    id: "blitz-5-3",
    label: "5+3",
    category: "blitz",
    initialMs: 5 * 60 * 1000,
    incrementMs: 3 * 1000,
  },
  // Rapid
  {
    id: "rapid-15-10",
    label: "15+10",
    category: "rapid",
    initialMs: 15 * 60 * 1000,
    incrementMs: 10 * 1000,
  },
] as const;

export const DEFAULT_TIME_CONTROL = TIME_CONTROLS[2]; // 5+3 Blitz
