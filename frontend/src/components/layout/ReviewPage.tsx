import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import { Chess } from "chess.js";
import { gameApi, type GameDetail } from "@/lib/api";
import { useStockfishWorker } from "@/hooks/use-stockfish-worker";
import { useHistoryNavigation } from "@/hooks/use-history-navigation";
import { useBoardPreferences } from "@/hooks/use-board-theme";
import { INITIAL_FEN } from "@/constants/chess";
import { classifyMoves } from "@/lib/move-classifier";
import { buildViewedAnnotation } from "@/lib/annotation";
import { parseUciMove } from "@/lib/uci";
import { ChessBoard } from "@/components/board/ChessBoard";
import { MoveHistory } from "@/components/game/MoveHistory";
import { EvalGraph } from "@/components/game/EvalGraph";
import { ReplayControls } from "@/components/game/ReplayControls";
import { MoveAnnotation } from "@/components/game/MoveAnnotation";
import type { AnnotatedMove, BoardPiece, MoveClassification, PieceColor } from "@/types/chess";
import type { EvalScore } from "@/types/engine";

// Read-only board callbacks (stable references)
const NOOP_MOVE = () => false;
const NOOP_LEGAL = () => [] as never[];
const NOOP_PREMOVE = () => {};

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { theme, pieceSet, showCoordinates } = useBoardPreferences();

  // Load game detail
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    gameApi.getDetail(id)
      .then(({ data }) => setGameDetail(data))
      .catch(() => setError("Failed to load game"))
      .finally(() => setLoading(false));
  }, [id]);

  // Parse PGN into annotated moves
  const { history, playerColor } = useMemo(() => {
    if (!gameDetail?.pgn) return { history: [] as AnnotatedMove[], playerColor: "w" as PieceColor };

    const color: PieceColor = gameDetail.playerColor.toLowerCase() === "white" ? "w" : "b";
    const chess = new Chess();
    const moves: AnnotatedMove[] = [];

    const cleanPgn = gameDetail.pgn
      .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, "")
      .trim();

    try {
      chess.loadPgn(cleanPgn);
      const verbose = chess.history({ verbose: true });
      const replay = new Chess();
      for (const move of verbose) {
        replay.move(move.san);
        moves.push({
          san: move.san,
          from: move.from,
          to: move.to,
          fen: replay.fen(),
          captured: move.captured,
          flags: move.flags,
          promotion: move.promotion as AnnotatedMove["promotion"],
        });
      }
    } catch {
      const tokens = cleanPgn.replace(/\d+\.\s*/g, "").split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        try {
          const result = chess.move(token);
          if (result) {
            moves.push({
              san: result.san,
              from: result.from,
              to: result.to,
              fen: chess.fen(),
              captured: result.captured,
              flags: result.flags,
              promotion: result.promotion as AnnotatedMove["promotion"],
            });
          }
        } catch {
          break;
        }
      }
    }

    return { history: moves, playerColor: color };
  }, [gameDetail]);

  // Reuse the shared history navigation hook
  const {
    viewingMoveIndex, viewingBoard: hookViewingBoard,
    handleSelectMove, handleGoToStart, handleGoBack, handleGoForward,
    handleReturnToLive,
  } = useHistoryNavigation(history, true, "", history.length > 0);

  // For review, show the final position when not viewing a specific move
  const viewingBoard = useMemo<readonly (BoardPiece | null)[][] | null>(() => {
    if (hookViewingBoard) return hookViewingBoard;
    // Show final position
    const lastMove = history[history.length - 1];
    if (!lastMove) return null;
    const chess = new Chess(lastMove.fen);
    return chess.board().map((row) =>
      row.map((sq) =>
        sq ? ({ type: sq.type, color: sq.color } as BoardPiece) : null,
      ),
    );
  }, [hookViewingBoard, history]);

  const isFlipped = playerColor === "b";

  const lastMoveHighlight = useMemo(() => {
    const idx = viewingMoveIndex ?? history.length - 1;
    const move = history[idx];
    if (!move) return null;
    return { from: move.from, to: move.to };
  }, [viewingMoveIndex, history]);

  // Analysis
  const engine = useStockfishWorker();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisEvals, setAnalysisEvals] = useState<EvalScore[]>([]);
  const [analysisBestMoves, setAnalysisBestMoves] = useState<string[]>([]);
  const [classifications, setClassifications] = useState<ReadonlyMap<number, MoveClassification>>(new Map());

  const handleAnalyze = useCallback(async () => {
    if (history.length === 0 || engine.engineStatus !== "ready") return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const positions = [INITIAL_FEN, ...history.map((m) => m.fen)];
    const evals: EvalScore[] = [];
    const bestMoves: string[] = [];

    for (let i = 0; i < positions.length; i++) {
      const result = await engine.analyzePosition(positions[i], 14);
      evals.push(result.evaluation);
      bestMoves.push(result.bestMove);
      setAnalysisProgress(Math.round(((i + 1) / positions.length) * 100));
    }

    setAnalysisEvals(evals);
    setAnalysisBestMoves(bestMoves);
    setClassifications(classifyMoves(evals));
    setIsAnalyzing(false);
  }, [history, engine.engineStatus, engine.analyzePosition]);

  const isAnalysisComplete = analysisEvals.length > 0 && !isAnalyzing;

  const resolvedBestMoveArrow = useMemo(() => {
    if (!isAnalysisComplete) return null;
    const idx = viewingMoveIndex ?? history.length - 1;
    const uci = analysisBestMoves[idx + 1];
    if (!uci || uci.length < 4) return null;
    return parseUciMove(uci);
  }, [viewingMoveIndex, analysisBestMoves, isAnalysisComplete, history.length]);

  const viewedAnnotation = useMemo(
    () => buildViewedAnnotation(viewingMoveIndex, classifications, history, analysisEvals, analysisBestMoves),
    [viewingMoveIndex, classifications, history, analysisEvals, analysisBestMoves],
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading game...</div>
      </div>
    );
  }

  if (error || !gameDetail) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
        <p className="text-destructive">{error ?? "Game not found"}</p>
        <Link to="/profile" className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          Back to Profile
        </Link>
      </div>
    );
  }

  const resultLabel = gameDetail.result === "Win" ? "Victory" :
    gameDetail.result === "Loss" ? "Defeat" : "Draw";
  const resultColor = gameDetail.result === "Win" ? "text-success" :
    gameDetail.result === "Loss" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">♚ Game Review</h1>
          <span className={`text-sm font-medium ${resultColor}`}>{resultLabel}</span>
          <span className="text-xs text-muted-foreground">
            vs AI L{gameDetail.aiLevel} ({gameDetail.aiElo})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
          >
            Profile
          </Link>
          <Link
            to="/"
            className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
          >
            Play
          </Link>
        </div>
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center gap-4 md:flex-row md:items-start md:justify-center">
        <div className="flex w-full max-w-[900px] flex-col gap-2 md:flex-1">
          <ChessBoard
            board={viewingBoard ?? []}
            turn={playerColor}
            playerColor={playerColor}
            isGameOver={true}
            isCheck={false}
            flipped={isFlipped}
            theme={theme}
            pieceSet={pieceSet}
            showCoordinates={showCoordinates}
            lastMove={lastMoveHighlight}
            premove={null}
            bestMoveArrow={resolvedBestMoveArrow}
            getLegalMovesForSquare={NOOP_LEGAL}
            onMove={NOOP_MOVE}
            onPremove={NOOP_PREMOVE}
          />
        </div>

        <div className="flex w-full flex-col gap-3 md:w-64 md:shrink-0 md:self-start md:max-h-[calc(100vh-120px)]">
          {/* Game info */}
          <div className="rounded-lg bg-muted p-3 text-center text-sm">
            <div className="flex items-center justify-center gap-2">
              <span className="text-foreground font-bold">{gameDetail.eloBefore}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground font-bold">{gameDetail.eloAfter}</span>
              <span className={gameDetail.eloChange > 0 ? "text-success" : gameDetail.eloChange < 0 ? "text-destructive" : "text-muted-foreground"}>
                ({gameDetail.eloChange > 0 ? `+${gameDetail.eloChange}` : gameDetail.eloChange})
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {gameDetail.timeControl} · {gameDetail.termination} · {history.length} moves
            </div>
          </div>

          {/* Analysis button / progress */}
          {!isAnalysisComplete && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || engine.engineStatus !== "ready"}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/80 disabled:opacity-50"
            >
              {isAnalyzing ? `Analyzing... ${analysisProgress}%` : "Analyze Game"}
            </button>
          )}
          {isAnalyzing && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          )}

          {/* Eval graph */}
          {isAnalysisComplete && (
            <EvalGraph
              evals={analysisEvals}
              currentIndex={viewingMoveIndex ?? history.length - 1}
              totalMoves={history.length}
              onSelectMove={handleSelectMove}
            />
          )}

          {/* Move history */}
          <div className="min-h-0 max-h-48 flex-1 overflow-auto rounded-lg bg-muted p-2 md:max-h-none">
            <MoveHistory
              history={history}
              selectedMoveIndex={viewingMoveIndex}
              classifications={classifications}
              onSelectMove={handleSelectMove}
            />
          </div>

          {viewedAnnotation && (
            <MoveAnnotation {...viewedAnnotation} />
          )}

          <ReplayControls
            totalMoves={history.length}
            currentIndex={viewingMoveIndex}
            onGoToStart={handleGoToStart}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            onGoToEnd={handleReturnToLive}
          />
        </div>
      </div>
    </div>
  );
}
