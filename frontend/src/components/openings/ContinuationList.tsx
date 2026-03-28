import { useMemo } from "react";
import type { Continuation } from "@/types/openings";
import type { PieceColor } from "@/types/chess";

// Main moves sorted first, then named openings, then rest alphabetically
const PRIORITY_MOVES = ["e4", "d4", "Nf3", "c4", "e5", "d5", "c5", "Nf6", "Nc6", "e6", "c6", "g6"];

function sortContinuations(continuations: readonly Continuation[]): Continuation[] {
  return [...continuations].sort((a, b) => {
    const aIdx = PRIORITY_MOVES.indexOf(a.san);
    const bIdx = PRIORITY_MOVES.indexOf(b.san);
    const aPri = aIdx >= 0 ? aIdx : 100;
    const bPri = bIdx >= 0 ? bIdx : 100;
    if (aPri !== bPri) return aPri - bPri;
    // Named openings before unnamed
    if (a.name && !b.name) return -1;
    if (!a.name && b.name) return 1;
    return a.san.localeCompare(b.san);
  });
}

interface ContinuationListProps {
  readonly continuations: readonly Continuation[];
  readonly turn: PieceColor;
  readonly onSelect: (san: string) => void;
}

export function ContinuationList({ continuations, turn, onSelect }: ContinuationListProps) {
  const sorted = useMemo(() => sortContinuations(continuations), [continuations]);

  if (sorted.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No continuations in the opening book
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-xs text-muted-foreground uppercase">
        {turn === "w" ? "White" : "Black"} plays
      </div>
      <div className="space-y-0.5 max-h-64 overflow-y-auto">
        {sorted.map((c) => (
          <button
            key={c.san}
            onClick={() => onSelect(c.san)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-border/50"
          >
            <span className="font-mono font-bold text-foreground">{c.san}</span>
            {c.name && (
              <span className="truncate text-muted-foreground">{c.name}</span>
            )}
            {c.eco && (
              <span className="ml-auto shrink-0 rounded bg-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {c.eco}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
