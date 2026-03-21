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
      width={SQUARE_SIZE}
      height={SQUARE_SIZE}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        opacity: isDragging ? 0.3 : 1,
        pointerEvents: "none",
      }}
    />
  );
});
