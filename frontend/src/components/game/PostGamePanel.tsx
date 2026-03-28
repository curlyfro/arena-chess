import { memo, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { ENGINE_LEVELS } from "@/constants/engine-levels";
import type { GameStatus, GameResult, PieceColor } from "@/types/chess";
import type { PostGameStats } from "@/types/game";

interface PostGamePanelProps {
  readonly status: GameStatus;
  readonly result: GameResult;
  readonly playerColor: PieceColor;
  readonly postGameStats: PostGameStats | null;
  readonly pgn: string;
  readonly onPlayAgain: () => void;
  readonly onNewGame: () => void;
  readonly onNextLevel?: () => void;
  readonly sessionLevel?: number;
  readonly onAnalyze?: () => void;
  readonly isAnalyzing?: boolean;
  readonly analysisProgress?: number;
}

function getResultText(
  status: GameStatus,
  result: GameResult,
  playerColor: PieceColor,
): { title: string; subtitle: string } {
  const playerWon =
    (playerColor === "w" && result === "1-0") ||
    (playerColor === "b" && result === "0-1");
  const isDraw = result === "1/2-1/2";

  let title: string;
  if (playerWon) {
    title = "You Win!";
  } else if (isDraw) {
    title = "Draw";
  } else {
    title = "You Lose";
  }

  const subtitles: Record<string, string> = {
    checkmate: "by checkmate",
    stalemate: "by stalemate",
    draw_repetition: "by threefold repetition",
    draw_insufficient: "by insufficient material",
    draw_50move: "by fifty-move rule",
    draw_agreement: "by agreement",
    resigned: "by resignation",
    flagged: "on time",
  };

  return { title, subtitle: subtitles[status] ?? "" };
}

export const PostGamePanel = memo(function PostGamePanel({
  status,
  result,
  playerColor,
  postGameStats,
  pgn,
  onPlayAgain,
  onNewGame,
  onNextLevel,
  sessionLevel,
  onAnalyze,
  isAnalyzing,
  analysisProgress,
}: PostGamePanelProps) {
  const playerWon =
    (playerColor === "w" && result === "1-0") ||
    (playerColor === "b" && result === "0-1");

  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (playerWon && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [playerWon]);

  const { title, subtitle } = getResultText(status, result, playerColor);

  const handleDownloadPgn = () => {
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {postGameStats && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Accuracy</div>
          <div className="text-right">
            {postGameStats.accuracy[playerColor === "w" ? "white" : "black"].toFixed(1)}%
          </div>
          <div className="text-muted-foreground">Blunders</div>
          <div className="text-right">{postGameStats.blunders}</div>
          <div className="text-muted-foreground">Mistakes</div>
          <div className="text-right">{postGameStats.mistakes}</div>
          <div className="text-muted-foreground">Inaccuracies</div>
          <div className="text-right">{postGameStats.inaccuracies}</div>
        </div>
      )}

      {isAnalyzing && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${analysisProgress ?? 0}%` }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Analyzing... {analysisProgress ?? 0}%
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/80"
        >
          Rematch
        </button>
        {onNextLevel && sessionLevel != null && sessionLevel < ENGINE_LEVELS.length && (
          <button
            onClick={onNextLevel}
            className="flex-1 rounded bg-accent/70 px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/60"
          >
            Level {sessionLevel + 1} →
          </button>
        )}
        <button
          onClick={onNewGame}
          className="flex-1 rounded bg-muted px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border hover:bg-border"
        >
          New Game
        </button>
      </div>

      <div className="flex gap-2">
        {onAnalyze && !postGameStats && !isAnalyzing && (
          <button
            onClick={onAnalyze}
            className="flex-1 rounded bg-accent/50 px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/40"
          >
            Analyze Game
          </button>
        )}
        <button
          onClick={handleDownloadPgn}
          className="flex-1 rounded bg-muted px-4 py-2 text-sm text-muted-foreground ring-1 ring-border hover:bg-border"
        >
          Download PGN
        </button>
      </div>
    </div>
  );
});
