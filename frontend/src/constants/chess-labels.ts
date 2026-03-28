import type { MoveClassification } from "@/types/chess";

export type TimeControl = "bullet" | "blitz" | "rapid";

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
};

export const TITLE_COLORS: Record<string, string> = {
  Grandmaster: "text-red-400",
  Master: "text-orange-400",
  CandidateMaster: "text-yellow-400",
  Expert: "text-purple-400",
  Advanced: "text-blue-400",
  Intermediate: "text-teal-400",
  ClubPlayer: "text-green-400",
  Beginner: "text-muted-foreground",
};

export function formatTitle(title: string): string {
  return title.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export const FAVORABLE_CLASSIFICATIONS: readonly MoveClassification[] = [
  "brilliant", "great", "best", "good",
];
