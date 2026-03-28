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

/** Shared classification colors used by MoveHistory, MoveStrip, and GameRecap. */
export const CLASSIFICATION_COLORS: Record<MoveClassification, { text: string; symbol: string }> = {
  brilliant:  { text: "text-blue-400",   symbol: "!!" },
  great:      { text: "text-teal-400",   symbol: "!" },
  best:       { text: "",                symbol: "" },
  good:       { text: "",                symbol: "" },
  inaccuracy: { text: "text-yellow-400", symbol: "?!" },
  mistake:    { text: "text-orange-400", symbol: "?" },
  blunder:    { text: "text-red-400",    symbol: "??" },
};
