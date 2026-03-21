import type { EngineLevel } from "@/types/engine";

/**
 * 8 difficulty levels matching spec section 4.3.2.
 * Levels 1-6 use UCI_LimitStrength + UCI_Elo for accurate strength targeting.
 * Levels 7-8 play at full strength with Skill Level only.
 */
export const ENGINE_LEVELS: readonly EngineLevel[] = [
  {
    level: 1,
    label: "Beginner",
    skillLevel: 0,
    depth: 1,
    moveTimeMs: 50,
    artificialDelayMs: 800,
    elo: 400,
    limitStrength: true,
    description: "Total novice",
  },
  {
    level: 2,
    label: "Novice",
    skillLevel: 3,
    depth: 2,
    moveTimeMs: 100,
    artificialDelayMs: 600,
    elo: 600,
    limitStrength: true,
    description: "Casual learner",
  },
  {
    level: 3,
    label: "Amateur",
    skillLevel: 5,
    depth: 4,
    moveTimeMs: 200,
    artificialDelayMs: 400,
    elo: 800,
    limitStrength: true,
    description: "Knows the rules",
  },
  {
    level: 4,
    label: "Club Player",
    skillLevel: 8,
    depth: 6,
    moveTimeMs: 300,
    artificialDelayMs: 300,
    elo: 1000,
    limitStrength: true,
    description: "Casual club",
  },
  {
    level: 5,
    label: "Intermediate",
    skillLevel: 11,
    depth: 8,
    moveTimeMs: 500,
    artificialDelayMs: 0,
    elo: 1200,
    limitStrength: true,
    description: "Improving club",
  },
  {
    level: 6,
    label: "Advanced",
    skillLevel: 14,
    depth: 10,
    moveTimeMs: 750,
    artificialDelayMs: 0,
    elo: 1500,
    limitStrength: true,
    description: "Competitive club",
  },
  {
    level: 7,
    label: "Expert",
    skillLevel: 17,
    depth: 14,
    moveTimeMs: 1000,
    artificialDelayMs: 0,
    elo: 1800,
    limitStrength: false,
    description: "Tournament player",
  },
  {
    level: 8,
    label: "Master",
    skillLevel: 20,
    depth: 20,
    moveTimeMs: 2000,
    artificialDelayMs: 0,
    elo: 2500,
    limitStrength: false,
    description: "Expert/GM sparring",
  },
] as const;

export const AI_ELO_MAP: ReadonlyMap<number, number> = new Map(
  ENGINE_LEVELS.map((l) => [l.level, l.elo]),
);
