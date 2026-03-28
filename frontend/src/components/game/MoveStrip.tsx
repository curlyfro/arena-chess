import { memo, useEffect, useRef } from "react";
import { CLASSIFICATION_COLORS } from "@/constants/chess-labels";
import type { AnnotatedMove, MoveClassification } from "@/types/chess";

interface MoveStripProps {
  readonly history: readonly AnnotatedMove[];
  readonly selectedMoveIndex?: number | null;
  readonly classifications?: ReadonlyMap<number, MoveClassification>;
  readonly onSelectMove?: (index: number) => void;
}

/** Horizontal scrolling move strip for mobile. */
export const MoveStrip = memo(function MoveStrip({
  history,
  selectedMoveIndex,
  classifications,
  onSelectMove,
}: MoveStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLive = selectedMoveIndex == null;

  // Auto-scroll to end on new moves
  useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [history.length, isLive]);

  // Scroll to selected move
  useEffect(() => {
    if (selectedMoveIndex != null && scrollRef.current) {
      const el = scrollRef.current.children[selectedMoveIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  }, [selectedMoveIndex]);

  if (history.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-1">No moves yet</div>;
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-0.5 overflow-x-auto scrollbar-none py-1"
    >
      {history.map((move, i) => {
        const isWhite = i % 2 === 0;
        const moveNum = Math.floor(i / 2) + 1;
        const selected = selectedMoveIndex === i;
        const latest = isLive && i === history.length - 1;
        const classification = classifications?.get(i);
        const colorClass = classification ? CLASSIFICATION_COLORS[classification].text : undefined;

        return (
          <button
            key={i}
            onClick={() => onSelectMove?.(i)}
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-mono whitespace-nowrap ${
              selected || latest
                ? "bg-accent/25 text-foreground"
                : "text-muted-foreground hover:bg-muted"
            } ${colorClass ?? ""}`}
          >
            {isWhite && <span className="text-muted-foreground mr-0.5">{moveNum}.</span>}
            {move.san}
          </button>
        );
      })}
    </div>
  );
});
