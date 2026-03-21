import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChessGame } from "@/hooks/use-chess-game";
import { useStockfishWorker } from "@/hooks/use-stockfish-worker";
import { useGameClock } from "@/hooks/use-game-clock";
import { useGameStore } from "@/stores/game-store";
import { useAuthStore } from "@/stores/auth-store";
import { BOARD_THEMES } from "@/constants/board-themes";
import { DEFAULT_TIME_CONTROL } from "@/constants/time-controls";
import { ChessBoard } from "@/components/board/ChessBoard";
import { ClockPanel } from "@/components/game/ClockPanel";
import { EvalBar } from "@/components/game/EvalBar";
import { MoveHistory } from "@/components/game/MoveHistory";
import { GameControls } from "@/components/game/GameControls";
import { ThinkingIndicator } from "@/components/game/ThinkingIndicator";
import { PostGamePanel } from "@/components/game/PostGamePanel";
import { NewGameDialog } from "./NewGameDialog";
import { AuthModal } from "./AuthModal";
import { gameApi } from "@/lib/api";
import { useSound } from "@/hooks/use-sound";
import type { PieceColor, ChessMove, Square, GameStatus } from "@/types/chess";
import type { GameSession } from "@/types/game";

function parseUciMove(uci: string): ChessMove {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4
      ? (uci[4] as ChessMove["promotion"])
      : undefined,
  };
}

function statusToTermination(status: GameStatus): string {
  const map: Record<string, string> = {
    checkmate: "checkmate",
    stalemate: "stalemate",
    draw_repetition: "threefold_repetition",
    draw_insufficient: "insufficient_material",
    draw_50move: "fifty_move_rule",
    draw_agreement: "draw_agreed",
    resigned: "resign",
    flagged: "flag",
  };
  return map[status] ?? "resign";
}

