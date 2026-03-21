import { memo, useMemo } from "react";
import type { BoardPiece, PieceSet } from "@/types/chess";
import { getPieceUrl } from "@/lib/piece-url";
import { SQUARE_SIZE } from "@/lib/board-coordinates";

interface PieceProps {
  readonly piece: BoardPiece;
  readonly x: number;
  readonly y: number;
  readonly pieceSet: PieceSet;
  readonly isDragging?: boolean;
}

const STYLE_NORMAL: React.CSSProperties = {
  opacity: 1,
  transition: "transform 120ms ease-out",
  pointerEvents: "none",
};

const STYLE_DRAGGING: React.CSSProperties = {
  opacity: 0.3,
  transition: "transform 120ms ease-out",
  pointerEvents: "none",
};

export const Piece = memo(function Piece({
  piece,
  x,
  y,
  pieceSet,
  isDragging,
}: PieceProps) {
  const href = useMemo(
    () => getPieceUrl(piece.color, piece.type, pieceSet),
    [piece.color, piece.type, pieceSet],
  );

  return (
    <image
      href={href}
      x={x}
      y={y}
      width={SQUARE_SIZE}
      height={SQUARE_SIZE}
      style={isDragging ? STYLE_DRAGGING : STYLE_NORMAL}
    />
  );
});
