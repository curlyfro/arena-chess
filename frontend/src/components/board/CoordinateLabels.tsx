import { memo } from "react";
import { FILES, RANKS } from "@/types/chess";

interface CoordinateLabelsProps {
  readonly flipped: boolean;
  readonly lightColor: string;
  readonly darkColor: string;
}

export const CoordinateLabels = memo(function CoordinateLabels({
  flipped,
  lightColor,
  darkColor,
}: CoordinateLabelsProps) {
  const elements: React.ReactElement[] = [];
  const fontSize = 12;
  const padding = 4;

  // File labels (a-h) on bottom row
  for (let f = 0; f < 8; f++) {
    const displayFile = flipped ? 7 - f : f;
    const isLight = (displayFile + 0) % 2 === 0; // rank 1 (bottom)
    elements.push(
      <text
        key={`file-${f}`}
        x={f * 100 + 100 - padding}
        y={800 - padding}
        fontSize={fontSize}
        fontWeight="bold"
        textAnchor="end"
        fill={isLight ? darkColor : lightColor}
      >
        {FILES[displayFile]}
      </text>,
    );
  }

  // Rank labels (1-8) on left column
  for (let r = 0; r < 8; r++) {
    const displayRank = flipped ? r : 7 - r;
    const isLight = (0 + displayRank) % 2 === 0;
    elements.push(
      <text
        key={`rank-${r}`}
        x={padding}
        y={r * 100 + fontSize + padding}
        fontSize={fontSize}
        fontWeight="bold"
        textAnchor="start"
        fill={isLight ? darkColor : lightColor}
      >
        {RANKS[displayRank]}
      </text>,
    );
  }

  return <g>{elements}</g>;
});
