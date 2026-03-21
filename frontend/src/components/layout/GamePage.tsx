import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChessGame } from "@/hooks/use-chess-game";
import { useStockfishWorker } from "@/hooks/use-stockfish-worker";
import { useGameClock } from "@/hooks/use-game-clock";
import { useGameStore } from "@/stores/game-store";
import { useAuthStore } from "@/stores/auth-store";
import { BOARD_THEMES } from "@/constants/board-themes";
import { DEFAULT_TIME_CONTROL } from "@/constants/time-controls";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PlayerClockRow } from "@/components/game/PlayerClockRow";
import { EvalBar } from "@/components/game/EvalBar";
import { MoveHistory } from "@/components/game/MoveHistory";
import { GameControls } from "@/components/game/GameControls";
import { ThinkingIndicator } from "@/components/game/ThinkingIndicator";
import { PostGamePanel } from "@/components/game/PostGamePanel";
import { NewGameDialog } from "./NewGameDialog";
import { AuthModal } from "./AuthModal";
import { gameApi } from "@/lib/api";
import { lookupOpening } from "@/lib/openings";
import { classifyMoves, computePostGameStats } from "@/lib/move-classifier";
import { useSound } from "@/hooks/use-sound";
import type { PieceColor, ChessMove, GameStatus, BoardPiece } from "@/types/chess";
import type { MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import type { GameSession, PostGameStats } from "@/types/game";
import { Chess } from "chess.js";
import { INITIAL_FEN } from "@/constants/chess";
import { parseUciMove } from "@/lib/uci";

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

interface GamePageProps {
  readonly onNavigatePuzzles?: () => void;
  readonly onNavigateProfile?: () => void;
}

export function GamePage({ onNavigatePuzzles, onNavigateProfile }: GamePageProps) {
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
  const [drawOfferStatus, setDrawOfferStatus] = useState<"offered" | "accepted" | "declined" | null>(null);
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);
  const [gameSubmitError, setGameSubmitError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [classifications, setClassifications] = useState<ReadonlyMap<number, MoveClassification>>(new Map());
  const [postGameStats, setPostGameStats] = useState<PostGameStats | null>(null);
  const [analysisEvals, setAnalysisEvals] = useState<readonly EvalScore[]>([]);
  const [analysisBestMoves, setAnalysisBestMoves] = useState<readonly string[]>([]);
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
  const drawTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drawClearTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const gameRef = useRef(game);
  gameRef.current = game;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // When viewing history, derive board from the selected move's FEN
  const viewingBoard = useMemo<readonly (BoardPiece | null)[][] | null>(() => {
    if (viewingMoveIndex == null) return null;
    const move = game.history[viewingMoveIndex];
    if (!move) return null;
    const chess = new Chess(move.fen);
    return chess.board().map((row) =>
      row.map((sq) =>
        sq ? ({ type: sq.type, color: sq.color } as BoardPiece) : null,
      ),
    );
  }, [viewingMoveIndex, game.history]);

  // Return to live position when a new move is made during active game
  useEffect(() => {
    if (!game.isGameOver && viewingMoveIndex != null) {
      setViewingMoveIndex(null);
    }
  }, [game.fen, game.isGameOver, viewingMoveIndex]);

  const handleSelectMove = useCallback((index: number) => {
    setViewingMoveIndex(index);
  }, []);

  const handleReturnToLive = useCallback(() => {
    setViewingMoveIndex(null);
  }, []);

  // Keyboard navigation for move history
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!session) return;

      const historyLen = gameRef.current.history.length;
      if (historyLen === 0) return;

      switch (e.key) {
        case "ArrowLeft": {
          e.preventDefault();
          setViewingMoveIndex((prev) => {
            if (prev == null) return historyLen - 2 >= 0 ? historyLen - 2 : 0;
            return Math.max(0, prev - 1);
          });
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          setViewingMoveIndex((prev) => {
            if (prev == null) return null;
            if (prev >= historyLen - 1) return null;
            return prev + 1;
          });
          break;
        }
        case "Home": {
          e.preventDefault();
          setViewingMoveIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setViewingMoveIndex(null);
          break;
        }
        case "f": {
          if (!e.ctrlKey && !e.metaKey) {
            flipBoard();
          }
          break;
        }
        case "Escape": {
          setViewingMoveIndex(null);
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [session, flipBoard]);

  const analysisCancelledRef = useRef(false);
  const handleAnalyzeGame = useCallback(async () => {
    if (isAnalyzing || !game.isGameOver) return;
    const history = gameRef.current.history;
    if (history.length === 0) return;

    analysisCancelledRef.current = false;
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const fens = [INITIAL_FEN, ...history.map((m) => m.fen)];
    const evals: EvalScore[] = [];
    const bestMoves: string[] = [];
    const depth = 14;

    let lastProgress = 0;
    for (let i = 0; i < fens.length; i++) {
      if (analysisCancelledRef.current) return;
      const result = await engineRef.current.analyzePosition(fens[i], depth);
      if (analysisCancelledRef.current) return;
      evals.push(result.evaluation);
      bestMoves.push(result.bestMove);
      const pct = Math.round(((i + 1) / fens.length) * 100);
      if (pct !== lastProgress) {
        lastProgress = pct;
        setAnalysisProgress(pct);
      }
    }

    setClassifications(classifyMoves(evals));
    setAnalysisEvals(evals);
    setAnalysisBestMoves(bestMoves);
    setPostGameStats(computePostGameStats(evals));
    setIsAnalyzing(false);
  }, [isAnalyzing, game.isGameOver]);

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
      analysisCancelledRef.current = true;
      gameRef.current.reset();
      clockRef.current.reset(newSession.timeControl);
      setPremove(null);
      setBestMoveArrow(null);
      setLastMove(null);
      setShowNewGameDialog(false);
      setAiThinking(false);
      setEloChange(null);
      setGameSubmitError(null);
      setDrawOfferStatus(null);
      setViewingMoveIndex(null);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setClassifications(new Map());
      setPostGameStats(null);
      setAnalysisEvals([]);
      setAnalysisBestMoves([]);
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

  // Low-time tick sound (every second below 10s) — reads from ref to avoid re-renders
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
      setGameSubmitError(null);
      authRefreshProfileRef.current();
    }).catch((err) => {
      console.error("Failed to submit game:", err?.response?.data ?? err);
      setGameSubmitError("Failed to save game result. Your rating was not updated.");
      gameSubmittedRef.current = false; // Allow retry
    });
  }, [game.isGameOver, game.result, game.status]);

  const handleResign = useCallback(() => {
    if (!sessionRef.current) return;
    gameRef.current.resign(sessionRef.current.playerColor);
  }, []);

  const handleTakeback = useCallback(() => {
    if (!sessionRef.current || gameRef.current.isGameOver) return;
    const history = gameRef.current.history;
    if (history.length === 0) return;
    // Determine if the last move was by the player or AI
    const lastMoveIsWhite = history.length % 2 === 1;
    const lastMoveByPlayer = (sessionRef.current.playerColor === "w") === lastMoveIsWhite;
    // If last move was by player, undo 1; if by AI, undo 2 (AI + player's preceding move)
    const count = lastMoveByPlayer ? 1 : 2;
    gameRef.current.undo(count);
    setLastMove(null);
    setBestMoveArrow(null);
    setAiThinking(false);
    engineRef.current.stopThinking();
  }, [setLastMove, setBestMoveArrow]);

  const handleOfferDraw = useCallback(() => {
    if (!sessionRef.current || gameRef.current.isGameOver) return;
    if (drawOfferStatus === "offered") return;

    setDrawOfferStatus("offered");

    const evalIsRoughlyEqual = (() => {
      const ev = engineRef.current.evaluation;
      if (!ev) return true; // No eval available — give benefit of the doubt
      if (ev.type === "mate") return false; // Mate in sight — AI declines
      return Math.abs(ev.value) <= 150;
    })();

    drawTimerRef.current = setTimeout(() => {
      if (evalIsRoughlyEqual) {
        gameRef.current.agreeDraw();
        setDrawOfferStatus("accepted");
      } else {
        setDrawOfferStatus("declined");
      }
      drawClearTimerRef.current = setTimeout(() => setDrawOfferStatus(null), 2000);
    }, 1000);
  }, [drawOfferStatus]);

  const handleToggleHint = useCallback(() => {
    if (engine.evaluation && engine.bestMove) {
      const move = parseUciMove(engine.bestMove);
      setBestMoveArrow({ from: move.from, to: move.to });
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setBestMoveArrow(null), 3000);
    }
  }, [engine.evaluation, engine.bestMove, setBestMoveArrow]);

  useEffect(() => {
    return () => {
      clearTimeout(hintTimerRef.current);
      clearTimeout(drawTimerRef.current);
      clearTimeout(drawClearTimerRef.current);
    };
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

  const topColor: PieceColor = isFlipped ? "w" : "b";
  const bottomColor: PieceColor = isFlipped ? "b" : "w";
  const topIsPlayer = topColor === playerColor;
  const bottomIsPlayer = bottomColor === playerColor;

  const aiLevelLabel = session
    ? `AI L${session.engineLevel.level}`
    : "AI";

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">♚ ChessArena</h1>
          {onNavigatePuzzles && (
            <button
              onClick={onNavigatePuzzles}
              className="rounded bg-muted px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-border"
            >
              Puzzles
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {authUser ? (
            <>
              <button
                onClick={onNavigateProfile}
                className="text-sm text-foreground font-medium hover:underline"
              >
                {authUser.username}
              </button>
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

      {session && authUser && (
        <div className="flex w-full max-w-5xl items-start justify-center gap-4">
          <div className="flex w-full max-w-[900px] flex-col gap-2">
            <PlayerClockRow
              color={topColor}
              isPlayer={topIsPlayer}
              playerName={playerName}
              aiLabel={aiLevelLabel}
              isAiThinking={aiThinking}
              history={game.history}
              pieceSet={pieceSet}
              timeMsRef={topColor === "w" ? clock.whiteMsRef : clock.blackMsRef}
              timeMs={topColor === "w" ? clock.whiteMs : clock.blackMs}
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

            <PlayerClockRow
              color={bottomColor}
              isPlayer={bottomIsPlayer}
              playerName={playerName}
              aiLabel={aiLevelLabel}
              isAiThinking={aiThinking}
              history={game.history}
              pieceSet={pieceSet}
              timeMsRef={bottomColor === "w" ? clock.whiteMsRef : clock.blackMsRef}
              timeMs={bottomColor === "w" ? clock.whiteMs : clock.blackMs}
              isClockActive={clock.activeColor === bottomColor}
            />
          </div>

          <div className="hidden w-64 shrink-0 self-start flex-col gap-3 md:flex" style={{ maxHeight: "calc(100vh - 120px)" }}>
            <ThinkingIndicator isThinking={aiThinking} />

            {openingName && (
              <div className="rounded-lg bg-muted px-2 py-1.5">
                <span className="text-xs font-mono text-muted-foreground">{openingName.eco}</span>
                <span className="ml-1.5 text-xs text-foreground">{openingName.name}</span>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted p-2">
              <MoveHistory
                history={game.history}
                selectedMoveIndex={viewingMoveIndex}
                classifications={classifications}
                onSelectMove={handleSelectMove}
              />
              {viewingMoveIndex != null && (
                <button
                  onClick={handleReturnToLive}
                  className="mt-1 w-full rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/80"
                >
                  ▶ Live
                </button>
              )}
            </div>

            <GameControls
              isGameOver={game.isGameOver}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onTakeback={handleTakeback}
              onFlipBoard={flipBoard}
              onToggleHint={handleToggleHint}
              canTakeback={!game.isGameOver && game.history.length > 0 && !aiThinking}
            />

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

            {game.isGameOver && (
              <>
                <PostGamePanel
                  status={game.status}
                  result={game.result}
                  playerColor={playerColor}
                  postGameStats={postGameStats}
                  pgn={pgnString}
                  onPlayAgain={handlePlayAgain}
                  onNewGame={handleNewGame}
                  onAnalyze={handleAnalyzeGame}
                  isAnalyzing={isAnalyzing}
                  analysisProgress={analysisProgress}
                />
                {eloChange !== null && (
                  <div className="rounded-lg bg-muted p-3 text-center text-sm">
                    <span className="text-muted-foreground">Rating: </span>
                    <span className={eloChange > 0 ? "text-success font-bold" : eloChange < 0 ? "text-destructive font-bold" : "text-foreground"}>
                      {eloChange > 0 ? `+${eloChange}` : eloChange}
                    </span>
                  </div>
                )}
                {gameSubmitError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                    {gameSubmitError}
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
