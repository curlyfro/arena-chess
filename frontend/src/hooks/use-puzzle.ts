import { useCallback, useEffect, useRef, useState } from "react";
import { useChessGame } from "./use-chess-game";
import type { Puzzle } from "@/lib/puzzles";
import { getPuzzleNearRating } from "@/lib/puzzles";
import { usePuzzleStore } from "@/stores/puzzle-store";
import { parseUciMove } from "@/lib/uci";
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
  readonly showSolution: () => void;
  readonly solutionShown: boolean;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly puzzleRating: number;
  readonly totalSolved: number;
}

export function usePuzzle(): UsePuzzleReturn {
  const puzzleRating = usePuzzleStore((s) => s.puzzleRating);
  const currentStreak = usePuzzleStore((s) => s.currentStreak);
  const bestStreak = usePuzzleStore((s) => s.bestStreak);
  const totalSolved = usePuzzleStore((s) => s.totalSolved);
  const recordCorrect = usePuzzleStore((s) => s.recordCorrect);
  const recordIncorrect = usePuzzleStore((s) => s.recordIncorrect);

  const [puzzle, setPuzzle] = useState<Puzzle>(() => getPuzzleNearRating(puzzleRating));
  const [status, setStatus] = useState<PuzzleStatus>("playing");
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [solutionShown, setSolutionShown] = useState(false);
  const resultRecordedRef = useRef(false);

  const game = useChessGame(puzzle.fen);
  // moveIndex tracks which move in the solution we're expecting next
  // moves[0] = setup move (opponent), moves[1] = player's first move, etc.
  const moveIndexRef = useRef(1); // Start at 1 — setup move is played automatically
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const setupPlayedRef = useRef(false);

  // Player color is OPPOSITE of whose turn it is in the FEN
  // (the FEN side plays the setup move, then the player responds)
  const fenTurn = puzzle.fen.split(" ")[1] as PieceColor;
  const playerColor: PieceColor = fenTurn === "w" ? "b" : "w";

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Play the setup move (moves[0]) automatically after puzzle loads
  useEffect(() => {
    if (setupPlayedRef.current) return;
    if (puzzle.moves.length === 0) return;

    setupPlayedRef.current = true;
    timerRef.current = setTimeout(() => {
      const setupMove = parseUciMove(puzzle.moves[0]);
      const result = game.makeMove(setupMove);
      if (result) {
        setLastMove({ from: result.from as Square, to: result.to as Square });
      }
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  const playOpponentResponse = useCallback(
    (moveIdx: number) => {
      const opponentUci = puzzle.moves[moveIdx];
      if (!opponentUci) return;

      timerRef.current = setTimeout(() => {
        const opMove = parseUciMove(opponentUci);
        const result = game.makeMove(opMove);
        if (result) {
          setLastMove({ from: result.from as Square, to: result.to as Square });
        }
        moveIndexRef.current = moveIdx + 1;

        if (moveIdx + 1 >= puzzle.moves.length) {
          setStatus("correct");
          if (!resultRecordedRef.current) {
            resultRecordedRef.current = true;
            recordCorrect(puzzle.rating);
          }
        }
      }, 400);
    },
    [puzzle.moves, game.makeMove],
  );

  const tryMove = useCallback(
    (move: ChessMove): boolean => {
      if (status !== "playing") return false;

      const expectedUci = puzzle.moves[moveIndexRef.current];
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;

      if (uci !== expectedUci) {
        const result = game.makeMove(move);
        if (!result) return false;
        setLastMove({ from: result.from as Square, to: result.to as Square });
        setStatus("incorrect");
        if (!resultRecordedRef.current) {
          resultRecordedRef.current = true;
          recordIncorrect();
        }
        return true;
      }

      const result = game.makeMove(move);
      if (!result) return false;
      setLastMove({ from: result.from as Square, to: result.to as Square });
      moveIndexRef.current++;

      if (moveIndexRef.current >= puzzle.moves.length) {
        setStatus("correct");
        if (!resultRecordedRef.current) {
          resultRecordedRef.current = true;
          recordCorrect(puzzle.rating);
        }
        return true;
      }

      // Play opponent's next response
      playOpponentResponse(moveIndexRef.current);
      return true;
    },
    [status, puzzle.moves, game.makeMove, playOpponentResponse],
  );

  const loadPuzzle = useCallback(
    (p: Puzzle) => {
      clearTimer();
      setPuzzle(p);
      game.reset(p.fen);
      moveIndexRef.current = 1;
      setupPlayedRef.current = false;
      resultRecordedRef.current = false;
      setStatus("playing");
      setLastMove(null);
      setSolutionShown(false);
    },
    [clearTimer, game.reset],
  );

  const nextPuzzle = useCallback(() => {
    const rating = usePuzzleStore.getState().puzzleRating;
    loadPuzzle(getPuzzleNearRating(rating, puzzle.id));
  }, [puzzle.id, loadPuzzle]);

  const retryPuzzle = useCallback(() => {
    loadPuzzle(puzzle);
  }, [puzzle, loadPuzzle]);

  const showSolution = useCallback(() => {
    if (status !== "incorrect" || solutionShown) return;
    setSolutionShown(true);

    // Reset and replay the correct solution moves with animation
    game.reset(puzzle.fen);
    setLastMove(null);

    let step = 0;
    const playNext = () => {
      if (step >= puzzle.moves.length) return;
      const uci = puzzle.moves[step];
      const move = parseUciMove(uci);
      const result = game.makeMove(move);
      if (result) {
        setLastMove({ from: result.from as Square, to: result.to as Square });
      }
      step++;
      if (step < puzzle.moves.length) {
        timerRef.current = setTimeout(playNext, 800);
      }
    };

    // Start with a small delay
    timerRef.current = setTimeout(playNext, 400);
  }, [status, solutionShown, puzzle, game.reset, game.makeMove]);

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
    showSolution,
    solutionShown,
    currentStreak,
    bestStreak,
    puzzleRating,
    totalSolved,
  };
}
