import { memo } from "react";

interface ReplayControlsProps {
  readonly totalMoves: number;
  readonly currentIndex: number | null;
  readonly onGoToStart: () => void;
  readonly onGoBack: () => void;
  readonly onGoForward: () => void;
  readonly onGoToEnd: () => void;
}

export const ReplayControls = memo(function ReplayControls({
  totalMoves,
  currentIndex,
  onGoToStart,
  onGoBack,
  onGoForward,
  onGoToEnd,
}: ReplayControlsProps) {
  const atStart = currentIndex === 0;
  const atEnd = currentIndex == null;

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={onGoToStart}
        disabled={atStart || totalMoves === 0}
        aria-label="Go to start"
        className="rounded bg-muted px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ⏮
      </button>
      <button
        onClick={onGoBack}
        disabled={atStart || totalMoves === 0}
        aria-label="Previous move"
        className="rounded bg-muted px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ◀
      </button>
      <button
        onClick={onGoForward}
        disabled={atEnd || totalMoves === 0}
        aria-label="Next move"
        className="rounded bg-muted px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ▶
      </button>
      <button
        onClick={onGoToEnd}
        disabled={atEnd || totalMoves === 0}
        aria-label="Go to end"
        className="rounded bg-muted px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ⏭
      </button>
    </div>
  );
});
