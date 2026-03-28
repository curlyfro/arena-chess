import { useCallback, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type {
  Square,
  PieceColor,
  AnnotatedMove,
  ChessMove,
  GameStatus,
  GameResult,
  BoardPiece,
} from "@/types/chess";
import { INITIAL_FEN } from "@/constants/chess";

function deriveStatus(chess: Chess, extraStatus?: GameStatus): GameStatus {
  if (extraStatus === "resigned" || extraStatus === "flagged") return extraStatus;
  if (extraStatus === "draw_agreement") return extraStatus;
  if (!chess.isGameOver()) return "active";
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isThreefoldRepetition()) return "draw_repetition";
  if (chess.isInsufficientMaterial()) return "draw_insufficient";
  if (chess.isDraw()) return "draw_50move";
  return "active";
}

function deriveResult(
  chess: Chess,
  status: GameStatus,
  flaggedOrResignedColor?: PieceColor,
): GameResult {
  switch (status) {
    case "checkmate":
      return chess.turn() === "w" ? "0-1" : "1-0";
    case "resigned":
      return flaggedOrResignedColor === "w" ? "0-1" : "1-0";
    case "flagged":
      return flaggedOrResignedColor === "w" ? "0-1" : "1-0";
    case "stalemate":
    case "draw_repetition":
    case "draw_insufficient":
    case "draw_50move":
    case "draw_agreement":
      return "1/2-1/2";
    default:
      return "*";
  }
}

export interface UseChessGameReturn {
  readonly fen: string;
  readonly turn: PieceColor;
  readonly history: readonly AnnotatedMove[];
  readonly status: GameStatus;
  readonly result: GameResult;
  readonly isCheck: boolean;
  readonly isGameOver: boolean;
  readonly legalMoves: readonly ChessMove[];
  readonly getLegalMovesForSquare: (square: Square) => readonly ChessMove[];
  readonly makeMove: (move: ChessMove) => AnnotatedMove | null;
  readonly undo: (count?: number) => void;
  readonly resign: (playerColor: PieceColor) => void;
  readonly agreeDraw: () => void;
  readonly setFlagged: (flaggedColor: PieceColor) => void;
  readonly reset: (fen?: string) => void;
  readonly pgn: () => string;
  readonly board: readonly (BoardPiece | null)[][];
}

function buildChess(
  initialFen?: string,
  initialHistory?: readonly AnnotatedMove[],
): Chess {
  // When restoring a game with history, replay moves from the initial position
  // so chess.js has the full game and generates correct PGN (no SetUp/FEN headers).
  if (initialHistory && initialHistory.length > 0) {
    const c = new Chess(INITIAL_FEN);
    for (const move of initialHistory) {
      const result = c.move({ from: move.from, to: move.to, promotion: move.promotion });
      if (!result) break;
    }
    return c;
  }
  return new Chess(initialFen ?? INITIAL_FEN);
}

export function useChessGame(
  initialFen?: string,
  initialHistory?: readonly AnnotatedMove[],
  initialStatus?: GameStatus,
  initialTerminatingColor?: PieceColor,
): UseChessGameReturn {
  const chessRef = useRef(buildChess(initialFen, initialHistory));
  const [version, setVersion] = useState(0);
  const [annotatedHistory, setAnnotatedHistory] = useState<AnnotatedMove[]>(
    initialHistory ? [...initialHistory] : [],
  );
  const [extraStatus, setExtraStatus] = useState<GameStatus | undefined>(
    initialStatus === "resigned" || initialStatus === "flagged" || initialStatus === "draw_agreement"
      ? initialStatus
      : undefined,
  );
  const [terminatingColor, setTerminatingColor] = useState<PieceColor | undefined>(initialTerminatingColor);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Read current chess instance — always use chessRef.current inside callbacks
  const chess = chessRef.current;
  const fen = chess.fen();
  const status = deriveStatus(chess, extraStatus);
  const result = deriveResult(chess, status, terminatingColor);
  const turn = chess.turn() as PieceColor;
  const isCheck = chess.isCheck();
  const isGameOver = status !== "idle" && status !== "active";

  const legalMoves = useMemo<readonly ChessMove[]>(() =>
    chessRef.current.moves({ verbose: true }).map((m) => ({
      from: m.from as Square,
      to: m.to as Square,
      promotion: m.promotion as ChessMove["promotion"],
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

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

  const makeMove = useCallback(
    (move: ChessMove): AnnotatedMove | null => {
      try {
        const c = chessRef.current;
        const moveResult = c.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });
        if (!moveResult) return null;

        const annotated: AnnotatedMove = {
          from: moveResult.from as Square,
          to: moveResult.to as Square,
          promotion: moveResult.promotion as ChessMove["promotion"],
          san: moveResult.san,
          fen: c.fen(),
          captured: moveResult.captured as AnnotatedMove["captured"],
          flags: moveResult.flags,
        };

        setAnnotatedHistory((prev) => [...prev, annotated]);
        bump();
        return annotated;
      } catch {
        return null;
      }
    },
    [bump],
  );

  const undo = useCallback(
    (count = 1) => {
      const c = chessRef.current;
      let undone = 0;
      for (let i = 0; i < count; i++) {
        const result = c.undo();
        if (!result) break;
        undone++;
      }
      if (undone > 0) {
        setAnnotatedHistory((prev) => prev.slice(0, -undone));
        setExtraStatus(undefined);
        setTerminatingColor(undefined);
        bump();
      }
    },
    [bump],
  );

  const resign = useCallback(
    (playerColor: PieceColor) => {
      setTerminatingColor(playerColor);
      setExtraStatus("resigned");
      bump();
    },
    [bump],
  );

  const agreeDraw = useCallback(() => {
    setExtraStatus("draw_agreement");
    bump();
  }, [bump]);

  const setFlagged = useCallback(
    (flaggedColor: PieceColor) => {
      setTerminatingColor(flaggedColor);
      setExtraStatus("flagged");
      bump();
    },
    [bump],
  );

  const reset = useCallback(
    (newFen?: string) => {
      chessRef.current = new Chess(newFen ?? INITIAL_FEN);
      setAnnotatedHistory([]);
      setExtraStatus(undefined);
      setTerminatingColor(undefined);
      bump();
    },
    [bump],
  );

  const pgn = useCallback(
    () => chessRef.current.pgn(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const board = useMemo<readonly (BoardPiece | null)[][]>(() =>
    chessRef.current.board().map((row) =>
      row.map((sq) =>
        sq ? ({ type: sq.type, color: sq.color } as BoardPiece) : null,
      ),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return {
    fen,
    turn,
    history: annotatedHistory,
    status,
    result,
    isCheck,
    isGameOver,
    legalMoves,
    getLegalMovesForSquare,
    makeMove,
    undo,
    resign,
    agreeDraw,
    setFlagged,
    reset,
    pgn,
    board,
  };
}
