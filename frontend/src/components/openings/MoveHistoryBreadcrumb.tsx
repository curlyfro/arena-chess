import type { ExplorerMove } from "@/types/openings";

interface MoveHistoryBreadcrumbProps {
  readonly moves: readonly ExplorerMove[];
  readonly viewIndex: number; // -1 = at end
  readonly onGoToMove: (index: number) => void;
  readonly onGoToStart: () => void;
}

export function MoveHistoryBreadcrumb({
  moves,
  viewIndex,
  onGoToMove,
  onGoToStart,
}: MoveHistoryBreadcrumbProps) {
  const activeIndex = viewIndex >= 0 ? viewIndex : moves.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-lg bg-muted p-2 text-sm font-mono">
      <button
        onClick={onGoToStart}
        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-border"
      >
        Start
      </button>
      {moves.map((move, i) => {
        const isWhite = i % 2 === 0;
        const moveNum = Math.floor(i / 2) + 1;
        const isActive = i === activeIndex;

        return (
          <span key={`${i}-${move.san}`} className="flex items-center">
            {isWhite && (
              <span className="text-muted-foreground mr-0.5">{moveNum}.</span>
            )}
            <button
              onClick={() => onGoToMove(i)}
              className={`rounded px-1 py-0.5 ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-border"
              }`}
            >
              {move.san}
            </button>
          </span>
        );
      })}
      {moves.length === 0 && (
        <span className="text-muted-foreground">Starting position</span>
      )}
    </div>
  );
}
