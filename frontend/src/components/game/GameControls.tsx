import { memo, useState } from "react";

const IconResign = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
    <path d="M3 1v14M3 1h7l-2 3 2 3H3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconDraw = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
    <text x="2" y="13" fontSize="14" fontWeight="bold" fontFamily="serif">½</text>
  </svg>
);

const IconUndo = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
    <path d="M2 6h8a4 4 0 0 1 0 8H6M2 6l3-3M2 6l3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconFlip = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
    <path d="M8 1l3 3H5l3-3ZM8 15l3-3H5l3 3ZM8 5v6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconHint = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
    <path d="M6 14h4M6.5 12h3M8 2a4 4 0 0 0-4 4c0 1.5.8 2.5 1.5 3.2.4.4.5.8.5.8h4s.1-.4.5-.8C11.2 8.5 12 7.5 12 6a4 4 0 0 0-4-4Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface GameControlsProps {
  readonly isGameOver: boolean;
  readonly onResign: () => void;
  readonly onOfferDraw: () => void;
  readonly onTakeback: () => void;
  readonly onFlipBoard: () => void;
  readonly onToggleHint: () => void;
  readonly canTakeback: boolean;
}

export const GameControls = memo(function GameControls({
  isGameOver,
  onResign,
  onOfferDraw,
  onTakeback,
  onFlipBoard,
  onToggleHint,
  canTakeback,
}: GameControlsProps) {
  const [confirmResign, setConfirmResign] = useState(false);

  const handleResign = () => {
    if (confirmResign) {
      onResign();
      setConfirmResign(false);
    } else {
      setConfirmResign(true);
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmResign(false), 3000);
    }
  };

  const btnBase = "rounded bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 min-h-[44px] min-w-[44px] px-3 py-1.5 active:scale-95 transition-transform duration-75 inline-flex items-center gap-1.5";

  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="toolbar" aria-label="Game controls">
      {!isGameOver && (
        <>
          <button
            onClick={handleResign}
            aria-label={confirmResign ? "Confirm resignation" : "Resign game"}
            title="Resign game"
            className={`rounded min-h-[44px] px-3 py-1.5 text-sm font-medium active:scale-95 transition-transform duration-75 inline-flex items-center gap-1.5 ${
              confirmResign
                ? "bg-red-600 text-white animate-pulse"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {IconResign}
            <span className="hidden sm:inline">{confirmResign ? "Confirm" : "Resign"}</span>
          </button>
          <button
            onClick={onOfferDraw}
            aria-label="Offer draw"
            title="Offer draw"
            className={btnBase}
          >
            {IconDraw}
            <span className="hidden sm:inline">Draw</span>
          </button>
          <button
            onClick={onTakeback}
            disabled={!canTakeback}
            aria-label="Take back last move"
            title="Take back move (Z)"
            className={`${btnBase} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {IconUndo}
            <span className="hidden sm:inline">Undo</span>
          </button>
        </>
      )}
      <button
        onClick={onFlipBoard}
        aria-label="Flip board (F)"
        title="Flip board (F)"
        className={btnBase}
      >
        {IconFlip}
        <span className="hidden sm:inline">Flip</span>
      </button>
      {!isGameOver && (
        <button
          onClick={onToggleHint}
          aria-label="Show best move hint"
          title="Show best move (H)"
          className={btnBase}
        >
          {IconHint}
          <span className="hidden sm:inline">Hint</span>
        </button>
      )}
    </div>
  );
});
