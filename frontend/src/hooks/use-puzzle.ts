import { useCallback, useEffect, useRef, useState } from "react";
import { useChessGame } from "./use-chess-game";
import type { Puzzle } from "@/lib/puzzles";
import { getRandomPuzzle } from "@/lib/puzzles";
import type { Square, PieceColor, ChessMove } from "@/types/chess";

export type PuzzleStatus = "playing" | "correct" | "incorrect";

export interface UsePuzzleReturn {
  readonly puzzle: Puzzle;
  readonly board: ReturnType<typeof useChessGame>["board"];
  readonly turn: PieceColor;
  readonly playerColor: PieceColor;
  readonly status: PuzzleStatus;
  readonly lastMove: { from: Square; to: Square } | null;
  readonly isCheck: boolean;
  readonly getLegalMovesForSquare: (square: Square) => readonly ChessMove[];
  readonly tryMove: (move: ChessMove) => boolean;
  readonly nextPuzzle: () => void;
  readonly retryPuzzle: () => void;
}

export function usePuzzle(): UsePuzzleReturn {
  const [puzzle, setPuzzle] = useState<Puzzle>(getRandomPuzzle);
  const [status, setStatus] = useState<PuzzleStatus>("playing");
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const game = useChessGame(puzzle.fen);
  const moveIndexRef = useRef(0);
  const opponentTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Player color is determined by whose turn it is in the FEN
  const playerColor = (puzzle.fen.split(" ")[1] === "w" ? "w" : "b") as PieceColor;

  const clearOpponentTimer = useCallback(() => {
    clearTimeout(opponentTimerRef.current);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => clearOpponentTimer, [clearOpponentTimer]);

  const tryMove = useCallback(
    (move: ChessMove): boolean => {
      if (status !== "playing") return false;

      // Validate against expected move BEFORE executing
      const expectedMove = puzzle.moves[moveIndexRef.current];
      const uciMove = `${move.from}${move.to}${move.promotion ?? ""}`;

      if (uciMove !== expectedMove) {
        // Execute the wrong move so the player sees it, then mark incorrect
        const result = game.makeMove(move);
        if (!result) return false;
        setLastMove({ from: result.from as Square, to: result.to as Square });
        setStatus("incorrect");
        return true;
      }

      // Execute the correct move
      const result = game.makeMove(move);
      if (!result) return false;
      setLastMove({ from: result.from as Square, to: result.to as Square });
      moveIndexRef.current++;

      // Check if puzzle is complete
      if (moveIndexRef.current >= puzzle.moves.length) {
        setStatus("correct");
        return true;
      }

      // Play the opponent's response after a short delay
      const opponentMove = puzzle.moves[moveIndexRef.current];
      if (opponentMove) {
        opponentTimerRef.current = setTimeout(() => {
          const from = opponentMove.slice(0, 2);
          const to = opponentMove.slice(2, 4);
          const promotion = opponentMove.length > 4 ? opponentMove[4] : undefined;
          const opResult = game.makeMove({
            from: from as Square,
            to: to as Square,
            promotion: promotion as ChessMove["promotion"],
          });
          if (opResult) {
            setLastMove({ from: opResult.from as Square, to: opResult.to as Square });
          }
          moveIndexRef.current++;

          // Check again after opponent's move
          if (moveIndexRef.current >= puzzle.moves.length) {
            setStatus("correct");
          }
        }, 400);
      }

      return true;
    },
    [status, puzzle.moves, game.makeMove],
  );

  const loadPuzzle = useCallback(
    (p: Puzzle) => {
      clearOpponentTimer();
      setPuzzle(p);
      game.reset(p.fen);
      moveIndexRef.current = 0;
      setStatus("playing");
      setLastMove(null);
    },
    [clearOpponentTimer, game.reset],
  );

  const nextPuzzle = useCallback(() => {
    loadPuzzle(getRandomPuzzle(puzzle.id));
  }, [puzzle.id, loadPuzzle]);

  const retryPuzzle = useCallback(() => {
    loadPuzzle(puzzle);
  }, [puzzle, loadPuzzle]);

  return {
    puzzle,
    board: game.board,
    turn: game.turn,
    playerColor,
    status,
    lastMove,
    isCheck: game.isCheck,
    getLegalMovesForSquare: game.getLegalMovesForSquare,
    tryMove,
    nextPuzzle,
    retryPuzzle,
  };
}
