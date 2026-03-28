import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { INITIAL_FEN } from "@/constants/chess";
import type {
  AnnotatedMove,
  MoveClassification,
  PieceColor,
  PieceSymbol,
  Square,
} from "@/types/chess";

interface GameRecapProps {
  readonly history: readonly AnnotatedMove[];
  readonly classifications: ReadonlyMap<number, MoveClassification>;
  readonly playerColor: PieceColor;
  readonly onClose: () => void;
  readonly open: boolean;
}

const PIECE_UNICODE: Record<string, string> = {
  wk: "♔",
  wq: "♕",
  wr: "♖",
  wb: "♗",
  wn: "♘",
  wp: "♙",
  bk: "♚",
  bq: "♛",
  br: "♜",
  bb: "♝",
  bn: "♞",
  bp: "♟",
};

const CLASSIFICATION_STYLES: Record<
  MoveClassification,
  { label: string; bg: string; text: string; ring: string }
> = {
  brilliant: {
    label: "Brilliant",
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    ring: "ring-cyan-500/40",
  },
  great: {
    label: "Great",
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    ring: "ring-blue-500/40",
  },
  best: {
    label: "Best",
    bg: "bg-green-500/20",
    text: "text-green-400",
    ring: "ring-green-500/40",
  },
  good: {
    label: "Good",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    ring: "ring-emerald-500/30",
  },
  inaccuracy: {
    label: "Inaccuracy",
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    ring: "ring-yellow-500/40",
  },
  mistake: {
    label: "Mistake",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    ring: "ring-orange-500/40",
  },
  blunder: {
    label: "Blunder",
    bg: "bg-red-500/20",
    text: "text-red-400",
    ring: "ring-red-500/40",
  },
};

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 1000 },
  { label: "1×", ms: 500 },
  { label: "2×", ms: 250 },
  { label: "4×", ms: 125 },
] as const;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

const NOTABLE_CLASSIFICATIONS = new Set<MoveClassification>([
  "brilliant",
  "great",
  "blunder",
  "mistake",
]);

interface BoardSquareInfo {
  readonly square: Square;
  readonly isLight: boolean;
  readonly piece: string | null;
}

function parseFen(fen: string): Map<string, { color: PieceColor; type: PieceSymbol }> {
  const pieces = new Map<string, { color: PieceColor; type: PieceSymbol }>();
  const ranks = fen.split(" ")[0].split("/");

  for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
    let fileIdx = 0;
    for (const ch of ranks[rankIdx]) {
      if (ch >= "1" && ch <= "8") {
        fileIdx += parseInt(ch, 10);
      } else {
        const color: PieceColor = ch === ch.toUpperCase() ? "w" : "b";
        const type = ch.toLowerCase() as PieceSymbol;
        const square = `${FILES[fileIdx]}${RANKS[rankIdx]}`;
        pieces.set(square, { color, type });
        fileIdx++;
      }
    }
  }

  return pieces;
}

function buildBoardData(
  fen: string,
  flipped: boolean,
  lastMove: { from: Square; to: Square } | null,
): { squares: BoardSquareInfo[][]; highlighted: Set<string> } {
  const pieces = parseFen(fen);
  const highlighted = new Set<string>();
  if (lastMove) {
    highlighted.add(lastMove.from);
    highlighted.add(lastMove.to);
  }

  const fileOrder = flipped ? [...FILES].reverse() : [...FILES];
  const rankOrder = flipped ? [...RANKS].reverse() : [...RANKS];

  const squares: BoardSquareInfo[][] = rankOrder.map((rank) =>
    fileOrder.map((file) => {
      const square = `${file}${rank}` as Square;
      const fileNum = FILES.indexOf(file);
      const rankNum = RANKS.indexOf(rank);
      const isLight = (fileNum + rankNum) % 2 === 0;
      const p = pieces.get(square);
      const piece = p ? PIECE_UNICODE[`${p.color}${p.type}`] ?? null : null;
      return { square, isLight, piece };
    }),
  );

  return { squares, highlighted };
}

