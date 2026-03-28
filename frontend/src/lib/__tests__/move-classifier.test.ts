import { describe, it, expect } from "vitest";
import { classifyMove, classifyMoves, computePostGameStats } from "../move-classifier";
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

  it("classifies moves involving mate evaluations", () => {
    const evals: EvalScore[] = [
      { type: "cp", value: 500, depth: 14 },      // White is +5.0
      { type: "mate", value: -1, depth: 14 },      // White blundered into mate-in-1 for black
    ];

    const stats = computePostGameStats(evals);
    expect(stats.blunders).toBe(1);
  });

  it("classifies finding mate as best move", () => {
    const evals: EvalScore[] = [
      { type: "cp", value: 500, depth: 14 },       // Starting: White +5.0
      { type: "mate", value: 3, depth: 14 },        // White found mate-in-3 (great!)
    ];

    const stats = computePostGameStats(evals);
    expect(stats.blunders).toBe(0);
    expect(stats.mistakes).toBe(0);
    expect(stats.inaccuracies).toBe(0);
  });

  it("classifies losing forced mate as blunder", () => {
    // White had mate-in-2, then played a move that lost it
    const evals: EvalScore[] = [
      { type: "mate", value: 2, depth: 14 },       // White has mate-in-2
      { type: "cp", value: 200, depth: 14 },        // After white's move: lost forced mate, only +2.0
    ];

    const classifications = classifyMoves(evals);
    expect(classifications.get(0)).toBe("blunder");
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
