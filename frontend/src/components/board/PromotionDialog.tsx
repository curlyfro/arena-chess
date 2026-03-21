import { useCallback, useEffect, useState } from "react";
import type { PromotionPiece, PieceColor, PieceSet } from "@/types/chess";
import { getPieceUrl } from "@/lib/piece-url";
import { SQUARE_SIZE, BOARD_SIZE } from "@/lib/board-coordinates";

interface PromotionDialogProps {
  readonly color: PieceColor;
  readonly x: number;
  readonly y: number;
  readonly pieceSet: PieceSet;
  readonly onSelect: (piece: PromotionPiece) => void;
  readonly onCancel: () => void;
}

const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

export function PromotionDialog({
  color,
  x,
  y,
  pieceSet,
  onSelect,
  onCancel,
}: PromotionDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(3, i + 1));
          break;
        case "Enter":
          e.preventDefault();
          onSelect(PROMOTION_PIECES[selectedIndex]);
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
      }
    },
    [onSelect, onCancel, selectedIndex],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // White promotes on rank 8 (top of board), show options downward
  const direction = color === "w" ? 1 : -1;

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={BOARD_SIZE}
        height={BOARD_SIZE}
        fill="rgba(0,0,0,0.3)"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onCancel}
      />
      {PROMOTION_PIECES.map((piece, i) => {
        const py = y + i * SQUARE_SIZE * direction;
        const isSelected = i === selectedIndex;
        return (
          <g
            key={piece}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSelect(piece); }}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={x}
              y={py}
              width={SQUARE_SIZE}
              height={SQUARE_SIZE}
              fill={isSelected ? "#e0e0ff" : "white"}
              stroke={isSelected ? "#4444ff" : "#333"}
              strokeWidth={isSelected ? 3 : 2}
              rx={4}
            />
            <image
              href={getPieceUrl(color, piece, pieceSet)}
              x={x}
              y={py}
              width={SQUARE_SIZE}
              height={SQUARE_SIZE}
            />
          </g>
        );
      })}
    </g>
  );
}