export const GameRecap = memo(function GameRecap({
  history,
  classifications,
  playerColor,
  onClose,
  open,
}: GameRecapProps) {
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fens = useMemo(
    () => [INITIAL_FEN, ...history.map((m) => m.fen)],
    [history],
  );

  const totalMoves = history.length;
  const currentFen = fens[currentMoveIdx + 1] ?? fens[0];
  const flipped = playerColor === "b";

  const currentClassification =
    currentMoveIdx >= 0 ? classifications.get(currentMoveIdx) ?? null : null;

  const { squares, highlighted } = useMemo(() => {
    const lm = currentMoveIdx >= 0
      ? { from: history[currentMoveIdx].from as Square, to: history[currentMoveIdx].to as Square }
      : null;
    return buildBoardData(currentFen, flipped, lm);
  }, [currentFen, flipped, currentMoveIdx, history]);

  const currentSan =
    currentMoveIdx >= 0 ? history[currentMoveIdx].san : null;

  const moveNumber =
    currentMoveIdx >= 0 ? Math.floor(currentMoveIdx / 2) + 1 : null;

  const isWhiteMove = currentMoveIdx >= 0 ? currentMoveIdx % 2 === 0 : null;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stepForward = useCallback(() => {
    setCurrentMoveIdx((prev) => {
      if (prev >= totalMoves - 1) {
        setPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [totalMoves]);

  useEffect(() => {
    if (!playing) {
      clearTimer();
      return;
    }

    const nextIdx = currentMoveIdx + 1;
    if (nextIdx >= totalMoves) {
      setPlaying(false);
      return;
    }

    const nextClassification = classifications.get(nextIdx) ?? null;
    const isNotable =
      nextClassification !== null &&
      NOTABLE_CLASSIFICATIONS.has(nextClassification);
    const delay = isNotable
      ? SPEED_OPTIONS[speedIdx].ms * 3
      : SPEED_OPTIONS[speedIdx].ms;

    timerRef.current = setTimeout(() => {
      stepForward();
    }, delay);

    return clearTimer;
  }, [
    playing,
    currentMoveIdx,
    totalMoves,
    speedIdx,
    classifications,
    stepForward,
    clearTimer,
  ]);

  useEffect(() => {
    if (open) {
      setCurrentMoveIdx(-1);
      setPlaying(true);
      setSpeedIdx(1);
    } else {
      setPlaying(false);
      clearTimer();
    }
  }, [open, clearTimer]);

  const togglePlayPause = useCallback(() => {
    if (currentMoveIdx >= totalMoves - 1) {
      setCurrentMoveIdx(-1);
      setPlaying(true);
    } else {
      setPlaying((prev) => !prev);
    }
  }, [currentMoveIdx, totalMoves]);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((prev) => (prev + 1) % SPEED_OPTIONS.length);
  }, []);

  const progressPct =
    totalMoves > 0 ? ((currentMoveIdx + 1) / totalMoves) * 100 : 0;

  const classificationStyle = currentClassification
    ? CLASSIFICATION_STYLES[currentClassification]
    : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-5 shadow-xl ring-1 ring-border focus:outline-none">
          <Dialog.Title className="mb-3 text-center text-lg font-bold text-foreground">
            Game Recap
          </Dialog.Title>

          {/* Move label and classification badge */}
          <div className="mb-3 flex items-center justify-center gap-2 h-7">
            {currentSan && moveNumber !== null && isWhiteMove !== null && (
              <span className="font-mono text-sm text-muted-foreground">
                {moveNumber}
                {isWhiteMove ? "." : "..."} {currentSan}
              </span>
            )}
            {classificationStyle && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${classificationStyle.bg} ${classificationStyle.text} ${classificationStyle.ring}`}
              >
                {classificationStyle.label}
              </span>
            )}
          </div>

          {/* Mini chess board */}
          <div className="mx-auto aspect-square w-full max-w-[320px]">
            <div className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-md ring-1 ring-border">
              {squares.flat().map(({ square, isLight, piece }) => {
                const isHighlighted = highlighted.has(square);
                const highlightForClassification =
                  isHighlighted && currentClassification;

                let bgClass: string;
                if (highlightForClassification === "blunder") {
                  bgClass = "bg-red-500/40";
                } else if (highlightForClassification === "mistake") {
                  bgClass = "bg-orange-500/40";
                } else if (
                  highlightForClassification === "brilliant" ||
                  highlightForClassification === "great"
                ) {
                  bgClass = "bg-cyan-500/40";
                } else if (isHighlighted) {
                  bgClass = "bg-accent/30";
                } else {
                  bgClass = isLight ? "bg-amber-100 dark:bg-amber-100/80" : "bg-amber-800 dark:bg-amber-800/80";
                }

                return (
                  <div
                    key={square}
                    className={`flex items-center justify-center select-none ${bgClass}`}
                  >
                    {piece && (
                      <span className="text-[clamp(1rem,4vw,1.75rem)] leading-none drop-shadow-sm">
                        {piece}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Controls */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={togglePlayPause}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
            >
              {playing
                ? "Pause"
                : currentMoveIdx >= totalMoves - 1
                  ? "Replay"
                  : "Play"}
            </button>
            <button
              onClick={cycleSpeed}
              className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-border"
            >
              {SPEED_OPTIONS[speedIdx].label}
            </button>
            <Dialog.Close asChild>
              <button className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground ring-1 ring-border hover:bg-border">
                Close
              </button>
            </Dialog.Close>
          </div>

          {/* Move counter */}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Move {Math.max(0, currentMoveIdx + 1)} of {totalMoves}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
