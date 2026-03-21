import { memo } from "react";
import type { Square } from "@/types/chess";
import { squareToSvg, squareToSvgCenter, SQUARE_SIZE } from "@/lib/board-coordinates";

export interface UserArrow {
  readonly from: Square;
  readonly to: Square;
}

interface UserAnnotationLayerProps {
  readonly arrows: readonly UserArrow[];
  readonly highlights: readonly Square[];
  readonly flipped: boolean;
}

export const UserAnnotationLayer = memo(function UserAnnotationLayer({
  arrows,
  highlights,
  flipped,
}: UserAnnotationLayerProps) {
  if (arrows.length === 0 && highlights.length === 0) return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <marker
          id="user-arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(215, 85, 40, 0.8)" />
        </marker>
      </defs>

      {highlights.map((sq) => {
        const pos = squareToSvg(sq, flipped);
        return (
          <rect
            key={`hl-${sq}`}
            x={pos.x}
            y={pos.y}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            fill="rgba(215, 85, 40, 0.4)"
          />
        );
      })}

      {arrows.map((arrow) => {
        const start = squareToSvgCenter(arrow.from, flipped);
        const end = squareToSvgCenter(arrow.to, flipped);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;
        const shortenBy = 20;
        const endX = end.x - (dx / len) * shortenBy;
        const endY = end.y - (dy / len) * shortenBy;

        return (
          <line
            key={`ar-${arrow.from}-${arrow.to}`}
            x1={start.x}
            y1={start.y}
            x2={endX}
            y2={endY}
            stroke="rgba(215, 85, 40, 0.8)"
            strokeWidth={12}
            strokeLinecap="round"
            markerEnd="url(#user-arrowhead)"
          />
        );
      })}
    </g>
  );
});
