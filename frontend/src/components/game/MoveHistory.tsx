import { memo, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { AnnotatedMove } from "@/types/chess";

interface MoveHistoryProps {
  readonly history: readonly AnnotatedMove[];
}

interface MovePair {
  readonly moveNumber: number;
  readonly white: AnnotatedMove;
  readonly black?: AnnotatedMove;
}

function pairMoves(history: readonly AnnotatedMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    });
  }
  return pairs;
}

export const MoveHistory = memo(function MoveHistory({
  history,
}: MoveHistoryProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const pairs = pairMoves(history);

  const virtualizer = useVirtualizer({
    count: pairs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });

  // Auto-scroll to bottom on new moves
  useEffect(() => {
    if (pairs.length > 0) {
      virtualizer.scrollToIndex(pairs.length - 1, { align: "end" });
    }
  }, [pairs.length, virtualizer]);

  if (history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No moves yet
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto text-sm"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const pair = pairs[virtualRow.index];
          const isLast = virtualRow.index === pairs.length - 1;
          return (
            <div
              key={virtualRow.index}
              className="absolute left-0 top-0 flex w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <span className="w-8 shrink-0 text-right text-muted-foreground">
                {pair.moveNumber}.
              </span>
              <span
                className={`ml-2 w-20 shrink-0 cursor-pointer rounded px-1 hover:bg-muted ${
                  isLast && !pair.black ? "bg-accent/20" : ""
                }`}
              >
                {pair.white.san}
              </span>
              {pair.black && (
                <span
                  className={`ml-1 w-20 shrink-0 cursor-pointer rounded px-1 hover:bg-muted ${
                    isLast ? "bg-accent/20" : ""
                  }`}
                >
                  {pair.black.san}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
