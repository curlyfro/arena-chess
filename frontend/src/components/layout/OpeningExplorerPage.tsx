import { Link, useSearchParams } from "react-router";
import { useOpeningExplorer } from "@/hooks/use-opening-explorer";
import { useBoardPreferences } from "@/hooks/use-board-theme";
import { ChessBoard } from "@/components/board/ChessBoard";
import { ContinuationList } from "@/components/openings/ContinuationList";
import { MoveHistoryBreadcrumb } from "@/components/openings/MoveHistoryBreadcrumb";
import { OpeningSearch } from "@/components/openings/OpeningSearch";

const NOOP_PREMOVE = () => {};

export function OpeningExplorerPage() {
  const explorer = useOpeningExplorer();
  const { theme, pieceSet, showCoordinates } = useBoardPreferences();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  if (explorer.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading opening database...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Opening Explorer</h1>
          {explorer.currentOpening && (
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-border px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                {explorer.currentOpening.eco}
              </span>
              <span className="text-sm text-foreground">
                {explorer.currentOpening.name}
              </span>
            </div>
          )}
        </div>
        <Link
          to="/"
          className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Back
        </Link>
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center gap-4 md:flex-row md:items-start md:justify-center">
        {/* Board */}
        <div className="flex w-full max-w-[900px] flex-col gap-2 md:flex-1">
          <ChessBoard
            board={explorer.board}
            turn={explorer.turn}
            playerColor={explorer.turn}
            isGameOver={false}
            isCheck={explorer.isCheck}
            flipped={false}
            theme={theme}
            pieceSet={pieceSet}
            showCoordinates={showCoordinates}
            lastMove={explorer.lastMove}
            premove={null}
            bestMoveArrow={null}
            getLegalMovesForSquare={explorer.getLegalMovesForSquare}
            onMove={explorer.playMove}
            onPremove={NOOP_PREMOVE}
          />
        </div>

        {/* Sidebar */}
        <div className="flex w-full flex-col gap-3 md:w-72 md:shrink-0 md:self-start">
          <OpeningSearch tree={explorer.tree} onSelect={explorer.playLine} initialQuery={initialQuery} />

          <MoveHistoryBreadcrumb
            moves={explorer.moveHistory}
            viewIndex={explorer.viewIndex}
            onGoToMove={explorer.goToMove}
            onGoToStart={explorer.goToStart}
          />

          {/* Navigation */}
          <div className="flex gap-1">
            <button
              onClick={explorer.goToStart}
              disabled={!explorer.canGoBack}
              className="flex-1 rounded bg-muted py-1.5 text-sm font-medium text-foreground hover:bg-border disabled:opacity-30"
            >
              ⏮
            </button>
            <button
              onClick={explorer.goBack}
              disabled={!explorer.canGoBack}
              className="flex-1 rounded bg-muted py-1.5 text-sm font-medium text-foreground hover:bg-border disabled:opacity-30"
            >
              ◀
            </button>
            <button
              onClick={explorer.goForward}
              disabled={!explorer.canGoForward}
              className="flex-1 rounded bg-muted py-1.5 text-sm font-medium text-foreground hover:bg-border disabled:opacity-30"
            >
              ▶
            </button>
          </div>

          {/* Continuations */}
          <div className="rounded-lg bg-muted p-3">
            <ContinuationList
              continuations={explorer.continuations}
              turn={explorer.turn}
              onSelect={explorer.playMoveBySan}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
