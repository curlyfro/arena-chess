import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import confetti from "canvas-confetti";
import { GameRecap } from "./GameRecap";
import { ENGINE_LEVELS } from "@/constants/engine-levels";
import { isPlayerWin } from "@/lib/game-utils";
import { generateNarrative, generateSuggestions } from "@/lib/game-narrative";
import { detectTacticalPatterns } from "@/lib/tactical-detector";
import { useTutorialStore } from "@/stores/tutorial-store";
import type { GameStatus, GameResult, PieceColor, AnnotatedMove, MoveClassification } from "@/types/chess";
import type { PostGameStats } from "@/types/game";

const EMPTY_CLASSIFICATIONS: ReadonlyMap<number, MoveClassification> = new Map();

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
  readonly winStreak?: number;
  readonly openingName?: string | null;
  readonly classifications?: ReadonlyMap<number, MoveClassification>;
  readonly history?: readonly AnnotatedMove[];
  readonly analysisBestMoves?: readonly string[];
}

function getResultText(
  status: GameStatus,
  result: GameResult,
  playerColor: PieceColor,
): { title: string; subtitle: string } {
  const playerWon = isPlayerWin(playerColor, result);
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
  winStreak,
  openingName,
  classifications,
  history,
  analysisBestMoves,
}: PostGamePanelProps) {
  const playerWon = isPlayerWin(playerColor, result);
  const isDraw = result === "1/2-1/2";

  const accuracy = postGameStats
    ? postGameStats.accuracy[playerColor === "w" ? "white" : "black"]
    : null;

  const narrative = useMemo(() => {
    if (!postGameStats || !classifications || !history) return null;
    return generateNarrative({
      playerColor,
      playerWon,
      isDraw,
      openingName: openingName ?? null,
      moveCount: history.length,
      accuracy,
      blunders: postGameStats.blunders,
      mistakes: postGameStats.mistakes,
      classifications,
      history,
    });
  }, [postGameStats, classifications, history, playerColor, playerWon, isDraw, openingName, accuracy]);

  const completedLessons = useTutorialStore((s) => s.completedLessons);
  const tacticalSuggestions = useMemo(() => {
    if (!classifications || !history || !analysisBestMoves || playerWon) return [];
    return detectTacticalPatterns(
      classifications,
      history,
      analysisBestMoves,
      new Set(completedLessons),
    );
  }, [classifications, history, analysisBestMoves, playerWon, completedLessons]);

  const suggestions = useMemo(() =>
    generateSuggestions({
      playerWon,
      isDraw,
      accuracy,
      blunders: postGameStats?.blunders ?? 0,
      openingName: openingName ?? null,
      sessionLevel: sessionLevel ?? null,
      maxLevel: ENGINE_LEVELS.length,
    }),
    [playerWon, isDraw, accuracy, postGameStats?.blunders, openingName, sessionLevel],
  );

  const [showRecap, setShowRecap] = useState(false);
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

  const [copied, setCopied] = useState(false);

  const handleCopyPgn = async () => {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: do nothing */ }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        {playerWon && winStreak != null && winStreak >= 2 && (
          <p className="mt-1 text-sm font-medium text-orange-400">
            {winStreak} wins in a row!
          </p>
        )}
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

      {narrative && (
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          {narrative}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) =>
            s.link ? (
              <Link
                key={s.text}
                to={s.link}
                className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/30"
              >
                {s.text} →
              </Link>
            ) : s.action === "nextLevel" && onNextLevel ? (
              <button
                key={s.text}
                onClick={onNextLevel}
                className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/30"
              >
                {s.text} →
              </button>
            ) : null,
          )}
        </div>
      )}

      {tacticalSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground uppercase">Learn from this game</div>
          {tacticalSuggestions.map((s) => (
            <Link
              key={s.tutorialId}
              to="/tutorials"
              state={{ lessonId: s.tutorialId }}
              className="flex items-center gap-2 rounded bg-background px-2.5 py-1.5 text-xs hover:bg-border transition-colors"
            >
              <span className="text-foreground">
                Missed a {s.pattern} ({s.moveSan})
              </span>
              <span className="ml-auto text-accent font-medium">{s.tutorialTitle} →</span>
            </Link>
          ))}
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
        {postGameStats && history && history.length > 0 && (
          <button
            onClick={() => setShowRecap(true)}
            className="flex-1 rounded bg-accent/50 px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/40"
          >
            Recap
          </button>
        )}
        <button
          onClick={handleCopyPgn}
          className="flex-1 rounded bg-muted px-4 py-2 text-sm text-muted-foreground ring-1 ring-border hover:bg-border"
          title="Copy PGN to clipboard"
        >
          {copied ? "Copied!" : "PGN"}
        </button>
      </div>

      {history && (
        <GameRecap
          open={showRecap}
          onClose={() => setShowRecap(false)}
          history={history}
          classifications={classifications ?? EMPTY_CLASSIFICATIONS}
          playerColor={playerColor}
        />
      )}
    </div>
  );
});
