import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChessGame } from "@/hooks/use-chess-game";
import { useStockfishWorker } from "@/hooks/use-stockfish-worker";
import { useGameClock } from "@/hooks/use-game-clock";
import { useGameAnalysis } from "@/hooks/use-game-analysis";
import { useGameSubmission } from "@/hooks/use-game-submission";
import { useDrawOffer } from "@/hooks/use-draw-offer";
import { useHistoryNavigation } from "@/hooks/use-history-navigation";
import { useBoardPreferences } from "@/hooks/use-board-theme";
import { useGameStore } from "@/stores/game-store";
import { useAuthStore } from "@/stores/auth-store";
import { ENGINE_LEVELS } from "@/constants/engine-levels";
import { TIME_CONTROLS, DEFAULT_TIME_CONTROL } from "@/constants/time-controls";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PlayerClockRow } from "@/components/game/PlayerClockRow";
import { EvalBar } from "@/components/game/EvalBar";
import { GameHeader } from "@/components/game/GameHeader";
import { GameSidebar } from "@/components/game/GameSidebar";
import { Dashboard } from "./Dashboard";
import { NewGameDialog } from "./NewGameDialog";
import { SettingsDialog } from "./SettingsDialog";
import { AuthModal } from "./AuthModal";
import { lookupOpening } from "@/lib/openings";
import { buildViewedAnnotation } from "@/lib/annotation";
import { useSound } from "@/hooks/use-sound";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAchievementChecker } from "@/hooks/use-achievement-checker";
import { useChallengeStore } from "@/stores/challenge-store";
import { getCoachTip, type CoachTip } from "@/lib/game-coach";
import { CoachBubble } from "@/components/game/CoachBubble";
import { parseUciMove } from "@/lib/uci";
import { isPlayerWin } from "@/lib/game-utils";
import { KeyboardShortcutHelp } from "@/components/ui/KeyboardShortcutHelp";
import type { PieceColor, ChessMove } from "@/types/chess";
import type { GameSession } from "@/types/game";

