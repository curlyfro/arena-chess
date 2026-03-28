export interface ChallengeTemplate {
  readonly id: string;
  readonly type: "win-count" | "beat-level" | "solve-puzzles" | "play-games" | "win-as-black";
  readonly description: string;
  readonly target: number;
  readonly xpReward: number;
}

export const DAILY_CHALLENGE_POOL: readonly ChallengeTemplate[] = [
  { id: "win-2", type: "win-count", description: "Win 2 games", target: 2, xpReward: 40 },
  { id: "win-3", type: "win-count", description: "Win 3 games", target: 3, xpReward: 60 },
  { id: "beat-l3", type: "beat-level", description: "Beat AI Level 3+", target: 3, xpReward: 40 },
  { id: "beat-l5", type: "beat-level", description: "Beat AI Level 5+", target: 5, xpReward: 80 },
  { id: "solve-3", type: "solve-puzzles", description: "Solve 3 puzzles", target: 3, xpReward: 30 },
  { id: "solve-5", type: "solve-puzzles", description: "Solve 5 puzzles", target: 5, xpReward: 50 },
  { id: "play-3", type: "play-games", description: "Play 3 games", target: 3, xpReward: 30 },
  { id: "play-5", type: "play-games", description: "Play 5 games", target: 5, xpReward: 50 },
  { id: "win-black", type: "win-as-black", description: "Win a game as black", target: 1, xpReward: 40 },
] as const;

export const WEEKLY_CHALLENGE_POOL: readonly ChallengeTemplate[] = [
  { id: "win-10", type: "win-count", description: "Win 10 games", target: 10, xpReward: 150 },
  { id: "beat-l5-w", type: "beat-level", description: "Beat AI Level 5+", target: 5, xpReward: 120 },
  { id: "solve-15", type: "solve-puzzles", description: "Solve 15 puzzles", target: 15, xpReward: 100 },
  { id: "play-15", type: "play-games", description: "Play 15 games", target: 15, xpReward: 100 },
] as const;

/** Deterministic hash from a date string to pick challenges. */
export function seededIndex(dateStr: string, pool: readonly unknown[], offset = 0): number {
  let hash = 0;
  const key = dateStr + offset;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % pool.length;
}
