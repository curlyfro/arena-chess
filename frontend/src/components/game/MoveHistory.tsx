import { memo, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { lookupOpening } from "@/lib/openings";
import { CLASSIFICATION_COLORS } from "@/constants/chess-labels";
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

/** Count non-pawn, non-king pieces on the board from a FEN string */
function countMinorMajorPieces(fen: string): number {
  const board = fen.split(" ")[0];
  let count = 0;
  for (const ch of board) {
    if ("rnbqRNBQ".includes(ch)) count++;
  }
  return count;
}

type GamePhase = "opening" | "middlegame" | "endgame";

/**
 * Compute phase boundaries.
 * Returns the move index (half-move) where each phase starts.
 * Opening → Middlegame: when the opening name stops being recognized
 * Middlegame → Endgame: when ≤ 6 minor/major pieces remain
 */
function computePhaseTransitions(history: readonly AnnotatedMove[]): {
  middlegameStart: number | null;
  endgameStart: number | null;
} {
  let middlegameStart: number | null = null;
  let endgameStart: number | null = null;

  // Find where opening ends
  let lastOpeningIndex = -1;
  for (let i = 0; i < history.length; i++) {
    const match = lookupOpening(history.slice(0, i + 1));
    if (match) lastOpeningIndex = i;
  }

  if (lastOpeningIndex >= 0 && lastOpeningIndex < history.length - 1) {
    middlegameStart = lastOpeningIndex + 1;
  }

  // Find where endgame starts
  for (let i = 0; i < history.length; i++) {
    const pieces = countMinorMajorPieces(history[i].fen);
    if (pieces <= 6) {
      endgameStart = i;
      break;
    }
  }

  // Ensure endgame comes after middlegame
  if (middlegameStart != null && endgameStart != null && endgameStart <= middlegameStart) {
    middlegameStart = null; // Skip middlegame label if endgame starts during opening
  }

  return { middlegameStart, endgameStart };
}

function ClassificationBadge({ classification }: { readonly classification: MoveClassification | undefined }) {
  if (!classification) return null;
  const { symbol, text } = CLASSIFICATION_COLORS[classification];
  if (!symbol) return null;
  return (
    <span className={`ml-0.5 text-xs font-bold ${text}`}>
      {symbol}
    </span>
  );
}

function PhaseLabel({ phase }: { readonly phase: GamePhase }) {
  const labels: Record<GamePhase, string> = {
    opening: "Opening",
    middlegame: "Middlegame",
    endgame: "Endgame",
  };
  return (
    <div className="flex items-center gap-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      <div className="flex-1 border-t border-border" />
      <span>{labels[phase]}</span>
      <div className="flex-1 border-t border-border" />
    </div>
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

  const { middlegameStart, endgameStart } = useMemo(
    () => computePhaseTransitions(history),
    [history],
  );

  // Convert half-move indices to pair indices
  const middlegamePairIdx = middlegameStart != null ? Math.floor(middlegameStart / 2) : null;
  const endgamePairIdx = endgameStart != null ? Math.floor(endgameStart / 2) : null;

  // Build row items: each is either a move pair or a phase divider
  type RowItem =
    | { type: "pair"; pair: MovePair; pairIndex: number }
    | { type: "phase"; phase: GamePhase };

  const rows = useMemo(() => {
    const items: RowItem[] = [];
    const insertedPhases = new Set<number>();

    for (let i = 0; i < pairs.length; i++) {
      // Insert middlegame divider before its pair
      if (middlegamePairIdx === i && !insertedPhases.has(i)) {
        items.push({ type: "phase", phase: "middlegame" });
        insertedPhases.add(i);
      }
      // Insert endgame divider before its pair
      if (endgamePairIdx === i && !insertedPhases.has(i)) {
        items.push({ type: "phase", phase: "endgame" });
        insertedPhases.add(i);
      }
      items.push({ type: "pair", pair: pairs[i], pairIndex: i });
    }
    return items;
  }, [pairs, middlegamePairIdx, endgamePairIdx]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (idx) => rows[idx].type === "phase" ? 22 : 32,
    overscan: 5,
  });

  // Auto-scroll to bottom on new moves (when not viewing history)
  useEffect(() => {
    if (rows.length > 0 && selectedMoveIndex == null) {
      virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
    }
  }, [rows.length, virtualizer, selectedMoveIndex]);

  // Scroll to selected move when navigating history
  useEffect(() => {
    if (selectedMoveIndex != null) {
      const pairIdx = Math.floor(selectedMoveIndex / 2);
      // Find the row index for this pair
      const rowIdx = rows.findIndex(
        (r) => r.type === "pair" && r.pairIndex === pairIdx,
      );
      if (rowIdx >= 0) {
        virtualizer.scrollToIndex(rowIdx, { align: "center" });
      }
    }
  }, [selectedMoveIndex, virtualizer, rows]);

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
          const row = rows[virtualRow.index];

          if (row.type === "phase") {
            return (
              <div
                key={`phase-${row.phase}`}
                className="absolute left-0 top-0 flex w-full items-center px-1"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <PhaseLabel phase={row.phase} />
              </div>
            );
          }

          const pair = row.pair;
          const isLastPair = row.pairIndex === pairs.length - 1;
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