export function GamePage() {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);
  const storedFen = useGameStore((s) => s.fen);
  const storedHistory = useGameStore((s) => s.history);
  const storedStatus = useGameStore((s) => s.status);
  const storedClock = useGameStore((s) => s.clock);
  const boardFlipped = useGameStore((s) => s.boardFlipped);
  const flipBoard = useGameStore((s) => s.flipBoard);
  const { theme, pieceSet, showCoordinates, showEvalBar } = useBoardPreferences();
  const syncPosition = useGameStore((s) => s.syncPosition);
  const syncClock = useGameStore((s) => s.syncClock);
  const premove = useGameStore((s) => s.premove);
  const setPremove = useGameStore((s) => s.setPremove);
  const setLastMove = useGameStore((s) => s.setLastMove);
  const lastMove = useGameStore((s) => s.lastMove);
  const bestMoveArrow = useGameStore((s) => s.bestMoveArrow);
  const setBestMoveArrow = useGameStore((s) => s.setBestMoveArrow);
  const resetGameStore = useGameStore((s) => s.resetGame);

  const storedResult = useGameStore((s) => s.result);
  const hasResumableGame = session && storedStatus !== "idle";
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const authUser = useAuthStore((s) => s.user);
  const authProfile = useAuthStore((s) => s.playerProfile);
  const authLogout = useAuthStore((s) => s.logout);
  const authLoadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    authLoadUser();
  }, [authLoadUser]);

  const restoredFen = hasResumableGame ? storedFen : undefined;
  const restoredHistory = hasResumableGame ? storedHistory : undefined;

  const restoredTerminatingColor: PieceColor | undefined =
    hasResumableGame && (storedStatus === "resigned" || storedStatus === "flagged")
      ? storedResult === "1-0" ? "b"
        : storedResult === "0-1" ? "w"
        : (session?.playerColor ?? "w")
      : undefined;

  const game = useChessGame(restoredFen, restoredHistory, hasResumableGame ? storedStatus : undefined, restoredTerminatingColor);
  const engine = useStockfishWorker();
  const clock = useGameClock(session?.timeControl ?? DEFAULT_TIME_CONTROL);
  const { playMoveSound, playSound: playSfx } = useSound();

  const clockRestoredRef = useRef(false);
  useEffect(() => {
    if (hasResumableGame && !clockRestoredRef.current && storedClock.activeColor) {
      clock.restore(storedClock.whiteMs, storedClock.blackMs, storedClock.activeColor);
      clockRestoredRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playerColor = session?.playerColor ?? "w";
  const isFlipped = boardFlipped
    ? playerColor === "w"
    : playerColor === "b";

  const playerName = authUser?.username ?? "Player";

  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const gameRef = useRef(game);
  gameRef.current = game;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const playSfxRef = useRef(playSfx);
  playSfxRef.current = playSfx;

  // ── Extracted hooks ──

  const { drawOfferStatus, handleOfferDraw, resetDrawOffer } = useDrawOffer(
    engineRef, gameRef, sessionRef,
  );

  const {
    eloResult, gameSubmitError, submittedGameIdRef, resetSubmission,
  } = useGameSubmission(
    sessionRef, gameRef, clockRef, engineRef,
    setAiThinking, playSfxRef,
    game.isGameOver, game.status, game.result,
  );

  const {
    isAnalyzing, analysisProgress, classifications, postGameStats,
    analysisEvals, analysisBestMoves, handleAnalyzeGame, cancelAnalysis, resetAnalysis,
  } = useGameAnalysis(engineRef, gameRef, sessionRef, submittedGameIdRef);

  const {
    viewingMoveIndex, viewingBoard, setViewingMoveIndex,
    handleSelectMove, handleReturnToLive,
    handleGoToStart, handleGoBack, handleGoForward,
  } = useHistoryNavigation(game.history, game.isGameOver, game.fen, !!session, flipBoard);

  // ── Sync game state to store for persistence ──

  useEffect(() => {
    if (!session) return;
    syncPosition({
      fen: game.fen,
      history: game.history,
      status: game.status,
      result: game.result,
      turn: game.turn,
      isCheck: game.isCheck,
    });
  }, [game.fen, game.status, session, syncPosition, game.history, game.result, game.turn, game.isCheck]);

  useEffect(() => {
    if (!session) return;
    syncClock({
      whiteMs: clockRef.current.whiteMs,
      blackMs: clockRef.current.blackMs,
      activeColor: clock.activeColor,
      flaggedColor: clock.flaggedColor,
    });
  }, [clock.activeColor, clock.flaggedColor, session, syncClock]);

  // ── AI engine interaction ──

  const requestEngineMove = useCallback(
    (fen: string) => {
      const sess = sessionRef.current;
      if (!sess) return;
      setAiThinking(true);
      engine.findBestMove(fen, sess.engineLevel);
    },
    [engine.findBestMove],
  );

  useEffect(() => {
    if (!engine.bestMove || !session || !aiThinking) return;
    const move = parseUciMove(engine.bestMove);
    const result = gameRef.current.makeMove(move);
    setAiThinking(false);
    if (result) {
      setLastMove({ from: result.from, to: result.to });
      const movedColor: PieceColor = session.playerColor === "w" ? "b" : "w";
      clockRef.current.switchClock(movedColor);
      playMoveSound(result, gameRef.current.isCheck);
    }
  }, [engine.bestMove, session, aiThinking, setLastMove, playMoveSound]);

  useEffect(() => {
    if (!session || game.isGameOver) return;
    if (game.turn === session.playerColor) return;
    if (aiThinking) return;
    if (engine.engineStatus !== "ready") return;
    requestEngineMove(game.fen);
  }, [game.fen, game.turn, game.isGameOver, session, aiThinking, engine.engineStatus, requestEngineMove]);

  // ── Game lifecycle ──

  const handleStartGame = useCallback(
    (newSession: GameSession) => {
      resetGameStore();
      setSession(newSession);
      cancelAnalysis();
      gameRef.current.reset();
      clockRef.current.reset(newSession.timeControl);
      setPremove(null);
      setBestMoveArrow(null);
      setLastMove(null);
      setShowNewGameDialog(false);
      setAiThinking(false);
      resetSubmission();
      resetDrawOffer();
      resetAnalysis();
      setViewingMoveIndex(null);
      clockRestoredRef.current = false;
      clockRef.current.start("w");
    },
    [resetGameStore, setSession, setPremove, setBestMoveArrow, setLastMove, cancelAnalysis, resetSubmission, resetDrawOffer, resetAnalysis, setViewingMoveIndex],
  );

  const handlePlayerMove = useCallback(
    (move: ChessMove): boolean => {
      if (!sessionRef.current) return false;
      const result = gameRef.current.makeMove(move);
      if (!result) return false;
      setLastMove({ from: result.from, to: result.to });
      setBestMoveArrow(null);
      clockRef.current.switchClock(sessionRef.current.playerColor);
      playMoveSound(result, gameRef.current.isCheck);
      return true;
    },
    [setLastMove, setBestMoveArrow, playMoveSound],
  );

  const handlePremove = useCallback(
    (move: ChessMove) => { setPremove(move); },
    [setPremove],
  );

  useEffect(() => {
    if (clock.flaggedColor && !game.isGameOver) {
      game.setFlagged(clock.flaggedColor);
    }
  }, [clock.flaggedColor, game.isGameOver, game.setFlagged]);

  // Low-time tick sound
  const lastTickSecondRef = useRef(-1);
  useEffect(() => {
    if (game.isGameOver || !session) return;
    if (clock.activeColor !== playerColor) {
      lastTickSecondRef.current = -1;
      return;
    }

    const interval = setInterval(() => {
      const playerMsRef = playerColor === "w" ? clock.whiteMsRef : clock.blackMsRef;
      const ms = playerMsRef.current;
      if (ms > 0 && ms < 10_000) {
        const sec = Math.ceil(ms / 1000);
        if (sec !== lastTickSecondRef.current) {
          lastTickSecondRef.current = sec;
          playSfxRef.current("lowTime");
        }
      } else {
        lastTickSecondRef.current = -1;
      }
    }, 200);

    return () => clearInterval(interval);
  }, [clock.activeColor, playerColor, game.isGameOver, session, clock.whiteMsRef, clock.blackMsRef]);

  // ── Game controls ──

  const handleResign = useCallback(() => {
    if (!sessionRef.current) return;
    gameRef.current.resign(sessionRef.current.playerColor);
  }, []);

  const handleTakeback = useCallback(() => {
    if (!sessionRef.current || gameRef.current.isGameOver) return;
    const history = gameRef.current.history;
    if (history.length === 0) return;
    const lastMoveIsWhite = history.length % 2 === 1;
    const lastMoveByPlayer = (sessionRef.current.playerColor === "w") === lastMoveIsWhite;
    const count = lastMoveByPlayer ? 1 : 2;
    gameRef.current.undo(count);
    setLastMove(null);
    setBestMoveArrow(null);
    setAiThinking(false);
    engineRef.current.stopThinking();
  }, [setLastMove, setBestMoveArrow]);

  const handleToggleHint = useCallback(() => {
    if (engine.evaluation && engine.bestMove) {
      const move = parseUciMove(engine.bestMove);
      setBestMoveArrow({ from: move.from, to: move.to });
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setBestMoveArrow(null), 3000);
    }
  }, [engine.evaluation, engine.bestMove, setBestMoveArrow]);

  useEffect(() => {
    return () => { clearTimeout(hintTimerRef.current); };
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (!sessionRef.current) return;
    handleStartGame(sessionRef.current);
  }, [handleStartGame]);

  const handleNewGame = useCallback(() => {
    setShowNewGameDialog(true);
  }, []);

  const handleQuickPlay = useCallback(() => {
    const lastSettings = useGameStore.getState().lastGameSettings;
    if (!lastSettings) {
      setShowNewGameDialog(true);
      return;
    }
    const level = ENGINE_LEVELS[lastSettings.levelIndex] ?? ENGINE_LEVELS[4];
    const tc = TIME_CONTROLS.find((t) => t.id === lastSettings.timeControlId) ?? DEFAULT_TIME_CONTROL;
    const playerColor: PieceColor =
      lastSettings.colorChoice === "random"
        ? Math.random() < 0.5 ? "w" : "b"
        : lastSettings.colorChoice;
    handleStartGame({ playerColor, engineLevel: level, timeControl: tc, isRated: lastSettings.isRated });
  }, [handleStartGame]);

  const handleNextLevel = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess) return;
    const nextIndex = ENGINE_LEVELS.findIndex((l) => l.level === sess.engineLevel.level) + 1;
    if (nextIndex >= ENGINE_LEVELS.length) return;
    handleStartGame({ ...sess, engineLevel: ENGINE_LEVELS[nextIndex] });
  }, [handleStartGame]);

  // ── Derived values ──

  const pgnString = useMemo(
    () => (game.isGameOver ? game.pgn() : ""),
    [game.isGameOver, game.pgn],
  );

  const openingName = useMemo(
    () => lookupOpening(game.history),
    [game.history],
  );

  const resolvedBestMoveArrow = useMemo(() => {
    if (viewingMoveIndex != null) {
      const uci = analysisBestMoves[viewingMoveIndex + 1];
      if (!uci || uci.length < 4) return null;
      return parseUciMove(uci);
    }
    return bestMoveArrow;
  }, [viewingMoveIndex, analysisBestMoves, bestMoveArrow]);

  const viewedAnnotation = useMemo(
    () => buildViewedAnnotation(viewingMoveIndex, classifications, game.history, analysisEvals, analysisBestMoves),
    [viewingMoveIndex, classifications, game.history, analysisEvals, analysisBestMoves],
  );

  const { checkGameAchievements } = useAchievementChecker();
  const incrementWinStreak = useGameStore((s) => s.incrementWinStreak);
  const resetWinStreak = useGameStore((s) => s.resetWinStreak);
  const winStreak = useGameStore((s) => s.winStreak);
  const onChallengeGameComplete = useChallengeStore((s) => s.onGameComplete);

  // Check achievements and track win streak when game ends
  const achievementCheckedRef = useRef(false);
  useEffect(() => {
    if (!game.isGameOver || achievementCheckedRef.current) return;
    if (!session) return;
    achievementCheckedRef.current = true;

    const playerWon = isPlayerWin(session.playerColor, game.result);
    const isDraw = game.result === "1/2-1/2";
    if (playerWon) incrementWinStreak();
    else if (!isDraw) resetWinStreak();

    onChallengeGameComplete(playerWon, session.engineLevel.level, session.playerColor);

    checkGameAchievements({
      result: game.result,
      playerColor: session.playerColor,
      aiLevel: session.engineLevel.level,
      termination: game.status,
      moveCount: game.history.length,
      eloAfter: eloResult?.after ?? null,
    });
  }, [game.isGameOver, game.result, game.status, game.history.length, session, eloResult, checkGameAchievements, incrementWinStreak, resetWinStreak, onChallengeGameComplete]);

  // Reset achievement check flag on new game
  useEffect(() => {
    if (!game.isGameOver) {
      achievementCheckedRef.current = false;
    }
  }, [game.isGameOver]);

  // Auto-analyze when game ends (if preference is on)
  const autoAnalyze = useGameStore((s) => s.autoAnalyze);
  const autoAnalyzeTriggeredRef = useRef(false);
  useEffect(() => {
    if (game.isGameOver && autoAnalyze && !autoAnalyzeTriggeredRef.current && !isAnalyzing && !postGameStats) {
      autoAnalyzeTriggeredRef.current = true;
      // Small delay to let game-end UI render first
      const timer = setTimeout(() => handleAnalyzeGame(), 1000);
      return () => clearTimeout(timer);
    }
    if (!game.isGameOver) autoAnalyzeTriggeredRef.current = false;
  }, [game.isGameOver, autoAnalyze, isAnalyzing, postGameStats, handleAnalyzeGame]);

  useKeyboardShortcuts({
    onHint: handleToggleHint,
    isGameActive: !!session && !game.isGameOver,
    onToggleShortcutHelp: () => setShowShortcutHelp((v) => !v),
  });

  // ── Coach mode (auto for levels 1-3) ──
  const isCoachMode = !!session && session.engineLevel.level <= 3;
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null);
  const prevEvalRef = useRef<typeof engine.evaluation>(null);

  useEffect(() => {
    if (!isCoachMode || !session || game.isGameOver) return;
    const tip = getCoachTip(
      game.history,
      engine.evaluation,
      prevEvalRef.current,
      session.playerColor,
      game.turn === session.playerColor,
    );
    if (tip) setCoachTip(tip);
    prevEvalRef.current = engine.evaluation;
  }, [engine.evaluation, isCoachMode, session, game.isGameOver, game.turn, game.history]);

  const isAnalysisMode = game.isGameOver && postGameStats !== null;

  const topColor: PieceColor = isFlipped ? "w" : "b";
  const bottomColor: PieceColor = isFlipped ? "b" : "w";
  const topIsPlayer = topColor === playerColor;
  const bottomIsPlayer = bottomColor === playerColor;

  const aiLevelLabel = session
    ? `AI ${session.engineLevel.label}`
    : "AI";

  const avatarId = useGameStore((s) => s.avatarId);
  const avatarImage = useGameStore((s) => s.avatarImage);
  const currentPlayerRating = session && authProfile
    ? session.timeControl.category === "bullet" ? authProfile.eloBullet
      : session.timeControl.category === "rapid" ? authProfile.eloRapid
      : authProfile.eloBlitz
    : undefined;

  const initialMs = session?.timeControl.initialMs ?? 0;

  const showDashboard = !session || !hasResumableGame;

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      <NewGameDialog open={showNewGameDialog} onClose={() => setShowNewGameDialog(false)} onStart={handleStartGame} />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
      <KeyboardShortcutHelp open={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />

      {showDashboard ? (
        <Dashboard
          authUser={authUser}
          authProfile={authProfile}
          onQuickPlay={handleQuickPlay}
          onNewGame={() => setShowNewGameDialog(true)}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={() => { authLogout(); resetGameStore(); }}
          onOpenSettings={() => setShowSettings(true)}
        />
      ) : (
        <>
          <GameHeader
            hasSession={!!session}
            authUser={authUser}
            authProfile={authProfile}
            onNewGame={() => setShowNewGameDialog(true)}
            onSignIn={() => setShowAuthModal(true)}
            onSignOut={() => { authLogout(); resetGameStore(); }}
            onOpenSettings={() => setShowSettings(true)}
          />

          {/* Screen reader announcements */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {game.history.length > 0 && (() => {
              const last = game.history[game.history.length - 1];
              const moveNum = Math.ceil(game.history.length / 2);
              const side = game.history.length % 2 === 1 ? "White" : "Black";
              const check = game.isCheck ? ", check" : "";
              if (game.isGameOver) {
                const resultText = game.status === "checkmate" ? "Checkmate" : game.status.replace("_", " ");
                return `${side} plays ${last.san}${check}. ${resultText}. ${game.result}`;
              }
              return `Move ${moveNum}: ${side} plays ${last.san}${check}`;
            })()}
          </div>

          <div className="flex w-full max-w-5xl flex-col items-center gap-4 md:flex-row md:items-start md:justify-center">
          <div className="flex w-full max-w-[900px] flex-col gap-2 md:flex-1">
            <PlayerClockRow
              color={topColor}
              isPlayer={topIsPlayer}
              playerName={playerName}
              aiLabel={aiLevelLabel}
              aiLevel={session?.engineLevel.level}
              aiElo={session?.engineLevel.elo}
              playerRating={currentPlayerRating}
              avatarId={avatarId}
              avatarImage={avatarImage}
              isAiThinking={aiThinking}
              history={game.history}
              pieceSet={pieceSet}
              timeMsRef={topColor === "w" ? clock.whiteMsRef : clock.blackMsRef}
              timeMs={topColor === "w" ? clock.whiteMs : clock.blackMs}
              initialMs={initialMs}
              isClockActive={clock.activeColor === topColor}
            />

            <div className="relative">
              {showEvalBar && (
                <div className="absolute -left-8 top-0 bottom-0 hidden w-6 md:block">
                  <EvalBar
                    evaluation={viewingMoveIndex != null && analysisEvals[viewingMoveIndex + 1]
                      ? analysisEvals[viewingMoveIndex + 1]
                      : engine.evaluation}
                    playerColor={playerColor}
                    flipped={isFlipped}
                  />
                </div>
              )}
              <ChessBoard
                board={viewingBoard ?? game.board}
                turn={game.turn}
                playerColor={playerColor}
                isGameOver={game.isGameOver || viewingMoveIndex != null}
                isCheck={viewingMoveIndex == null && game.isCheck}
                flipped={isFlipped}
                theme={theme}
                pieceSet={pieceSet}
                showCoordinates={showCoordinates}
                lastMove={viewingMoveIndex != null
                  ? { from: game.history[viewingMoveIndex].from, to: game.history[viewingMoveIndex].to }
                  : lastMove}
                premove={viewingMoveIndex == null ? premove : null}
                bestMoveArrow={resolvedBestMoveArrow}
                getLegalMovesForSquare={game.getLegalMovesForSquare}
                onMove={handlePlayerMove}
                onPremove={handlePremove}
              />
            </div>

            {isCoachMode && <CoachBubble tip={coachTip} />}

            <PlayerClockRow
              color={bottomColor}
              isPlayer={bottomIsPlayer}
              playerName={playerName}
              aiLabel={aiLevelLabel}
              aiLevel={session?.engineLevel.level}
              aiElo={session?.engineLevel.elo}
              playerRating={currentPlayerRating}
              avatarId={avatarId}
              avatarImage={avatarImage}
              isAiThinking={aiThinking}
              history={game.history}
              pieceSet={pieceSet}
              timeMsRef={bottomColor === "w" ? clock.whiteMsRef : clock.blackMsRef}
              timeMs={bottomColor === "w" ? clock.whiteMs : clock.blackMs}
              initialMs={initialMs}
              isClockActive={clock.activeColor === bottomColor}
            />
          </div>

          <GameSidebar
            isGameOver={game.isGameOver}
            gameStatus={game.status}
            gameResult={game.result}
            playerColor={playerColor}
            history={game.history}
            aiThinking={aiThinking}
            canTakeback={!game.isGameOver && game.history.length > 0 && !aiThinking}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onTakeback={handleTakeback}
            onFlipBoard={flipBoard}
            onToggleHint={handleToggleHint}
            drawOfferStatus={drawOfferStatus}
            openingName={openingName}
            viewingMoveIndex={viewingMoveIndex}
            isAnalysisMode={isAnalysisMode}
            onSelectMove={handleSelectMove}
            onReturnToLive={handleReturnToLive}
            onGoToStart={handleGoToStart}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            classifications={classifications}
            analysisEvals={analysisEvals}
            analysisBestMoves={analysisBestMoves}
            postGameStats={postGameStats}
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
            onAnalyze={handleAnalyzeGame}
            pgn={pgnString}
            onPlayAgain={handlePlayAgain}
            onNewGame={handleNewGame}
            eloResult={eloResult}
            gameSubmitError={gameSubmitError}
            isGuest={!authUser}
            onSignIn={() => setShowAuthModal(true)}
            viewedAnnotation={viewedAnnotation}
            onNextLevel={handleNextLevel}
            sessionLevel={session?.engineLevel.level}
            winStreak={winStreak}
            onToggleShortcutHelp={() => setShowShortcutHelp(true)}
          />
        </div>
        </>
      )}
    </div>
  );
}
