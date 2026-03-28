import type { Continuation } from "@/types/openings";
import type { PieceColor } from "@/types/chess";

interface ContinuationListProps {
  readonly continuations: readonly Continuation[];
  readonly turn: PieceColor;
  readonly onSelect: (san: string) => void;
}

export function ContinuationList({ continuations, turn, onSelect }: ContinuationListProps) {
  if (continuations.length === 0) {
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
      <div className="space-y-0.5">
        {continuations.map((c) => (
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
