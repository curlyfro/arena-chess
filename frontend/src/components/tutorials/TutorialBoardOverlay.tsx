import { memo } from "react";
import type { Square } from "@/types/chess";
import { squareToSvg, squareToSvgCenter, SQUARE_SIZE } from "@/lib/board-coordinates";

interface TutorialBoardOverlayProps {
  readonly highlights: readonly Square[];
  readonly arrows: readonly { readonly from: Square; readonly to: Square }[];
  readonly flipped: boolean;
}

export const TutorialBoardOverlay = memo(function TutorialBoardOverlay({
  highlights,
  arrows,
  flipped,
}: TutorialBoardOverlayProps) {
  if (highlights.length === 0 && arrows.length === 0) return null;

  return (
    <svg
      viewBox="0 0 800 800"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <marker
          id="tutorial-arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(74, 114, 145, 0.85)" />
        </marker>
      </defs>

      {highlights.map((sq) => {
        const pos = squareToSvg(sq, flipped);
        return (
          <rect
            key={`thl-${sq}`}
            x={pos.x}
            y={pos.y}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            fill="rgba(74, 114, 145, 0.4)"
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
            key={`tar-${arrow.from}-${arrow.to}`}
            x1={start.x}
            y1={start.y}
            x2={endX}
            y2={endY}
            stroke="rgba(74, 114, 145, 0.85)"
            strokeWidth={12}
            strokeLinecap="round"
            markerEnd="url(#tutorial-arrowhead)"
          />
        );
      })}
    </svg>
  );
});
