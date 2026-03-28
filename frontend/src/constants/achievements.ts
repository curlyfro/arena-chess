export interface AchievementDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: "games" | "puzzles" | "rating" | "tutorials";
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // Games
  { id: "first-win", name: "First Victory", description: "Win your first game", icon: "\u2654", category: "games" },
  { id: "win-as-black", name: "Dark Side", description: "Win a game as black", icon: "\u265A", category: "games" },
  { id: "beat-l1", name: "Baby Steps", description: "Beat AI Level 1", icon: "1", category: "games" },
  { id: "beat-l3", name: "Getting Serious", description: "Beat AI Level 3", icon: "3", category: "games" },
  { id: "beat-l5", name: "Contender", description: "Beat AI Level 5", icon: "5", category: "games" },
  { id: "beat-l8", name: "Giant Killer", description: "Beat AI Level 8", icon: "8", category: "games" },
  { id: "streak-5", name: "On Fire", description: "Win 5 games in a row", icon: "\u26A1", category: "games" },
  { id: "streak-10", name: "Unstoppable", description: "Win 10 games in a row", icon: "\u2B50", category: "games" },
  { id: "quick-win", name: "Blitz Finish", description: "Win in under 20 moves", icon: "\u23F1", category: "games" },
  { id: "flag-win", name: "Clock Master", description: "Win on time", icon: "\u231A", category: "games" },
  { id: "checkmate-win", name: "Checkmate!", description: "Win by checkmate", icon: "\u2654", category: "games" },

  // Puzzles
  { id: "puzzle-10", name: "Puzzle Beginner", description: "Solve 10 puzzles", icon: "\u2753", category: "puzzles" },
  { id: "puzzle-50", name: "Puzzle Enthusiast", description: "Solve 50 puzzles", icon: "\u2753", category: "puzzles" },
  { id: "puzzle-100", name: "Puzzle Master", description: "Solve 100 puzzles", icon: "\u2753", category: "puzzles" },
  { id: "puzzle-streak-5", name: "Sharp Mind", description: "5 puzzle streak", icon: "\u2734", category: "puzzles" },
  { id: "daily-3", name: "Consistent", description: "3-day daily puzzle streak", icon: "\u{1F4C5}", category: "puzzles" },
  { id: "daily-7", name: "Dedicated", description: "7-day daily puzzle streak", icon: "\u{1F4C5}", category: "puzzles" },

  // Rating
  { id: "elo-1200", name: "Club Player", description: "Reach 1200 rating", icon: "\u2191", category: "rating" },
  { id: "elo-1400", name: "Rising Star", description: "Reach 1400 rating", icon: "\u2191", category: "rating" },
  { id: "elo-1600", name: "Competitor", description: "Reach 1600 rating", icon: "\u2191", category: "rating" },
  { id: "elo-1800", name: "Expert", description: "Reach 1800 rating", icon: "\u2191", category: "rating" },
  { id: "elo-2000", name: "Master", description: "Reach 2000 rating", icon: "\u2191", category: "rating" },

  // Tutorials
  { id: "tutorial-first", name: "Student", description: "Complete your first tutorial", icon: "\uD83D\uDCD6", category: "tutorials" },
  { id: "tutorial-basics", name: "Fundamentals", description: "Complete all basic tutorials", icon: "\uD83D\uDCDA", category: "tutorials" },
  { id: "tutorial-all", name: "Scholar", description: "Complete all tutorials", icon: "\uD83C\uDF93", category: "tutorials" },
] as const;

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