export function GamePage() {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);
  const storedFen = useGameStore((s) => s.fen);
  const storedHistory = useGameStore((s) => s.history);
  const storedStatus = useGameStore((s) => s.status);
  const storedClock = useGameStore((s) => s.clock);
  const boardThemeId = useGameStore((s) => s.boardThemeId);
  const pieceSet = useGameStore((s) => s.pieceSet);
  const boardFlipped = useGameStore((s) => s.boardFlipped);
  const flipBoard = useGameStore((s) => s.flipBoard);
  const showCoordinates = useGameStore((s) => s.showCoordinates);
  const showEvalBar = useGameStore((s) => s.showEvalBar);
  const syncPosition = useGameStore((s) => s.syncPosition);
  const syncClock = useGameStore((s) => s.syncClock);
  const premove = useGameStore((s) => s.premove);
  const setPremove = useGameStore((s) => s.setPremove);
  const setLastMove = useGameStore((s) => s.setLastMove);
  const lastMove = useGameStore((s) => s.lastMove);
  const bestMoveArrow = useGameStore((s) => s.bestMoveArrow);
  const setBestMoveArrow = useGameStore((s) => s.setBestMoveArrow);
  const resetGameStore = useGameStore((s) => s.resetGame);

  const hasActiveGame = session && storedStatus === "active";
  const [showNewGameDialog, setShowNewGameDialog] = useState(!session || !hasActiveGame);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [eloChange, setEloChange] = useState<number | null>(null);
  const gameSubmittedRef = useRef(false);
  const gameStartTimeRef = useRef(Date.now());

  const authUser = useAuthStore((s) => s.user);
  const authProfile = useAuthStore((s) => s.playerProfile);
  const authLogout = useAuthStore((s) => s.logout);
  const authLoadUser = useAuthStore((s) => s.loadUser);
  const authRefreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    authLoadUser();
  }, [authLoadUser]);

  const restoredFen = hasActiveGame ? storedFen : undefined;
  const restoredHistory = hasActiveGame ? storedHistory : undefined;
  const game = useChessGame(restoredFen, restoredHistory);
  const engine = useStockfishWorker();
  const clock = useGameClock(session?.timeControl ?? DEFAULT_TIME_CONTROL);
  const { playMoveSound, playSound: playSfx } = useSound();

  // Restore clock once on mount if there's an active game
  const clockRestoredRef = useRef(false);
  useEffect(() => {
    if (hasActiveGame && !clockRestoredRef.current && storedClock.activeColor) {
      clock.restore(storedClock.whiteMs, storedClock.blackMs, storedClock.activeColor);
      clockRestoredRef.current = true;
    }
    // Only run on mount — storedClock is the initial persisted value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = useMemo(
    () => BOARD_THEMES.find((t) => t.id === boardThemeId) ?? BOARD_THEMES[1],
    [boardThemeId],
  );

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

  // Sync game state to store for persistence
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

  // Sync clock to store only on move (activeColor change) or game-over (flagged), not every tick
  useEffect(() => {
    if (!session) return;
    syncClock({
      whiteMs: clockRef.current.whiteMs,
      blackMs: clockRef.current.blackMs,
      activeColor: clock.activeColor,
      flaggedColor: clock.flaggedColor,
    });
  }, [clock.activeColor, clock.flaggedColor, session, syncClock]);

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

  const handleStartGame = useCallback(
    (newSession: GameSession) => {
      resetGameStore();
      setSession(newSession);
      gameRef.current.reset();
      clockRef.current.reset(newSession.timeControl);
      setPremove(null);
      setBestMoveArrow(null);
      setLastMove(null);
      setShowNewGameDialog(false);
      setAiThinking(false);
      setEloChange(null);
      gameSubmittedRef.current = false;
      gameStartTimeRef.current = Date.now();
      clockRestoredRef.current = false;
      clockRef.current.start("w");
    },
    [resetGameStore, setSession, setPremove, setBestMoveArrow, setLastMove],
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

  // Low-time tick sound (every second below 10s)
  const lastTickSecondRef = useRef(-1);
  useEffect(() => {
    if (game.isGameOver || !session) return;
    const playerMs = playerColor === "w" ? clock.whiteMs : clock.blackMs;
    if (playerMs > 0 && playerMs < 10_000 && clock.activeColor === playerColor) {
      const sec = Math.ceil(playerMs / 1000);
      if (sec !== lastTickSecondRef.current) {
        lastTickSecondRef.current = sec;
        playSfx("lowTime");
      }
    } else {
      lastTickSecondRef.current = -1;
    }
  }, [clock.whiteMs, clock.blackMs, clock.activeColor, playerColor, game.isGameOver, session, playSfx]);

  // Stable ref for profile refresh so game-over effect doesn't go stale
  const authRefreshProfileRef = useRef(authRefreshProfile);
  authRefreshProfileRef.current = authRefreshProfile;
  const playSfxRef = useRef(playSfx);
  playSfxRef.current = playSfx;

  // Game over: pause clock, play sound, submit game to API
  useEffect(() => {
    if (!game.isGameOver) return;
    clockRef.current.pause();
    engineRef.current.stopThinking();
    setAiThinking(false);

    if (game.status === "checkmate") {
      playSfxRef.current("checkmate");
    } else {
      playSfxRef.current("gameEnd");
    }

    if (gameSubmittedRef.current) return;
    const sess = sessionRef.current;
    const user = useAuthStore.getState().user;
    if (!sess || !user) return;

    gameSubmittedRef.current = true;

    let playerResult: string;
    const r = game.result;
    if (r === "1/2-1/2") {
      playerResult = "draw";
    } else if (
      (sess.playerColor === "w" && r === "1-0") ||
      (sess.playerColor === "b" && r === "0-1")
    ) {
      playerResult = "win";
    } else {
      playerResult = "loss";
    }

    const durationSeconds = Math.round((Date.now() - gameStartTimeRef.current) / 1000);
    const pgn = gameRef.current.pgn() + " " + game.result;

    gameApi.submit({
      aiLevel: sess.engineLevel.level,
      timeControl: sess.timeControl.category,
      isRated: true,
      result: playerResult,
      termination: statusToTermination(game.status),
      playerColor: sess.playerColor === "w" ? "white" : "black",
      pgn,
      accuracyPlayer: 0,
      durationSeconds,
    }).then(({ data }) => {
      setEloChange(data.eloChange);
      authRefreshProfileRef.current();
    }).catch((err) => {
      console.error("Failed to submit game:", err?.response?.data ?? err);
    });
  }, [game.isGameOver, game.result, game.status]);

  const handleResign = useCallback(() => {
    if (!sessionRef.current) return;
    gameRef.current.resign(sessionRef.current.playerColor);
  }, []);

  const handleOfferDraw = useCallback(() => {}, []);

  const handleToggleHint = useCallback(() => {
    if (engine.evaluation && engine.bestMove) {
      const move = parseUciMove(engine.bestMove);
      setBestMoveArrow({ from: move.from, to: move.to });
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setBestMoveArrow(null), 3000);
    }
  }, [engine.evaluation, engine.bestMove, setBestMoveArrow]);

  useEffect(() => {
    return () => clearTimeout(hintTimerRef.current);
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (!sessionRef.current) return;
    handleStartGame(sessionRef.current);
  }, [handleStartGame]);

  const handleNewGame = useCallback(() => {
    setShowNewGameDialog(true);
  }, []);

  const pgnString = useMemo(
    () => (game.isGameOver ? game.pgn() : ""),
    [game.isGameOver, game.pgn],
  );

  const topColor: PieceColor = isFlipped ? "w" : "b";
  const bottomColor: PieceColor = isFlipped ? "b" : "w";
  const topIsPlayer = topColor === playerColor;
  const bottomIsPlayer = bottomColor === playerColor;

  const aiLevelLabel = session
    ? `AI L${session.engineLevel.level}`
    : "AI";

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      {/* Top bar */}
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">♚ ChessArena</h1>
        <div className="flex items-center gap-3">
          {authUser ? (
            <>
              <span className="text-sm text-foreground font-medium">
                {authUser.username}
              </span>
              {authProfile && (
                <>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    ⚡{authProfile.eloBlitz} 🕐{authProfile.eloRapid} 🔵{authProfile.eloBullet}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {authProfile.stats.totalGames}G {authProfile.stats.wins}W {authProfile.stats.losses}L
                  </span>
                </>
              )}
              <button
                onClick={() => { authLogout(); resetGameStore(); setShowNewGameDialog(false); }}
                className="rounded bg-muted px-3 py-1 text-sm text-muted-foreground hover:bg-border"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <AuthModal
        open={showAuthModal || !authUser}
        onClose={() => setShowAuthModal(false)}
      />
      <NewGameDialog open={showNewGameDialog && !!authUser} onStart={handleStartGame} />

      {session && authUser && (
        <div className="flex w-full max-w-5xl items-start justify-center gap-4">
          <div className="flex w-full max-w-[900px] flex-col gap-2">
            {/* Top clock */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground truncate">
                {topIsPlayer ? playerName : aiLevelLabel}
                {!topIsPlayer && aiThinking && (
                  <span className="ml-1 animate-pulse">♞</span>
                )}
              </span>
              <div className="flex-1">
                <ClockPanel
                  color={topColor}
                  timeMs={topColor === "w" ? clock.whiteMs : clock.blackMs}
                  isActive={clock.activeColor === topColor}
                  isLowTime={clock.isLowTime(topColor)}
                  isCriticalTime={clock.isCriticalTime(topColor)}
                />
              </div>
            </div>

            <div className="relative">
              {showEvalBar && (
                <div className="absolute -left-8 top-0 bottom-0 hidden w-6 md:block">
                  <EvalBar
                    evaluation={engine.evaluation}
                    playerColor={playerColor}
                    flipped={isFlipped}
                  />
                </div>
              )}
              <ChessBoard
                board={game.board}
                turn={game.turn}
                playerColor={playerColor}
                isGameOver={game.isGameOver}
                isCheck={game.isCheck}
                flipped={isFlipped}
                theme={theme}
                pieceSet={pieceSet}
                showCoordinates={showCoordinates}
                lastMove={lastMove}
                premove={premove}
                bestMoveArrow={bestMoveArrow}
                getLegalMovesForSquare={game.getLegalMovesForSquare}
                onMove={handlePlayerMove}
                onPremove={handlePremove}
              />
            </div>

            {/* Bottom clock */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground truncate">
                {bottomIsPlayer ? playerName : aiLevelLabel}
                {!bottomIsPlayer && aiThinking && (
                  <span className="ml-1 animate-pulse">♞</span>
                )}
              </span>
              <div className="flex-1">
                <ClockPanel
                  color={bottomColor}
                  timeMs={bottomColor === "w" ? clock.whiteMs : clock.blackMs}
                  isActive={clock.activeColor === bottomColor}
                  isLowTime={clock.isLowTime(bottomColor)}
                  isCriticalTime={clock.isCriticalTime(bottomColor)}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden w-64 shrink-0 self-start flex-col gap-3 md:flex" style={{ maxHeight: "calc(100vh - 120px)" }}>
            <ThinkingIndicator isThinking={aiThinking} />

            <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted p-2">
              <MoveHistory history={game.history} />
            </div>

            <GameControls
              isGameOver={game.isGameOver}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onFlipBoard={flipBoard}
              onToggleHint={handleToggleHint}
            />

            {game.isGameOver && (
              <>
                <PostGamePanel
                  status={game.status}
                  result={game.result}
                  playerColor={playerColor}
                  postGameStats={null}
                  pgn={pgnString}
                  onPlayAgain={handlePlayAgain}
                  onNewGame={handleNewGame}
                />
                {eloChange !== null && (
                  <div className="rounded-lg bg-muted p-3 text-center text-sm">
                    <span className="text-muted-foreground">Rating: </span>
                    <span className={eloChange > 0 ? "text-success font-bold" : eloChange < 0 ? "text-destructive font-bold" : "text-foreground"}>
                      {eloChange > 0 ? `+${eloChange}` : eloChange}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
