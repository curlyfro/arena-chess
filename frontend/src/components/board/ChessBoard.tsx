import { useCallback, useEffect, useRef } from "react";
import type {
  Square as SquareType,
  PieceColor,
  ChessMove,
  BoardPiece,
  BoardTheme,
  PieceSet,
} from "@/types/chess";
import { FILES, RANKS } from "@/types/chess";
import { Square } from "./Square";
import { Piece } from "./Piece";
import { HighlightLayer } from "./HighlightLayer";
import { DragLayer } from "./DragLayer";
import { CoordinateLabels } from "./CoordinateLabels";
import { BestMoveArrow } from "./BestMoveArrow";
import { PromotionDialog } from "./PromotionDialog";
import { useBoardInteraction } from "@/hooks/use-board-interaction";

interface ChessBoardProps {
  readonly board: readonly (BoardPiece | null)[][];
  readonly turn: PieceColor;
  readonly playerColor: PieceColor;
  readonly isGameOver: boolean;
  readonly isCheck: boolean;
  readonly flipped: boolean;
  readonly theme: BoardTheme;
  readonly pieceSet: PieceSet;
  readonly showCoordinates: boolean;
  readonly lastMove: { from: SquareType; to: SquareType } | null;
  readonly premove: ChessMove | null;
  readonly bestMoveArrow: { from: SquareType; to: SquareType } | null;
  readonly getLegalMovesForSquare: (
    square: SquareType,
  ) => readonly ChessMove[];
  readonly onMove: (move: ChessMove) => boolean;
  readonly onPremove: (move: ChessMove) => void;
}

function squareFromFileRank(file: number, rank: number): SquareType {
  return `${FILES[file]}${RANKS[rank]}` as SquareType;
}

function findKingSquare(
  board: readonly (BoardPiece | null)[][],
  color: PieceColor,
): SquareType | null {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece?.type === "k" && piece.color === color) {
        return squareFromFileRank(f, 7 - r);
      }
    }
  }
  return null;
}

export function ChessBoard({
  board,
  turn,
  playerColor,
  isGameOver,
  isCheck,
  flipped,
  theme,
  pieceSet,
  showCoordinates,
  lastMove,
  premove,
  bestMoveArrow,
  getLegalMovesForSquare,
  onMove,
  onPremove,
}: ChessBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const interaction = useBoardInteraction(
    playerColor,
    turn,
    isGameOver,
    getLegalMovesForSquare,
    onMove,
    onPremove,
  );

  // Store interaction in ref so native event listeners always see latest
  const interactionRef = useRef(interaction);
  interactionRef.current = interaction;

  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;

  const boardRef = useRef(board);
  boardRef.current = board;

  const toSvgCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const scaleX = 800 / rect.width;
      const scaleY = 800 / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const squareFromSvg = useCallback(
    (svgX: number, svgY: number): SquareType | null => {
      const fileIdx = Math.floor(svgX / 100);
      const rankIdx = Math.floor(svgY / 100);
      if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7)
        return null;
      const fl = flippedRef.current;
      const file = fl ? 7 - fileIdx : fileIdx;
      const rank = fl ? rankIdx : 7 - rankIdx;
      return `${FILES[file]}${RANKS[rank]}` as SquareType;
    },
    [],
  );

  const getPieceAt = useCallback(
    (square: SquareType): BoardPiece | null => {
      const file = square.charCodeAt(0) - 97;
      const rank = parseInt(square[1]) - 1;
      return boardRef.current[7 - rank]?.[file] ?? null;
    },
    [],
  );

  // Attach native pointermove/pointerup to document so they work
  // regardless of pointer capture or cursor position
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const svg = toSvgCoords(e.clientX, e.clientY);
      interactionRef.current.handlePointerMove(svg.x, svg.y);
    };

    const onPointerUp = (e: PointerEvent) => {
      const svg = toSvgCoords(e.clientX, e.clientY);
      const square = squareFromSvg(svg.x, svg.y);
      interactionRef.current.handlePointerUp(square);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [toSvgCoords, squareFromSvg]);

  // Only pointerdown stays as a React event (on the SVG itself)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault();
      const svg = toSvgCoords(e.clientX, e.clientY);
      const square = squareFromSvg(svg.x, svg.y);
      if (!square) return;
      const piece = getPieceAt(square);
      interaction.handlePointerDown(square, piece, svg.x, svg.y);
    },
    [toSvgCoords, squareFromSvg, getPieceAt, interaction],
  );

  const checkSquare = isCheck ? findKingSquare(board, turn) : null;

  const squares: React.ReactElement[] = [];
  const pieces: React.ReactElement[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const displayFile = flipped ? 7 - col : col;
      const displayRank = flipped ? row : 7 - row;
      const isLight = (displayFile + displayRank) % 2 === 0;
      const x = col * 100;
      const y = row * 100;
      const square = squareFromFileRank(displayFile, displayRank);

      squares.push(
        <Square
          key={`sq-${square}`}
          x={x}
          y={y}
          isLight={isLight}
          lightColor={theme.lightSquare}
          darkColor={theme.darkSquare}
        />,
      );

      const piece = board[7 - displayRank]?.[displayFile];
      if (piece) {
        const isDragging = interaction.dragSquare === square;
        pieces.push(
          <Piece
            key={`pc-${square}`}
            piece={piece}
            x={x}
            y={y}
            pieceSet={pieceSet}
            isDragging={isDragging}
          />,
        );
      }
    }
  }

  const promotionSvgPos =
    interaction.pendingPromotion != null
      ? (() => {
          const file =
            interaction.pendingPromotion.to.charCodeAt(0) - 97;
          const rank =
            parseInt(interaction.pendingPromotion.to[1]) - 1;
          return {
            x: (flipped ? 7 - file : file) * 100,
            y: (flipped ? rank : 7 - rank) * 100,
          };
        })()
      : null;

  const dragPiece = interaction.dragSquare
    ? getPieceAt(interaction.dragSquare)
    : null;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 800"
      className="w-full max-w-[900px] min-w-[320px] select-none touch-none"
      onPointerDown={handlePointerDown}
      role="application"
      aria-label="Chess board"
    >
      {squares}

      <HighlightLayer
        lastMove={lastMove}
        selectedSquare={interaction.selectedSquare}
        legalTargets={interaction.legalTargets}
        isCheck={isCheck}
        checkSquare={checkSquare}
        premove={premove}
        theme={theme}
        flipped={flipped}
        board={board}
      />

      {showCoordinates && (
        <CoordinateLabels
          flipped={flipped}
          lightColor={theme.lightSquare}
          darkColor={theme.darkSquare}
        />
      )}

      {pieces}

      {bestMoveArrow && (
        <BestMoveArrow
          from={bestMoveArrow.from}
          to={bestMoveArrow.to}
          flipped={flipped}
        />
      )}

      <DragLayer
        piece={dragPiece}
        cursorX={interaction.dragCursorX}
        cursorY={interaction.dragCursorY}
        pieceSet={pieceSet}
      />

      {interaction.pendingPromotion && promotionSvgPos && (
        <PromotionDialog
          color={playerColor}
          x={promotionSvgPos.x}
          y={promotionSvgPos.y}
          pieceSet={pieceSet}
          onSelect={interaction.handlePromotionSelect}
          onCancel={interaction.handlePromotionCancel}
        />
      )}
    </svg>
  );
}
