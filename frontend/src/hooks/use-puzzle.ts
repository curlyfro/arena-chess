import { useCallback, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Puzzle } from "@/lib/puzzles";
import { getRandomPuzzle } from "@/lib/puzzles";
import type { Square, PieceColor, BoardPiece, ChessMove } from "@/types/chess";

export type PuzzleStatus = "loading" | "playing" | "correct" | "incorrect";

export interface UsePuzzleReturn {
  readonly puzzle: Puzzle;
  readonly board: readonly (BoardPiece | null)[][];
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

function boardFromChess(chess: Chess): readonly (BoardPiece | null)[][] {
  return chess.board().map((row) =>
    row.map((sq) =>
      sq ? ({ type: sq.type, color: sq.color } as BoardPiece) : null,
    ),
  );
}

export function usePuzzle(): UsePuzzleReturn {
  const [puzzle, setPuzzle] = useState<Puzzle>(getRandomPuzzle);
  const [status, setStatus] = useState<PuzzleStatus>("playing");
  const [version, setVersion] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const chessRef = useRef(new Chess(puzzle.fen));
  const moveIndexRef = useRef(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const chess = chessRef.current;
  const turn = chess.turn() as PieceColor;
  const isCheck = chess.isCheck();

  // Player plays as the side that moves after the setup position
  // The FEN tells us whose turn it is — that's the side that makes the first move
  const playerColor = (new Chess(puzzle.fen).turn() === "w" ? "w" : "b") as PieceColor;

  const board = boardFromChess(chess);

  const getLegalMovesForSquare = useCallback(
    (square: Square): readonly ChessMove[] =>
      chessRef.current.moves({ square, verbose: true }).map((m) => ({
        from: m.from as Square,
        to: m.to as Square,
        promotion: m.promotion as ChessMove["promotion"],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const tryMove = useCallback(
    (move: ChessMove): boolean => {
      if (status !== "playing") return false;

      const result = chessRef.current.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      if (!result) return false;

      const uciMove = `${result.from}${result.to}${result.promotion ?? ""}`;
      const expectedMove = puzzle.moves[moveIndexRef.current];

      setLastMove({ from: result.from as Square, to: result.to as Square });

      if (uciMove !== expectedMove) {
        setStatus("incorrect");
        bump();
        return true;
      }

      moveIndexRef.current++;

      // Check if puzzle is complete
      if (moveIndexRef.current >= puzzle.moves.length) {
        setStatus("correct");
        bump();
        return true;
      }

      // Play the opponent's response after a short delay
      const opponentMove = puzzle.moves[moveIndexRef.current];
      if (opponentMove) {
        setTimeout(() => {
          const from = opponentMove.slice(0, 2);
          const to = opponentMove.slice(2, 4);
          const promotion = opponentMove.length > 4 ? opponentMove[4] : undefined;
          chessRef.current.move({ from, to, promotion });
          moveIndexRef.current++;
          setLastMove({ from: from as Square, to: to as Square });
          bump();
        }, 400);
      }

      bump();
      return true;
    },
    [status, puzzle.moves, bump],
  );

  const loadPuzzle = useCallback((p: Puzzle) => {
    setPuzzle(p);
    chessRef.current = new Chess(p.fen);
    moveIndexRef.current = 0;
    setStatus("playing");
    setLastMove(null);
    setVersion((v) => v + 1);
  }, []);

  const nextPuzzle = useCallback(() => {
    loadPuzzle(getRandomPuzzle(puzzle.id));
  }, [puzzle.id, loadPuzzle]);

  const retryPuzzle = useCallback(() => {
    loadPuzzle(puzzle);
  }, [puzzle, loadPuzzle]);

  return {
    puzzle,
    board,
    turn,
    playerColor,
    status,
    lastMove,
    isCheck,
    getLegalMovesForSquare,
    tryMove,
    nextPuzzle,
    retryPuzzle,
  };
}
