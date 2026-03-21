import { memo, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { AnnotatedMove, MoveClassification } from "@/types/chess";

interface MoveHistoryProps {
  readonly history: readonly AnnotatedMove[];
  readonly selectedMoveIndex?: number | null;
  readonly classifications?: ReadonlyMap<number, MoveClassification>;
  readonly onSelectMove?: (index: number) => void;
}

interface MovePair {
  readonly moveNumber: number;
  readonly white: AnnotatedMove;
  readonly black?: AnnotatedMove;
  readonly whiteIndex: number;
  readonly blackIndex?: number;
}

const CLASSIFICATION_INDICATORS: Record<MoveClassification, { symbol: string; className: string }> = {
  brilliant: { symbol: "!!", className: "text-blue-400" },
  great:     { symbol: "!",  className: "text-teal-400" },
  best:      { symbol: "",   className: "" },
  good:      { symbol: "",   className: "" },
  inaccuracy:{ symbol: "?!", className: "text-yellow-400" },
  mistake:   { symbol: "?",  className: "text-orange-400" },
  blunder:   { symbol: "??", className: "text-red-400" },
};

function pairMoves(history: readonly AnnotatedMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
      whiteIndex: i,
      blackIndex: i + 1 < history.length ? i + 1 : undefined,
    });
  }
  return pairs;
}

function ClassificationBadge({ classification }: { readonly classification: MoveClassification | undefined }) {
  if (!classification) return null;
  const indicator = CLASSIFICATION_INDICATORS[classification];
  if (!indicator.symbol) return null;
  return (
    <span className={`ml-0.5 text-xs font-bold ${indicator.className}`}>
      {indicator.symbol}
    </span>
  );
}

export const MoveHistory = memo(function MoveHistory({
  history,
  selectedMoveIndex,
  classifications,
  onSelectMove,
}: MoveHistoryProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const pairs = pairMoves(history);

  const virtualizer = useVirtualizer({
    count: pairs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });

  // Auto-scroll to bottom on new moves (when not viewing history)
  useEffect(() => {
    if (pairs.length > 0 && selectedMoveIndex == null) {
      virtualizer.scrollToIndex(pairs.length - 1, { align: "end" });
    }
  }, [pairs.length, virtualizer, selectedMoveIndex]);

  // Scroll to selected move when navigating history
  useEffect(() => {
    if (selectedMoveIndex != null) {
      const pairIdx = Math.floor(selectedMoveIndex / 2);
      virtualizer.scrollToIndex(pairIdx, { align: "center" });
    }
  }, [selectedMoveIndex, virtualizer]);

  if (history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No moves yet
      </div>
    );
  }

  const isLive = selectedMoveIndex == null;

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
          const isLastPair = virtualRow.index === pairs.length - 1;
          const whiteSelected = selectedMoveIndex === pair.whiteIndex;
          const blackSelected = pair.blackIndex != null && selectedMoveIndex === pair.blackIndex;
          const whiteIsLatest = isLive && isLastPair && !pair.black;
          const blackIsLatest = isLive && isLastPair && !!pair.black;

          const whiteClassification = classifications?.get(pair.whiteIndex);
          const blackClassification = pair.blackIndex != null
            ? classifications?.get(pair.blackIndex)
            : undefined;

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
                onClick={() => onSelectMove?.(pair.whiteIndex)}
                className={`ml-2 w-20 shrink-0 cursor-pointer rounded px-1 hover:bg-muted ${
                  whiteSelected || whiteIsLatest ? "bg-accent/20" : ""
                }`}
              >
                {pair.white.san}
                <ClassificationBadge classification={whiteClassification} />
              </span>
              {pair.black && (
                <span
                  onClick={() => onSelectMove?.(pair.blackIndex!)}
                  className={`ml-1 w-20 shrink-0 cursor-pointer rounded px-1 hover:bg-muted ${
                    blackSelected || blackIsLatest ? "bg-accent/20" : ""
                  }`}
                >
                  {pair.black.san}
                  <ClassificationBadge classification={blackClassification} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
