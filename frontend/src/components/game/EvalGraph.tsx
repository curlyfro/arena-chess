import { memo, useCallback, useRef, useState } from "react";
import type { EvalScore } from "@/types/engine";

interface EvalGraphProps {
  readonly evals: readonly EvalScore[];
  readonly currentIndex: number | null;
  readonly totalMoves: number;
  readonly onSelectMove: (moveIndex: number) => void;
}

function cpToWinProbability(cp: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * cp));
}

function evalToY(ev: EvalScore, height: number, showWinChances: boolean): number {
  if (showWinChances) {
    const prob = ev.type === "mate"
      ? (ev.value > 0 ? 1 : 0)
      : cpToWinProbability(ev.value);
    return height - prob * height;
  }
  // Centipawn view: clamp to ±500cp
  const cp = ev.type === "mate"
    ? (ev.value > 0 ? 500 : -500)
    : Math.max(-500, Math.min(500, ev.value));
  return height / 2 - (cp / 500) * (height / 2);
}

const WIDTH = 264;
const HEIGHT = 100;
const PAD = 2;

export const EvalGraph = memo(function EvalGraph({
  evals,
  currentIndex,
  totalMoves,
  onSelectMove,
}: EvalGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showWinChances, setShowWinChances] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || totalMoves === 0) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const moveIdx = Math.round(ratio * (totalMoves - 1));
      onSelectMove(Math.max(0, Math.min(totalMoves - 1, moveIdx)));
    },
    [totalMoves, onSelectMove],
  );

  if (evals.length < 2) return null;

  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  const midY = PAD + innerH / 2;

  // Build points for the eval curve
  // evals[0] = starting position, evals[i+1] = after move i
  // We plot totalMoves points (one per move), using evals[1..totalMoves]
  const points: string[] = [];
  for (let i = 0; i < totalMoves; i++) {
    const ev = evals[i + 1];
    if (!ev) break;
    const x = PAD + (totalMoves > 1 ? (i / (totalMoves - 1)) * innerW : innerW / 2);
    const y = evalToY(ev, innerH, showWinChances) + PAD;
    points.push(`${x},${y}`);
  }

  const polylinePoints = points.join(" ");

  // Area fill: white advantage above center, black below
  const areaAbove = `${PAD},${midY} ${points.join(" ")} ${PAD + innerW},${midY}`;

  // Current position indicator
  const indicatorX = currentIndex != null && totalMoves > 1
    ? PAD + (currentIndex / (totalMoves - 1)) * innerW
    : null;

  return (
    <div className="rounded-lg bg-muted p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase">Evaluation</span>
        <button
          onClick={() => setShowWinChances((p) => !p)}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          {showWinChances ? "cp" : "%"}
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full cursor-pointer"
        style={{ height: "100px" }}
        onClick={handleClick}
      >
        {/* Background */}
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="fill-zinc-900" rx={4} />

        {/* Center line (equal position) */}
        <line
          x1={PAD} y1={midY} x2={WIDTH - PAD} y2={midY}
          stroke="rgba(255,255,255,0.15)" strokeWidth={1}
        />

        {/* Area fill for white advantage */}
        <polygon
          points={areaAbove}
          fill="rgba(255,255,255,0.08)"
        />

        {/* Eval curve */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Move classification markers */}
        {points.map((pt, i) => {
          const ev = evals[i + 1];
          const prevEv = evals[i];
          if (!ev || !prevEv || ev.type === "mate" || prevEv.type === "mate") return null;
          const isWhite = (i + 1) % 2 === 1;
          const cpLoss = isWhite
            ? Math.max(0, prevEv.value - ev.value)
            : Math.max(0, ev.value - prevEv.value);
          if (cpLoss < 100) return null; // Only show mistakes and blunders
          const [cx, cy] = pt.split(",").map(Number);
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={3}
              fill={cpLoss >= 200 ? "#ef4444" : "#f97316"}
              stroke="rgba(0,0,0,0.5)" strokeWidth={0.5}
            />
          );
        })}

        {/* Current position indicator */}
        {indicatorX != null && (
          <line
            x1={indicatorX} y1={PAD} x2={indicatorX} y2={HEIGHT - PAD}
            stroke="rgba(255,255,255,0.5)" strokeWidth={1.5}
            strokeDasharray="3,2"
          />
        )}
      </svg>
    </div>
  );
});
