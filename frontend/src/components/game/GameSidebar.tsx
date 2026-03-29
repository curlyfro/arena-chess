import { Link } from "react-router";
import { GameControls } from "./GameControls";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { MoveHistory } from "./MoveHistory";
import { MoveStrip } from "./MoveStrip";
import { EvalGraph } from "./EvalGraph";
import { MoveAnnotation } from "./MoveAnnotation";
import { ReplayControls } from "./ReplayControls";
import { PostGamePanel } from "./PostGamePanel";
import type { AnnotatedMove, GameStatus, GameResult, PieceColor, MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import type { PostGameStats } from "@/types/game";

interface GameSidebarProps {
  // Game state
  readonly isGameOver: boolean;
  readonly gameStatus: GameStatus;
  readonly gameResult: GameResult;
  readonly playerColor: PieceColor;
  readonly history: readonly AnnotatedMove[];

  // Controls
  readonly aiThinking: boolean;
  readonly canTakeback: boolean;
  readonly onResign: () => void;
  readonly onOfferDraw: () => void;
  readonly onTakeback: () => void;
  readonly onFlipBoard: () => void;
  readonly onToggleHint: () => void;

  // Draw offer
  readonly drawOfferStatus: "offered" | "accepted" | "declined" | null;

  // Opening
  readonly openingName: { eco: string; name: string } | null;

  // History navigation
  readonly viewingMoveIndex: number | null;
  readonly isAnalysisMode: boolean;
  readonly onSelectMove: (index: number) => void;
  readonly onReturnToLive: () => void;
  readonly onGoToStart: () => void;
  readonly onGoBack: () => void;
  readonly onGoForward: () => void;

  // Analysis
  readonly classifications: ReadonlyMap<number, MoveClassification>;
  readonly analysisEvals: readonly EvalScore[];
  readonly analysisBestMoves: readonly string[];
  readonly postGameStats: PostGameStats | null;
  readonly isAnalyzing: boolean;
  readonly analysisProgress: number;
  readonly onAnalyze: () => void;

  // Post-game
  readonly pgn: string;
  readonly onPlayAgain: () => void;
  readonly onNewGame: () => void;
  readonly eloResult: { change: number; after: number } | null;
  readonly gameSubmitError: string | null;

  // Auth
  readonly isGuest: boolean;
  readonly onSignIn: () => void;

  // Next level
  readonly onNextLevel?: () => void;
  readonly sessionLevel?: number;

  // Win streak
  readonly winStreak?: number;

  // Help
  readonly onToggleShortcutHelp?: () => void;

  // Annotation
  readonly viewedAnnotation: {
    moveIndex: number;
    classification: MoveClassification;
    playedMoveSan: string;
    bestMoveUci: string;
    fenBefore: string;
    evalBefore: EvalScore;
    evalAfter: EvalScore;
  } | null;
}

export function GameSidebar({
  isGameOver,
  gameStatus,
  gameResult,
  playerColor,
  history,
  aiThinking,
  canTakeback,
  onResign,
  onOfferDraw,
  onTakeback,
  onFlipBoard,
  onToggleHint,
  drawOfferStatus,
  openingName,
  viewingMoveIndex,
  isAnalysisMode,
  onSelectMove,
  onReturnToLive,
  onGoToStart,
  onGoBack,
  onGoForward,
  classifications,
  analysisEvals,
  analysisBestMoves,
  postGameStats,
  isAnalyzing,
  analysisProgress,
  onAnalyze,
  pgn,
  onPlayAgain,
  onNewGame,
  eloResult,
  gameSubmitError,
  isGuest,
  onSignIn,
  onNextLevel,
  sessionLevel,
  winStreak,
  onToggleShortcutHelp,
  viewedAnnotation,
}: GameSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-3 md:w-64 md:shrink-0 md:self-start md:max-h-[calc(100vh-120px)]">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <GameControls
        isGameOver={isGameOver}
        onResign={onResign}
        onOfferDraw={onOfferDraw}
        onTakeback={onTakeback}
        onFlipBoard={onFlipBoard}
        onToggleHint={onToggleHint}
        canTakeback={canTakeback}
      />
        </div>
        {onToggleShortcutHelp && (
          <button
            onClick={onToggleShortcutHelp}
            className="rounded bg-muted px-2 py-1.5 text-sm text-muted-foreground hover:bg-border hover:text-foreground"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        )}
      </div>

      {drawOfferStatus && (
        <div className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${
          drawOfferStatus === "accepted" ? "bg-success/20 text-success" :
          drawOfferStatus === "declined" ? "bg-destructive/20 text-destructive" :
          "bg-muted text-muted-foreground animate-pulse"
        }`}>
          {drawOfferStatus === "offered" && "Draw offered..."}
          {drawOfferStatus === "accepted" && "Draw accepted"}
          {drawOfferStatus === "declined" && "Draw declined"}
        </div>
      )}

      <ThinkingIndicator isThinking={aiThinking} />

      {openingName && (
        <Link
          to={`/openings?q=${encodeURIComponent(openingName.name)}`}
          className="block rounded-lg bg-muted px-2 py-1.5 hover:bg-border transition-colors"
          title="Explore this opening"
        >
          <span className="text-xs font-mono text-muted-foreground">{openingName.eco}</span>
          <span className="ml-1.5 text-xs text-foreground">{openingName.name}</span>
          <span className="ml-1 text-xs text-muted-foreground">→</span>
        </Link>
      )}

      {isAnalysisMode && (
        <EvalGraph
          evals={analysisEvals}
          currentIndex={viewingMoveIndex ?? history.length - 1}
          totalMoves={history.length}
          onSelectMove={onSelectMove}
        />
      )}

      {/* Mobile: horizontal scrolling move strip */}
      <div className="md:hidden rounded-lg bg-muted px-2 py-1">
        <MoveStrip
          history={history}
          selectedMoveIndex={viewingMoveIndex}
          classifications={classifications}
          onSelectMove={onSelectMove}
        />
      </div>

      {/* Desktop: full move history */}
      <div className="hidden md:block min-h-0 flex-1 overflow-auto rounded-lg bg-muted p-2">
        <MoveHistory
          history={history}
          selectedMoveIndex={viewingMoveIndex}
          classifications={classifications}
          onSelectMove={onSelectMove}
        />
      </div>

      {viewingMoveIndex != null && !isAnalysisMode && (
        <button
          onClick={onReturnToLive}
          className="w-full rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/80"
        >
          ▶ Live
        </button>
      )}

      {viewedAnnotation && (
        <MoveAnnotation {...viewedAnnotation} />
      )}

      {isAnalysisMode && (
        <ReplayControls
          totalMoves={history.length}
          currentIndex={viewingMoveIndex}
          onGoToStart={onGoToStart}
          onGoBack={onGoBack}
          onGoForward={onGoForward}
          onGoToEnd={onReturnToLive}
        />
      )}

      {isGameOver && (
        <>
          <PostGamePanel
            status={gameStatus}
            result={gameResult}
            playerColor={playerColor}
            postGameStats={postGameStats}
            pgn={pgn}
            onPlayAgain={onPlayAgain}
            onNewGame={onNewGame}
            onNextLevel={onNextLevel}
            sessionLevel={sessionLevel}
            onAnalyze={onAnalyze}
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
            winStreak={winStreak}
            openingName={openingName?.name}
            classifications={classifications}
            history={history}
            analysisBestMoves={analysisBestMoves}
            eloAfter={eloResult?.after}
          />
          {eloResult && (
            <div className="rounded-lg bg-muted p-3 text-center text-sm">
              <span className="text-foreground font-bold">{eloResult.after}</span>
              <span className={`ml-2 ${eloResult.change > 0 ? "text-success" : eloResult.change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                ({eloResult.change > 0 ? `+${eloResult.change}` : eloResult.change === 0 ? "±0" : eloResult.change})
              </span>
            </div>
          )}
          {isGuest && !eloResult && (
            <button
              onClick={onSignIn}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
            >
              Sign in to track your rating
            </button>
          )}
          {gameSubmitError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
              {gameSubmitError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
