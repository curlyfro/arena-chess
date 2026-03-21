import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useChessGame } from "../use-chess-game";

describe("useChessGame", () => {
  it("starts with initial position and active status after first move", () => {
    const { result } = renderHook(() => useChessGame());
    expect(result.current.turn).toBe("w");
    expect(result.current.status).toBe("active");
    expect(result.current.result).toBe("*");
    expect(result.current.isGameOver).toBe(false);
    expect(result.current.history).toHaveLength(0);
  });

  it("makes a legal move and returns annotated move", () => {
    const { result } = renderHook(() => useChessGame());

    let move: ReturnType<typeof result.current.makeMove>;
    act(() => {
      move = result.current.makeMove({ from: "e2", to: "e4" });
    });

    expect(move!).not.toBeNull();
    expect(move!.san).toBe("e4");
    expect(move!.from).toBe("e2");
    expect(move!.to).toBe("e4");
    expect(result.current.turn).toBe("b");
    expect(result.current.history).toHaveLength(1);
  });

  it("returns null for an illegal move", () => {
    const { result } = renderHook(() => useChessGame());

    let move: ReturnType<typeof result.current.makeMove>;
    act(() => {
      move = result.current.makeMove({ from: "e2", to: "e5" });
    });

    expect(move!).toBeNull();
    expect(result.current.history).toHaveLength(0);
  });

  it("detects checkmate", () => {
    const { result } = renderHook(() => useChessGame());

    // Scholar's mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#
    const moves = [
      { from: "e2", to: "e4" },
      { from: "e7", to: "e5" },
      { from: "f1", to: "c4" },
      { from: "b8", to: "c6" },
      { from: "d1", to: "h5" },
      { from: "g8", to: "f6" },
      { from: "h5", to: "f7" },
    ] as const;

    act(() => {
      for (const m of moves) {
        result.current.makeMove({ from: m.from, to: m.to });
      }
    });

    expect(result.current.status).toBe("checkmate");
    expect(result.current.result).toBe("1-0");
    expect(result.current.isGameOver).toBe(true);
  });

  it("handles resignation", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.makeMove({ from: "e2", to: "e4" });
    });

    act(() => {
      result.current.resign("w");
    });

    expect(result.current.status).toBe("resigned");
    expect(result.current.result).toBe("0-1");
    expect(result.current.isGameOver).toBe(true);
  });

  it("handles draw agreement", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.agreeDraw();
    });

    expect(result.current.status).toBe("draw_agreement");
    expect(result.current.result).toBe("1/2-1/2");
    expect(result.current.isGameOver).toBe(true);
  });

  it("handles flagging", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.setFlagged("b");
    });

    expect(result.current.status).toBe("flagged");
    expect(result.current.result).toBe("1-0"); // Black flagged, white wins
    expect(result.current.isGameOver).toBe(true);
  });

  it("resets the game", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.makeMove({ from: "e2", to: "e4" });
      result.current.makeMove({ from: "e7", to: "e5" });
    });

    expect(result.current.history).toHaveLength(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.history).toHaveLength(0);
    expect(result.current.turn).toBe("w");
    expect(result.current.status).toBe("active");
  });

  it("undoes moves", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.makeMove({ from: "e2", to: "e4" });
      result.current.makeMove({ from: "e7", to: "e5" });
    });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.turn).toBe("w");

    act(() => {
      result.current.undo(2);
    });

    expect(result.current.history).toHaveLength(0);
    expect(result.current.turn).toBe("w");
  });

  it("undoes a single move", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.makeMove({ from: "e2", to: "e4" });
      result.current.makeMove({ from: "e7", to: "e5" });
    });

    act(() => {
      result.current.undo(1);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.turn).toBe("b");
  });

  it("provides legal moves for a square", () => {
    const { result } = renderHook(() => useChessGame());

    const moves = result.current.getLegalMovesForSquare("e2");
    expect(moves).toHaveLength(2); // e3 and e4
    expect(moves.map((m) => m.to)).toContain("e3");
    expect(moves.map((m) => m.to)).toContain("e4");
  });

  it("detects check", () => {
    const { result } = renderHook(() => useChessGame());

    // Set up a position where black is in check
    act(() => {
      result.current.makeMove({ from: "e2", to: "e4" });
      result.current.makeMove({ from: "f7", to: "f6" });
      result.current.makeMove({ from: "d1", to: "h5" }); // Check!
    });

    expect(result.current.isCheck).toBe(true);
  });

  it("restores from initial FEN", () => {
    // Start from a custom position
    const customFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const { result } = renderHook(() => useChessGame(customFen));

    expect(result.current.turn).toBe("b");
    expect(result.current.fen).toBe(customFen);
  });

  it("tracks captured pieces in move annotations", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.makeMove({ from: "e2", to: "e4" });
      result.current.makeMove({ from: "d7", to: "d5" });
    });

    let capture: ReturnType<typeof result.current.makeMove>;
    act(() => {
      capture = result.current.makeMove({ from: "e4", to: "d5" });
    });

    expect(capture!).not.toBeNull();
    expect(capture!.captured).toBe("p");
    expect(capture!.san).toBe("exd5");
  });
});
