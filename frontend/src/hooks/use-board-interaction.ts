import { useCallback, useRef, useState } from "react";
import type {
  Square,
  PieceColor,
  ChessMove,
  BoardPiece,
  PromotionPiece,
} from "@/types/chess";

export interface UseBoardInteractionReturn {
  readonly selectedSquare: Square | null;
  readonly legalTargets: readonly Square[];
  readonly isDragging: boolean;
  readonly dragSquare: Square | null;
  readonly dragCursorX: number;
  readonly dragCursorY: number;
  readonly pendingPromotion: { from: Square; to: Square } | null;
  readonly handlePointerDown: (
    square: Square,
    piece: BoardPiece | null,
    svgX: number,
    svgY: number,
  ) => void;
  readonly handlePointerMove: (svgX: number, svgY: number) => void;
  readonly handlePointerUp: (square: Square | null) => void;
  readonly handlePromotionSelect: (piece: PromotionPiece) => void;
  readonly handlePromotionCancel: () => void;
  readonly clearSelection: () => void;
}

export function useBoardInteraction(
  playerColor: PieceColor,
  turn: PieceColor,
  isGameOver: boolean,
  getLegalMovesForSquare: (square: Square) => readonly ChessMove[],
  onMove: (move: ChessMove) => boolean,
  onPremove: (move: ChessMove) => void,
): UseBoardInteractionReturn {
  // ── State ──
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<readonly Square[]>([]);
  const [dragCursorX, setDragCursorX] = useState(0);
  const [dragCursorY, setDragCursorY] = useState(0);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const isDragging = useRef(false);
  const dragOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragSourceSquare = useRef<Square | null>(null);

  // ── Refs for latest props (stable callbacks read these) ──
  const playerColorRef = useRef(playerColor);
  playerColorRef.current = playerColor;
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;
  const getLegalMovesRef = useRef(getLegalMovesForSquare);
  getLegalMovesRef.current = getLegalMovesForSquare;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onPremoveRef = useRef(onPremove);
  onPremoveRef.current = onPremove;

  const isPlayerTurn = () =>
    turnRef.current === playerColorRef.current && !isGameOverRef.current;

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalTargets([]);
    isDragging.current = false;
    dragSourceSquare.current = null;
    setPendingPromotion(null);
  }, []);

  const computeTargets = useCallback((square: Square): Square[] => {
    if (!isPlayerTurn()) return [];
    return getLegalMovesRef.current(square).map((m) => m.to) as Square[];
  }, []);

  const executeMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece) => {
      if (!isPlayerTurn()) {
        onPremoveRef.current({ from, to, promotion });
        clearSelection();
        return;
      }

      // Check for promotion at execution time
      if (!promotion) {
        const moves = getLegalMovesRef.current(from);
        if (moves.some((m) => m.to === to && m.promotion != null)) {
          setPendingPromotion({ from, to });
          setSelectedSquare(null);
          setLegalTargets([]);
          isDragging.current = false;
          dragSourceSquare.current = null;
          return;
        }
      }

      // Validate and execute the move via chess.js
      const success = onMoveRef.current({ from, to, promotion });
      if (!success) {
        console.warn(`Move ${from}-${to} rejected by chess engine`);
      }
      clearSelection();
    },
    [clearSelection],
  );

  // ── Pointer handlers ──

  const handlePointerDown = useCallback(
    (square: Square, piece: BoardPiece | null, svgX: number, svgY: number) => {
      if (isGameOverRef.current) return;

      // If already selected and clicking a different square, try to move
      if (selectedSquare && selectedSquare !== square) {
        if (legalTargets.includes(square)) {
          executeMove(selectedSquare, square);
          return;
        }
      }

      // Click on a piece we can interact with
      const canInteract =
        piece &&
        (piece.color === playerColorRef.current || !isPlayerTurn());

      if (canInteract) {
        const targets = computeTargets(square);
        setSelectedSquare(square);
        setLegalTargets(targets);
        dragOrigin.current = { x: svgX, y: svgY };
        dragSourceSquare.current = square;
        isDragging.current = false;
        setDragCursorX(svgX);
        setDragCursorY(svgY);
        return;
      }

      // Click on a legal target while a piece is selected
      if (selectedSquare && legalTargets.includes(square)) {
        executeMove(selectedSquare, square);
        return;
      }

      // Click on nothing useful — deselect
      clearSelection();
    },
    [selectedSquare, legalTargets, computeTargets, executeMove, clearSelection],
  );

  const handlePointerMove = useCallback(
    (svgX: number, svgY: number) => {
      if (!dragSourceSquare.current) return;

      if (!isDragging.current) {
        const dx = svgX - dragOrigin.current.x;
        const dy = svgY - dragOrigin.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 4) {
          isDragging.current = true;
        }
      }

      if (isDragging.current) {
        setDragCursorX(svgX);
        setDragCursorY(svgY);
      }
    },
    [],
  );

  const handlePointerUp = useCallback(
    (targetSquare: Square | null) => {
      const source = dragSourceSquare.current;

      if (isDragging.current && source && targetSquare && targetSquare !== source) {
        // Dragged to a different square — try the move
        // Re-validate against current legal moves at drop time
        const currentTargets = computeTargets(source);
        if (currentTargets.includes(targetSquare) || !isPlayerTurn()) {
          executeMove(source, targetSquare);
        } else {
          clearSelection();
        }
        isDragging.current = false;
        dragSourceSquare.current = null;
        return;
      }

      // Not a drag (or dropped on same square) — keep selection for click-to-move
      isDragging.current = false;
      dragSourceSquare.current = null;
    },
    [computeTargets, executeMove, clearSelection],
  );

  const handlePromotionSelect = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) return;
      executeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    },
    [pendingPromotion, executeMove],
  );

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
    clearSelection();
  }, [clearSelection]);

  return {
    selectedSquare,
    legalTargets,
    isDragging: isDragging.current && dragSourceSquare.current != null,
    dragSquare: isDragging.current ? dragSourceSquare.current : null,
    dragCursorX,
    dragCursorY,
    pendingPromotion,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePromotionSelect,
    handlePromotionCancel,
    clearSelection,
  };
}
