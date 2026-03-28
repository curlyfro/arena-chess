/** XP awarded per action */
export const XP_REWARDS = {
  gameComplete: 50,
  gameWin: 30,
  gameCheckmate: 10,
  puzzleSolve: 20,
  dailyPuzzle: 30,
  achievementUnlock: 100,
  tutorialLesson: 25,
} as const;

/**
 * XP required to reach a given level (cumulative from 0).
 * Each level needs progressively more XP.
 * Level 1 = 100, Level 5 ~= 800, Level 10 ~= 2600, Level 20 ~= 13500
 */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.round(100 * level * Math.pow(1.1, level));
}

/** Cumulative XP needed to complete a level (reach level+1) */
export function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/** Compute current level and progress from total XP */
export function computeLevel(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  let xpRemaining = totalXp;
  let level = 0;

  while (true) {
    const needed = xpForLevel(level + 1);
    if (xpRemaining < needed) {
      return {
        level,
        currentLevelXp: xpRemaining,
        nextLevelXp: needed,
        progress: needed > 0 ? xpRemaining / needed : 0,
      };
    }
    xpRemaining -= needed;
    level++;
  }
}
