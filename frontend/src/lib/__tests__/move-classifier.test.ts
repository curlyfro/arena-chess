import { describe, it, expect } from "vitest";
import { classifyMove, computePostGameStats } from "../move-classifier";
import type { EvalScore } from "@/types/engine";

describe("classifyMove", () => {
  it("classifies best moves (< 20cp loss)", () => {
    expect(classifyMove(0)).toBe("best");
    expect(classifyMove(10)).toBe("best");
    expect(classifyMove(19)).toBe("best");
  });

  it("classifies good moves (20-49cp loss)", () => {
    expect(classifyMove(20)).toBe("good");
    expect(classifyMove(49)).toBe("good");
  });

  it("classifies inaccuracies (50-99cp loss)", () => {
    expect(classifyMove(50)).toBe("inaccuracy");
    expect(classifyMove(99)).toBe("inaccuracy");
  });

  it("classifies mistakes (100-199cp loss)", () => {
    expect(classifyMove(100)).toBe("mistake");
    expect(classifyMove(199)).toBe("mistake");
  });

  it("classifies blunders (200+cp loss)", () => {
    expect(classifyMove(200)).toBe("blunder");
    expect(classifyMove(500)).toBe("blunder");
  });
});

describe("computePostGameStats", () => {
  it("returns zero stats for empty eval history", () => {
    const stats = computePostGameStats([]);
    expect(stats.blunders).toBe(0);
    expect(stats.mistakes).toBe(0);
    expect(stats.inaccuracies).toBe(0);
    expect(stats.averageCentipawnLoss).toBe(0);
  });

  it("computes stats for a simple game", () => {
    const evals: EvalScore[] = [
      { type: "cp", value: 0, depth: 14 },   // Starting position
      { type: "cp", value: -10, depth: 14 },  // After white move 1 (10cp loss)
      { type: "cp", value: 0, depth: 14 },    // After black move 1 (10cp loss)
      { type: "cp", value: -50, depth: 14 },  // After white move 2 (50cp loss)
      { type: "cp", value: 100, depth: 14 },  // After black move 2 (150cp loss)
    ];

    const stats = computePostGameStats(evals);
    expect(stats.blunders).toBe(0);
    expect(stats.mistakes).toBe(1); // Black's 150cp loss
    expect(stats.inaccuracies).toBe(1); // White's 50cp loss
  });

  it("skips mate evaluations in cp loss calculation", () => {
    const evals: EvalScore[] = [
      { type: "cp", value: 0, depth: 14 },
      { type: "mate", value: 3, depth: 14 }, // Mate eval — skipped
      { type: "cp", value: 500, depth: 14 },
    ];

    const stats = computePostGameStats(evals);
    // Only one transition isn't skipped (mate → cp), but mate is involved so both are skipped
    expect(stats.blunders).toBe(0);
  });

  it("computes accuracy percentages", () => {
    const evals: EvalScore[] = [
      { type: "cp", value: 0, depth: 14 },
      { type: "cp", value: 0, depth: 14 }, // Perfect white move (0cp loss)
      { type: "cp", value: 0, depth: 14 }, // Perfect black move (0cp loss)
    ];

    const stats = computePostGameStats(evals);
    expect(stats.accuracy.white).toBeGreaterThan(99);
    expect(stats.accuracy.black).toBeGreaterThan(99);
  });
});
