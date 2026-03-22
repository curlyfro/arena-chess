import type { EngineLevel } from "@/types/engine";

/**
 * 8 difficulty levels.
 * Levels 1-6 use UCI_LimitStrength + UCI_Elo for strength targeting.
 * Levels 7-8 play at full strength with Skill Level only.
 * blunderChance adds random move injection to weaken lower levels
 * (Stockfish's UCI_Elo floor is ~1300 regardless of setting).
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
    blunderChance: 0.45,
    description: "Total novice",
  },
  {
    level: 2,
    label: "Novice",
    skillLevel: 1,
    depth: 1,
    moveTimeMs: 100,
    artificialDelayMs: 600,
    elo: 600,
    limitStrength: true,
    blunderChance: 0.3,
    description: "Casual learner",
  },
  {
    level: 3,
    label: "Amateur",
    skillLevel: 3,
    depth: 2,
    moveTimeMs: 200,
    artificialDelayMs: 400,
    elo: 800,
    limitStrength: true,
    blunderChance: 0.15,
    description: "Knows the rules",
  },
  {
    level: 4,
    label: "Club Player",
    skillLevel: 5,
    depth: 4,
    moveTimeMs: 300,
    artificialDelayMs: 300,
    elo: 1000,
    limitStrength: true,
    blunderChance: 0.08,
    description: "Casual club",
  },
  {
    level: 5,
    label: "Intermediate",
    skillLevel: 8,
    depth: 6,
    moveTimeMs: 500,
    artificialDelayMs: 0,
    elo: 1200,
    limitStrength: true,
    blunderChance: 0,
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
    blunderChance: 0,
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
    blunderChance: 0,
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
    blunderChance: 0,
    description: "Expert/GM sparring",
  },
] as const;

export const AI_ELO_MAP: ReadonlyMap<number, number> = new Map(
  ENGINE_LEVELS.map((l) => [l.level, l.elo]),
);
