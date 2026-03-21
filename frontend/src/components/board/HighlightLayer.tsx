import { memo } from "react";
import type { Square, ChessMove, BoardTheme } from "@/types/chess";
import { squareToSvg, parseSquare, SQUARE_SIZE } from "@/lib/board-coordinates";

interface HighlightLayerProps {
  readonly lastMove: { from: Square; to: Square } | null;
  readonly selectedSquare: Square | null;
  readonly legalTargets: readonly Square[];
  readonly isCheck: boolean;
  readonly checkSquare: Square | null;
  readonly premove: ChessMove | null;
  readonly theme: BoardTheme;
  readonly flipped: boolean;
  readonly board: readonly (import("@/types/chess").BoardPiece | null)[][];
}

export const HighlightLayer = memo(function HighlightLayer({
  lastMove,
  selectedSquare,
  legalTargets,
  isCheck,
  checkSquare,
  premove,
  theme,
  flipped,
  board,
}: HighlightLayerProps) {
  const elements: React.ReactElement[] = [];
  const half = SQUARE_SIZE / 2;

  // Last move highlight
  if (lastMove) {
    for (const sq of [lastMove.from, lastMove.to]) {
      const pos = squareToSvg(sq, flipped);
      elements.push(
        <rect
          key={`last-${sq}`}
          x={pos.x}
          y={pos.y}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          fill={theme.highlightLastMove}
        />,
      );
    }
  }

  // Selected square highlight
  if (selectedSquare) {
    const pos = squareToSvg(selectedSquare, flipped);
    elements.push(
      <rect
        key="selected"
        x={pos.x}
        y={pos.y}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        fill={theme.highlightLastMove}
      />,
    );
  }

  // Legal move indicators
  for (const sq of legalTargets) {
    const pos = squareToSvg(sq, flipped);
    const { file, rank } = parseSquare(sq);
    const hasPiece = board[7 - rank]?.[file] != null;

    if (hasPiece) {
      elements.push(
        <circle
          key={`legal-${sq}`}
          cx={pos.x + half}
          cy={pos.y + half}
          r={46}
          fill="none"
          stroke={theme.highlightLegalMove}
          strokeWidth={8}
        />,
      );
    } else {
      elements.push(
        <circle
          key={`legal-${sq}`}
          cx={pos.x + half}
          cy={pos.y + half}
          r={16}
          fill={theme.highlightLegalMove}
        />,
      );
    }
  }

  // Check highlight
  if (isCheck && checkSquare) {
    const pos = squareToSvg(checkSquare, flipped);
    elements.push(
      <rect
        key="check"
        x={pos.x}
        y={pos.y}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        fill={theme.highlightCheck}
        className="animate-pulse"
      />,
    );
  }

  // Premove highlight
  if (premove) {
    for (const sq of [premove.from, premove.to]) {
      const pos = squareToSvg(sq, flipped);
      elements.push(
        <rect
          key={`premove-${sq}`}
          x={pos.x}
          y={pos.y}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          fill={theme.highlightPremove}
        />,
      );
    }
  }

  return <g>{elements}</g>;
});
