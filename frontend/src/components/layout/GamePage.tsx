import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChessGame } from "@/hooks/use-chess-game";
import { useStockfishWorker } from "@/hooks/use-stockfish-worker";
import { useGameClock } from "@/hooks/use-game-clock";
import { useGameStore } from "@/stores/game-store";
import { BOARD_THEMES } from "@/constants/board-themes";
import { DEFAULT_TIME_CONTROL } from "@/constants/time-controls";
import { INITIAL_FEN } from "@/constants/chess";
import { ChessBoard } from "@/components/board/ChessBoard";
import { ClockPanel } from "@/components/game/ClockPanel";
import { EvalBar } from "@/components/game/EvalBar";
import { MoveHistory } from "@/components/game/MoveHistory";
import { GameControls } from "@/components/game/GameControls";
import { ThinkingIndicator } from "@/components/game/ThinkingIndicator";
import { PostGamePanel } from "@/components/game/PostGamePanel";
import { NewGameDialog } from "./NewGameDialog";
import type { PieceColor, ChessMove, Square } from "@/types/chess";
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

export function GamePage() {
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);
  const boardThemeId = useGameStore((s) => s.boardThemeId);
  const pieceSet = useGameStore((s) => s.pieceSet);
  const boardFlipped = useGameStore((s) => s.boardFlipped);
  const flipBoard = useGameStore((s) => s.flipBoard);
  const showCoordinates = useGameStore((s) => s.showCoordinates);
  const showEvalBar = useGameStore((s) => s.showEvalBar);
  const premove = useGameStore((s) => s.premove);
  const setPremove = useGameStore((s) => s.setPremove);
  const setLastMove = useGameStore((s) => s.setLastMove);
  const lastMove = useGameStore((s) => s.lastMove);
  const bestMoveArrow = useGameStore((s) => s.bestMoveArrow);
  const setBestMoveArrow = useGameStore((s) => s.setBestMoveArrow);
  const resetGameStore = useGameStore((s) => s.resetGame);

  const [showNewGameDialog, setShowNewGameDialog] = useState(!session);
  const [aiThinking, setAiThinking] = useState(false);

  const game = useChessGame();
  const engine = useStockfishWorker();
  const clock = useGameClock(session?.timeControl ?? DEFAULT_TIME_CONTROL);

  const theme = useMemo(
    () => BOARD_THEMES.find((t) => t.id === boardThemeId) ?? BOARD_THEMES[1],
    [boardThemeId],
  );

  const playerColor = session?.playerColor ?? "w";
  const isFlipped = boardFlipped
    ? playerColor === "w"
    : playerColor === "b";

  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Stable refs for values used in callbacks
  const gameRef = useRef(game);
  gameRef.current = game;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // ── Ask engine to move and process the result via callback ──
  const requestEngineMove = useCallback(
    (fen: string) => {
      const sess = sessionRef.current;
      if (!sess) return;

      setAiThinking(true);
      engine.findBestMove(fen, sess.engineLevel);
    },
    [engine.findBestMove],
  );

  // ── When engine returns a bestMove, apply it ──
  useEffect(() => {
    if (!engine.bestMove || !session || !aiThinking) return;

    const move = parseUciMove(engine.bestMove);
    const result = gameRef.current.makeMove(move);

    setAiThinking(false);

    if (result) {
      setLastMove({ from: result.from, to: result.to });
      // The color that just moved gets the increment
      const movedColor: PieceColor = session.playerColor === "w" ? "b" : "w";
      clockRef.current.switchClock(movedColor);
    }
  }, [engine.bestMove, session, aiThinking, setLastMove]);

  // ── Trigger engine when it's AI's turn ──
  useEffect(() => {
    if (!session || game.isGameOver) return;
    if (game.turn === session.playerColor) return;
    if (aiThinking) return;
    if (engine.engineStatus !== "ready") return;

    requestEngineMove(game.fen);
  }, [game.fen, game.turn, game.isGameOver, session, aiThinking, engine.engineStatus, requestEngineMove]);

  // ── Start game ──
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

      clockRef.current.start("w");

      // If player is black, engine plays first — the trigger effect will handle it
    },
    [resetGameStore, setSession, setPremove, setBestMoveArrow, setLastMove],
  );

  // ── Player move handler ──
  const handlePlayerMove = useCallback(
    (move: ChessMove): boolean => {
      if (!sessionRef.current) return false;

      const result = gameRef.current.makeMove(move);
      if (!result) return false;

      setLastMove({ from: result.from, to: result.to });
      setBestMoveArrow(null);
      clockRef.current.switchClock(sessionRef.current.playerColor);

      return true;
    },
    [setLastMove, setBestMoveArrow],
  );

  // ── Premove handler ──
  const handlePremove = useCallback(
    (move: ChessMove) => {
      setPremove(move);
    },
    [setPremove],
  );

  // ── Flag detection ──
  useEffect(() => {
    if (clock.flaggedColor && !game.isGameOver) {
      game.setFlagged(clock.flaggedColor);
    }
  }, [clock.flaggedColor, game.isGameOver, game.setFlagged]);

  // ── Game over: pause clock ──
  useEffect(() => {
    if (game.isGameOver) {
      clockRef.current.pause();
      engine.stopThinking();
      setAiThinking(false);
    }
  }, [game.isGameOver, engine.stopThinking]);

  // ── Resign ──
  const handleResign = useCallback(() => {
    if (!sessionRef.current) return;
    gameRef.current.resign(sessionRef.current.playerColor);
  }, []);

  // ── Draw offer ──
  const handleOfferDraw = useCallback(() => {
    // AI declines for now
  }, []);

  // ── Hint ──
  const handleToggleHint = useCallback(() => {
    const eng = engine;
    if (eng.evaluation && eng.bestMove) {
      const move = parseUciMove(eng.bestMove);
      setBestMoveArrow({ from: move.from, to: move.to });
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setBestMoveArrow(null), 3000);
    }
  }, [engine.evaluation, engine.bestMove, setBestMoveArrow]);

  useEffect(() => {
    return () => clearTimeout(hintTimerRef.current);
  }, []);

  // ── Play again / New game ──
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

  // Determine which side is which
  const topColor: PieceColor = isFlipped ? "w" : "b";
  const bottomColor: PieceColor = isFlipped ? "b" : "w";
  const topIsPlayer = topColor === playerColor;
  const bottomIsPlayer = bottomColor === playerColor;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <NewGameDialog open={showNewGameDialog} onStart={handleStartGame} />

      {session && (
        <div className="flex w-full max-w-5xl justify-center gap-4">
          <div className="flex w-full max-w-[900px] flex-col gap-2">
            {/* Top clock (opponent or player) */}
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                {topIsPlayer ? "YOU" : "AI"}
                {!topIsPlayer && aiThinking && (
                  <span className="ml-1 animate-pulse">♞</span>
                )}
                {!topIsPlayer && engine.engineStatus === "loading" && (
                  <span className="ml-1">⏳</span>
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

            {/* Bottom clock (player or opponent) */}
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                {bottomIsPlayer ? "YOU" : "AI"}
                {!bottomIsPlayer && aiThinking && (
                  <span className="ml-1 animate-pulse">♞</span>
                )}
                {!bottomIsPlayer && engine.engineStatus === "loading" && (
                  <span className="ml-1">⏳</span>
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
          <div className="hidden w-64 flex-col gap-3 md:flex">
            <ThinkingIndicator isThinking={aiThinking} />

            <div className="flex-1 overflow-hidden rounded-lg bg-muted p-2">
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
              <PostGamePanel
                status={game.status}
                result={game.result}
                playerColor={playerColor}
                postGameStats={null}
                pgn={pgnString}
                onPlayAgain={handlePlayAgain}
                onNewGame={handleNewGame}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
