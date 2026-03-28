import { useCallback, useEffect, useState } from "react";
import { usePuzzle } from "@/hooks/use-puzzle";
import { useBoardPreferences } from "@/hooks/use-board-theme";
import { usePuzzleStore } from "@/stores/puzzle-store";
import { getDailyPuzzle } from "@/lib/puzzles";
import { ChessBoard } from "@/components/board/ChessBoard";
import { initAudio } from "@/lib/sounds";
import { Link } from "react-router";

export function PuzzlePage() {
  const puzzle = usePuzzle();
  const dailyCompletedDates = usePuzzleStore((s) => s.dailyCompletedDates);
  const addDailyCompletion = usePuzzleStore((s) => s.addDailyCompletion);
  const getDailyStreak = usePuzzleStore((s) => s.getDailyStreak);
  const [isPlayingDaily, setIsPlayingDaily] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isDailyCompleted = dailyCompletedDates.includes(today);
  const dailyStreak = getDailyStreak();
  const { theme, pieceSet, showCoordinates } = useBoardPreferences();

  // Track daily puzzle completion
  useEffect(() => {
    if (isPlayingDaily && puzzle.status === "correct" && !isDailyCompleted) {
      addDailyCompletion(today);
      setIsPlayingDaily(false);
    }
  }, [isPlayingDaily, puzzle.status, isDailyCompleted, today, addDailyCompletion]);

  const isFlipped = puzzle.playerColor === "b";
  const noPremove = useCallback(() => {}, []);

  const handleFirstInteraction = useCallback(() => {
    initAudio();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4" onPointerDown={handleFirstInteraction}>
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">♚ Puzzles</h1>
          {puzzle.currentStreak > 0 && (
            <span className="rounded bg-success/20 px-2 py-0.5 text-xs font-bold text-success">
              {puzzle.currentStreak} streak
            </span>
          )}
        </div>
        <Link
          to="/"
          className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Back to Game
        </Link>
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center gap-4 md:flex-row md:items-start md:justify-center">
        <div className="flex w-full max-w-[900px] flex-col gap-2 md:flex-1">
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
            getLegalMovesForSquare={puzzle.getLegalMovesForSquare}
            onMove={puzzle.tryMove}
            onPremove={noPremove}
          />
        </div>

        <div className="flex w-full flex-col gap-3 md:w-64 md:shrink-0">
          {/* Daily puzzle */}
          <div className="rounded-lg bg-muted p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase mb-1">Puzzle of the Day</div>
            {isDailyCompleted ? (
              <>
                <div className="text-sm font-bold text-success">Completed!</div>
                {dailyStreak > 1 && (
                  <div className="mt-1 text-xs text-muted-foreground">{dailyStreak} day streak</div>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  const daily = getDailyPuzzle(today);
                  puzzle.startPuzzle(daily);
                  setIsPlayingDaily(true);
                }}
                className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
              >
                Solve
              </button>
            )}
          </div>

          {/* Player puzzle stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-2">
              <div className="text-lg font-bold text-foreground">{puzzle.puzzleRating}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Rating</div>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <div className="text-lg font-bold text-success">{puzzle.totalSolved}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Solved</div>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <div className="text-lg font-bold text-foreground">{puzzle.bestStreak}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Best</div>
            </div>
          </div>

          {/* Puzzle info */}
          <div className="rounded-lg bg-muted p-4 text-center">
            <div className="text-sm text-muted-foreground">
              Puzzle: <span className="font-bold text-foreground">{puzzle.puzzle.rating}</span>
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

          {/* Status */}
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

          {/* Actions */}
          {puzzle.status !== "playing" && (
            <div className="flex flex-col gap-2">
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
              {puzzle.status === "incorrect" && !puzzle.solutionShown && (
                <button
                  onClick={puzzle.showSolution}
                  className="rounded bg-muted px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-border hover:bg-border"
                >
                  Show Solution
                </button>
              )}
              {puzzle.solutionShown && (
                <p className="text-center text-xs text-muted-foreground">
                  Showing solution...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
