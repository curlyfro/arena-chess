import { memo, useState } from "react";

interface GameControlsProps {
  readonly isGameOver: boolean;
  readonly onResign: () => void;
  readonly onOfferDraw: () => void;
  readonly onFlipBoard: () => void;
  readonly onToggleHint: () => void;
}

export const GameControls = memo(function GameControls({
  isGameOver,
  onResign,
  onOfferDraw,
  onFlipBoard,
  onToggleHint,
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

  return (
    <div className="flex items-center gap-2">
      {!isGameOver && (
        <>
          <button
            onClick={handleResign}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              confirmResign
                ? "bg-red-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {confirmResign ? "Confirm Resign" : "Resign"}
          </button>
          <button
            onClick={onOfferDraw}
            className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/80"
          >
            Draw
          </button>
        </>
      )}
      <button
        onClick={onFlipBoard}
        className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/80"
        title="Flip board"
      >
        ⇅
      </button>
      {!isGameOver && (
        <button
          onClick={onToggleHint}
          className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/80"
          title="Show best move"
        >
          Hint
        </button>
      )}
    </div>
  );
});
