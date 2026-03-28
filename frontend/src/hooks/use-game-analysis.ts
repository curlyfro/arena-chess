import { useCallback, useRef, useState } from "react";
import type { MoveClassification } from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import type { GameSession, PostGameStats } from "@/types/game";
import type { UseStockfishWorkerReturn } from "@/hooks/use-stockfish-worker";
import type { UseChessGameReturn } from "@/hooks/use-chess-game";
import { INITIAL_FEN } from "@/constants/chess";
import { classifyMoves, computePostGameStats } from "@/lib/move-classifier";
import { gameApi } from "@/lib/api";

export interface UseGameAnalysisReturn {
  readonly isAnalyzing: boolean;
  readonly analysisProgress: number;
  readonly classifications: ReadonlyMap<number, MoveClassification>;
  readonly postGameStats: PostGameStats | null;
  readonly analysisEvals: readonly EvalScore[];
  readonly analysisBestMoves: readonly string[];
  readonly handleAnalyzeGame: () => Promise<void>;
  readonly cancelAnalysis: () => void;
  readonly resetAnalysis: () => void;
}

export function useGameAnalysis(
  engineRef: React.RefObject<UseStockfishWorkerReturn>,
  gameRef: React.RefObject<UseChessGameReturn>,
  sessionRef: React.RefObject<GameSession | null>,
  submittedGameIdRef: React.RefObject<string | null>,
): UseGameAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [classifications, setClassifications] = useState<ReadonlyMap<number, MoveClassification>>(new Map());
  const [postGameStats, setPostGameStats] = useState<PostGameStats | null>(null);
  const [analysisEvals, setAnalysisEvals] = useState<readonly EvalScore[]>([]);
  const [analysisBestMoves, setAnalysisBestMoves] = useState<readonly string[]>([]);
  const cancelledRef = useRef(false);
  const analyzingRef = useRef(false);

  const handleAnalyzeGame = useCallback(async () => {
    if (analyzingRef.current || !gameRef.current.isGameOver) return;
    const history = gameRef.current.history;
    if (history.length === 0) return;

    cancelledRef.current = false;
    analyzingRef.current = true;
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const fens = [INITIAL_FEN, ...history.map((m) => m.fen)];
    const evals: EvalScore[] = [];
    const bestMoves: string[] = [];
    const depth = 14;

    let lastProgress = 0;
    for (let i = 0; i < fens.length; i++) {
      if (cancelledRef.current) {
        analyzingRef.current = false;
        return;
      }
      const result = await engineRef.current.analyzePosition(fens[i], depth);
      if (cancelledRef.current) {
        analyzingRef.current = false;
        return;
      }
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
    const stats = computePostGameStats(evals);
    setPostGameStats(stats);
    analyzingRef.current = false;
    setIsAnalyzing(false);

    if (!cancelledRef.current) {
      const gameId = submittedGameIdRef.current;
      if (gameId && sessionRef.current) {
        const playerAccuracy = sessionRef.current.playerColor === "w"
          ? stats.accuracy.white
          : stats.accuracy.black;
        gameApi.updateAccuracy(gameId, playerAccuracy).catch((err) => {
          console.warn("Failed to update accuracy:", err);
        });
      }
    }
  }, [engineRef, gameRef, sessionRef, submittedGameIdRef]);

  const cancelAnalysis = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const resetAnalysis = useCallback(() => {
    cancelledRef.current = true;
    analyzingRef.current = false;
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setClassifications(new Map());
    setPostGameStats(null);
    setAnalysisEvals([]);
    setAnalysisBestMoves([]);
  }, []);

  return {
    isAnalyzing,
    analysisProgress,
    classifications,
    postGameStats,
    analysisEvals,
    analysisBestMoves,
    handleAnalyzeGame,
    cancelAnalysis,
    resetAnalysis,
  };
}
