import { memo } from "react";
import type { Square } from "@/types/chess";
import { squareToSvgCenter } from "@/lib/board-coordinates";

interface BestMoveArrowProps {
  readonly from: Square;
  readonly to: Square;
  readonly flipped: boolean;
}

export const BestMoveArrow = memo(function BestMoveArrow({
  from,
  to,
  flipped,
}: BestMoveArrowProps) {
  const start = squareToSvgCenter(from, flipped);
  const end = squareToSvgCenter(to, flipped);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const shortenBy = 20;
  const endX = end.x - (dx / len) * shortenBy;
  const endY = end.y - (dy / len) * shortenBy;

  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(0, 180, 80, 0.7)" />
        </marker>
      </defs>
      <line
        x1={start.x}
        y1={start.y}
        x2={endX}
        y2={endY}
        stroke="rgba(0, 180, 80, 0.7)"
        strokeWidth={12}
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
      />
    </g>
  );
});
