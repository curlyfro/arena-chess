import type { EvalScore } from "@/types/engine";

export function evalToPercent(evalScore: EvalScore | null): number {
  if (!evalScore) return 50;

  if (evalScore.type === "mate") {
    return evalScore.value > 0 ? 100 : 0;
  }

  // Clamp centipawns to ±1000 (±10 pawns) and map to 0-100
  const clamped = Math.max(-1000, Math.min(1000, evalScore.value));
  return 50 + (clamped / 1000) * 50;
}

export function evalToLabel(evalScore: EvalScore | null): string {
  if (!evalScore) return "0.0";

  if (evalScore.type === "mate") {
    return `M${Math.abs(evalScore.value)}`;
  }

  const pawns = evalScore.value / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(1)}`;
}
