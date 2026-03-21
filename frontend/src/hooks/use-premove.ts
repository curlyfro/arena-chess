import { useCallback, useState } from "react";
import type { ChessMove, AnnotatedMove } from "@/types/chess";
import type { Chess } from "chess.js";

export interface UsePremoveReturn {
  readonly premove: ChessMove | null;
  readonly setPremove: (move: ChessMove | null) => void;
  readonly tryExecutePremove: (
    chess: Chess,
    makeMove: (move: ChessMove) => AnnotatedMove | null,
  ) => AnnotatedMove | null;
  readonly clearPremove: () => void;
}

export function usePremove(): UsePremoveReturn {
  const [premove, setPremove] = useState<ChessMove | null>(null);

  const tryExecutePremove = useCallback(
    (
      chess: Chess,
      makeMove: (move: ChessMove) => AnnotatedMove | null,
    ): AnnotatedMove | null => {
      if (!premove) return null;

      // Check if the premove is legal in the current position
      const legalMoves = chess.moves({ verbose: true });
      const isLegal = legalMoves.some(
        (m) =>
          m.from === premove.from &&
          m.to === premove.to &&
          (premove.promotion == null || m.promotion === premove.promotion),
      );

      setPremove(null);

      if (!isLegal) return null;

      return makeMove(premove);
    },
    [premove],
  );

  const clearPremove = useCallback(() => {
    setPremove(null);
  }, []);

  return {
    premove,
    setPremove,
    tryExecutePremove,
    clearPremove,
  };
}
