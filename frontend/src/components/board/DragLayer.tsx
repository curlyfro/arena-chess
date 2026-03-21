import { memo } from "react";
import type { BoardPiece, PieceSet } from "@/types/chess";
import { getPieceUrl } from "@/lib/piece-url";

interface DragLayerProps {
  readonly piece: BoardPiece | null;
  readonly cursorX: number;
  readonly cursorY: number;
  readonly pieceSet: PieceSet;
}

const DRAG_SIZE = 110;
const DRAG_OFFSET = DRAG_SIZE / 2;

export const DragLayer = memo(function DragLayer({
  piece,
  cursorX,
  cursorY,
  pieceSet,
}: DragLayerProps) {
  if (!piece) return null;

  return (
    <image
      href={getPieceUrl(piece.color, piece.type, pieceSet)}
      x={cursorX - DRAG_OFFSET}
      y={cursorY - DRAG_OFFSET}
      width={DRAG_SIZE}
      height={DRAG_SIZE}
      style={{ pointerEvents: "none" }}
    />
  );
});
