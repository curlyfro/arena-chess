import { useMemo, useState } from "react";
import { searchOpenings } from "@/hooks/use-opening-explorer";
import type { OpeningTreeNode } from "@/types/openings";

const POPULAR_OPENINGS: readonly { name: string; moves: readonly string[] }[] = [
  { name: "Italian Game", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
  { name: "Sicilian Defense", moves: ["e4", "c5"] },
  { name: "French Defense", moves: ["e4", "e6"] },
  { name: "Caro-Kann Defense", moves: ["e4", "c6"] },
  { name: "Ruy Lopez", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] },
  { name: "Queen's Gambit", moves: ["d4", "d5", "c4"] },
  { name: "King's Indian Defense", moves: ["d4", "Nf6", "c4", "g6"] },
  { name: "English Opening", moves: ["c4"] },
  { name: "Scotch Game", moves: ["e4", "e5", "Nf3", "Nc6", "d4"] },
  { name: "London System", moves: ["d4", "d5", "Bf4"] },
  { name: "Pirc Defense", moves: ["e4", "d6", "d4", "Nf6"] },
  { name: "Dutch Defense", moves: ["d4", "f5"] },
];

interface OpeningSearchProps {
  readonly tree: OpeningTreeNode | null;
  readonly onSelect: (moves: readonly string[]) => void;
}

export function OpeningSearch({ tree, onSelect }: OpeningSearchProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(
    () => searchOpenings(tree, query),
    [tree, query],
  );

  const showResults = focused && query.trim().length > 0 && results.length > 0;
  const showPopular = !query.trim();

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search openings..."
          className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {/* Search results dropdown */}
        {showResults && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-lg bg-background shadow-lg ring-1 ring-border">
            {results.map((r) => (
              <button
                key={`${r.eco}-${r.moves.join(",")}`}
                onClick={() => {
                  onSelect(r.moves);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="shrink-0 rounded bg-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {r.eco}
                </span>
                <span className="truncate text-foreground">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular openings grid */}
      {showPopular && (
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground uppercase">Popular</div>
          <div className="grid grid-cols-2 gap-1">
            {POPULAR_OPENINGS.map((o) => (
              <button
                key={o.name}
                onClick={() => onSelect(o.moves)}
                className="rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-border/50 truncate"
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
