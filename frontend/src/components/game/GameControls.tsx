import { memo, useState } from "react";

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

  const btnBase = "rounded bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 min-h-[44px] min-w-[44px] px-3 py-1.5";

  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="toolbar" aria-label="Game controls">
      {!isGameOver && (
        <>
          <button
            onClick={handleResign}
            aria-label={confirmResign ? "Confirm resignation" : "Resign game"}
            className={`rounded min-h-[44px] px-3 py-1.5 text-sm font-medium transition-colors ${
              confirmResign
                ? "bg-red-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {confirmResign ? "Confirm" : "Resign"}
          </button>
          <button
            onClick={onOfferDraw}
            aria-label="Offer draw"
            className={btnBase}
          >
            Draw
          </button>
          <button
            onClick={onTakeback}
            disabled={!canTakeback}
            aria-label="Take back last move"
            className={`${btnBase} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Undo
          </button>
        </>
      )}
      <button
        onClick={onFlipBoard}
        aria-label="Flip board (F)"
        className={btnBase}
      >
        ⇅
      </button>
      {!isGameOver && (
        <button
          onClick={onToggleHint}
          aria-label="Show best move hint"
          className={btnBase}
        >
          Hint
        </button>
      )}
    </div>
  );
});
