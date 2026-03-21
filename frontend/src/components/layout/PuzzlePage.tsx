import { useCallback, useMemo } from "react";
import { usePuzzle } from "@/hooks/use-puzzle";
import { useGameStore } from "@/stores/game-store";
import { BOARD_THEMES } from "@/constants/board-themes";
import { ChessBoard } from "@/components/board/ChessBoard";
import type { ChessMove } from "@/types/chess";

interface PuzzlePageProps {
  readonly onBack: () => void;
}

export function PuzzlePage({ onBack }: PuzzlePageProps) {
  const puzzle = usePuzzle();

  const boardThemeId = useGameStore((s) => s.boardThemeId);
  const pieceSet = useGameStore((s) => s.pieceSet);
  const showCoordinates = useGameStore((s) => s.showCoordinates);

  const theme = useMemo(
    () => BOARD_THEMES.find((t) => t.id === boardThemeId) ?? BOARD_THEMES[1],
    [boardThemeId],
  );

  const isFlipped = puzzle.playerColor === "b";

  const handleMove = useCallback(
    (move: ChessMove): boolean => {
      return puzzle.tryMove(move);
    },
    [puzzle.tryMove],
  );

  const noPremove = useCallback(() => {}, []);
  const noLegalMoves = useCallback(() => [] as readonly ChessMove[], []);

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">♚ Puzzles</h1>
        <button
          onClick={onBack}
          className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Back to Game
        </button>
      </div>

      <div className="flex w-full max-w-5xl items-start justify-center gap-4">
        <div className="flex w-full max-w-[900px] flex-col gap-2">
          <ChessBoard
            board={puzzle.board}
            turn={puzzle.turn}
            playerColor={puzzle.playerColor}
            isGameOver={puzzle.status !== "playing"}
            isCheck={puzzle.isCheck}
            flipped={isFlipped}
            theme={theme}
            pieceSet={pieceSet}
            showCoordinates={showCoordinates}
            lastMove={puzzle.lastMove}
            premove={null}
            bestMoveArrow={null}
            getLegalMovesForSquare={
              puzzle.status === "playing"
                ? puzzle.getLegalMovesForSquare
                : noLegalMoves
            }
            onMove={handleMove}
            onPremove={noPremove}
          />
        </div>

        <div className="hidden w-64 shrink-0 flex-col gap-3 md:flex">
          <div className="rounded-lg bg-muted p-4 text-center">
            <div className="text-sm text-muted-foreground">
              Rating: <span className="font-bold text-foreground">{puzzle.puzzle.rating}</span>
            </div>
            {puzzle.puzzle.themes.length > 0 && (
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {puzzle.puzzle.themes.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-border px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">
              {puzzle.playerColor === "w" ? "White" : "Black"} to move
            </div>
            {puzzle.status === "playing" && (
              <p className="text-sm text-foreground">Find the best move</p>
            )}
            {puzzle.status === "correct" && (
              <p className="text-sm font-bold text-success">Correct!</p>
            )}
            {puzzle.status === "incorrect" && (
              <p className="text-sm font-bold text-destructive">Incorrect</p>
            )}
          </div>

          {puzzle.status !== "playing" && (
            <div className="flex gap-2">
              {puzzle.status === "incorrect" && (
                <button
                  onClick={puzzle.retryPuzzle}
                  className="flex-1 rounded bg-muted px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border hover:bg-border"
                >
                  Retry
                </button>
              )}
              <button
                onClick={puzzle.nextPuzzle}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/80"
              >
                Next Puzzle
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
