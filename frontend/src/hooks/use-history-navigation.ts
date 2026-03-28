import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { AnnotatedMove, BoardPiece } from "@/types/chess";

export interface UseHistoryNavigationReturn {
  readonly viewingMoveIndex: number | null;
  readonly viewingBoard: readonly (BoardPiece | null)[][] | null;
  readonly handleSelectMove: (index: number) => void;
  readonly handleReturnToLive: () => void;
  readonly handleGoToStart: () => void;
  readonly handleGoBack: () => void;
  readonly handleGoForward: () => void;
  readonly setViewingMoveIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useHistoryNavigation(
  history: readonly AnnotatedMove[],
  isGameOver: boolean,
  fen: string,
  enabled: boolean,
  onFlipBoard?: () => void,
): UseHistoryNavigationReturn {
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);

  // Reset to live when new moves arrive during a game
  useEffect(() => {
    if (!isGameOver && viewingMoveIndex != null) {
      setViewingMoveIndex(null);
    }
  }, [fen, isGameOver, viewingMoveIndex]);

  const viewingBoard = useMemo<readonly (BoardPiece | null)[][] | null>(() => {
    if (viewingMoveIndex == null) return null;
    const move = history[viewingMoveIndex];
    if (!move) return null;
    const chess = new Chess(move.fen);
    return chess.board().map((row) =>
      row.map((sq) =>
        sq ? ({ type: sq.type, color: sq.color } as BoardPiece) : null,
      ),
    );
  }, [viewingMoveIndex, history]);

  const handleSelectMove = useCallback((index: number) => {
    setViewingMoveIndex(index);
  }, []);

  const handleReturnToLive = useCallback(() => {
    setViewingMoveIndex(null);
  }, []);

  const handleGoToStart = useCallback(() => {
    setViewingMoveIndex(0);
  }, []);

  const handleGoBack = useCallback(() => {
    setViewingMoveIndex((prev) => {
      const len = history.length;
      if (prev == null) return len - 2 >= 0 ? len - 2 : 0;
      return Math.max(0, prev - 1);
    });
  }, [history.length]);

  const handleGoForward = useCallback(() => {
    setViewingMoveIndex((prev) => {
      const len = history.length;
      if (prev == null) return null;
      if (prev >= len - 1) return null;
      return prev + 1;
    });
  }, [history.length]);

  // Stabilize callback ref so the keyboard listener doesn't re-attach
  const flipBoardRef = useRef(onFlipBoard);
  flipBoardRef.current = onFlipBoard;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const historyLen = history.length;
      if (historyLen === 0) return;

      switch (e.key) {
        case "ArrowLeft": {
          e.preventDefault();
          setViewingMoveIndex((prev) => {
            if (prev == null) return historyLen - 2 >= 0 ? historyLen - 2 : 0;
            return Math.max(0, prev - 1);
          });
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          setViewingMoveIndex((prev) => {
            if (prev == null) return null;
            if (prev >= historyLen - 1) return null;
            return prev + 1;
          });
          break;
        }
        case "Home": {
          e.preventDefault();
          setViewingMoveIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setViewingMoveIndex(null);
          break;
        }
        case "f": {
          if (!e.ctrlKey && !e.metaKey) {
            flipBoardRef.current?.();
          }
          break;
        }
        case "Escape": {
          setViewingMoveIndex(null);
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, history.length]);

  return {
    viewingMoveIndex,
    viewingBoard,
    handleSelectMove,
    handleReturnToLive,
    handleGoToStart,
    handleGoBack,
    handleGoForward,
    setViewingMoveIndex,
  };
}
