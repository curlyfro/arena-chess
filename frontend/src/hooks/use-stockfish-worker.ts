import { useCallback, useEffect, useRef, useState } from "react";
import { StockfishBridge } from "@/workers/stockfish-bridge";
import type { EngineLevel, EvalScore, EngineStatus } from "@/types/engine";

export interface PositionAnalysis {
  readonly evaluation: EvalScore;
  readonly bestMove: string;
}

export interface UseStockfishWorkerReturn {
  readonly engineStatus: EngineStatus;
  readonly isThinking: boolean;
  readonly bestMove: string | null;
  readonly evaluation: EvalScore | null;
  readonly findBestMove: (fen: string, level: EngineLevel) => void;
  readonly startAnalysis: (fen: string) => void;
  readonly stopThinking: () => void;
  readonly analyzePosition: (fen: string, depth: number) => Promise<PositionAnalysis>;
}

function detectHashSize(): number {
  // 32MB desktop, 16MB mobile
  if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
    return mem >= 4 ? 32 : 16;
  }
  // Fallback: use screen width as heuristic
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return 16;
  }
  return 32;
}

export function useStockfishWorker(): UseStockfishWorkerReturn {
  const bridgeRef = useRef<StockfishBridge | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("unloaded");
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvalScore | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingLevelRef = useRef<EngineLevel | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    const bridge = new StockfishBridge();
    bridgeRef.current = bridge;

    setEngineStatus("loading");

    bridge
      .init()
      .then(() => {
        bridge.send(`setoption name Hash value ${detectHashSize()}`);
        setEngineStatus("ready");
      })
      .catch((err) => {
        console.error("Engine init failed:", err);
        setEngineStatus("unloaded");
      });

    return () => {
      clearTimeout(delayTimerRef.current);
      bridge.terminate();
      bridgeRef.current = null;
    };
  }, []);

  const findBestMove = useCallback((fen: string, level: EngineLevel) => {
    const bridge = bridgeRef.current;
    if (!bridge?.ready) return;

    setBestMove(null);
    setEvaluation(null);
    setEngineStatus("thinking");
    pendingLevelRef.current = level;

    // For levels with blunderChance, use MultiPV to pick a weaker (but plausible) move
    // instead of a completely random legal move
    const useMultiPV = level.blunderChance > 0 && Math.random() < level.blunderChance;
    const multiPVCount = useMultiPV ? 4 : 1;

    bridge.send(`setoption name MultiPV value ${multiPVCount}`);
    bridge.send(`setoption name Skill Level value ${level.skillLevel}`);
    bridge.send(`setoption name UCI_LimitStrength value ${level.limitStrength}`);
    if (level.limitStrength) {
      bridge.send(`setoption name UCI_Elo value ${level.elo}`);
    }
    bridge.send(`position fen ${fen}`);

    // For MultiPV blunders, use a higher depth so the ranking is meaningful
    const depth = useMultiPV ? Math.max(level.depth, 8) : level.depth;
    bridge.send(`go depth ${depth} movetime ${level.moveTimeMs}`);

    // Collect MultiPV candidate moves (index 1 = best, 4 = worst of top 4)
    const pvCandidates = new Map<number, string>();

    const unsubscribe = bridge.onMessage((msg) => {
      if (msg.evaluation && (!msg.multipv || msg.multipv === 1)) {
        setEvaluation(msg.evaluation);
      }

      // Collect PV moves for MultiPV selection
      if (msg.multipv && msg.pvMove) {
        pvCandidates.set(msg.multipv, msg.pvMove);
      }

      if (msg.bestMove) {
        unsubscribe();
        const currentLevel = pendingLevelRef.current;
        const delay = currentLevel?.artificialDelayMs ?? 0;

        // Pick a weaker move from MultiPV candidates
        let selectedMove = msg.bestMove;
        if (useMultiPV && pvCandidates.size > 1) {
          // Pick from candidates 2-4 (skip the best move)
          // Lower levels pick from worse moves
          const candidates = Array.from(pvCandidates.entries())
            .filter(([idx]) => idx > 1)
            .sort((a, b) => a[0] - b[0])
            .map(([, move]) => move);

          if (candidates.length > 0) {
            // L1-L2: prefer worst candidate, L3-L4: prefer middle candidate
            const pickIndex = level.level <= 2
              ? Math.min(candidates.length - 1, Math.floor(Math.random() * candidates.length))
              : 0;
            selectedMove = candidates[pickIndex];
          }
        }

        if (delay > 0) {
          delayTimerRef.current = setTimeout(() => {
            setBestMove(selectedMove);
            setEngineStatus("ready");
          }, delay);
        } else {
          setBestMove(selectedMove);
          setEngineStatus("ready");
        }
      }
    });
  }, []);

  const startAnalysis = useCallback((fen: string) => {
    const bridge = bridgeRef.current;
    if (!bridge?.ready) return;

    setEvaluation(null);
    bridge.send(`position fen ${fen}`);
    bridge.send("go infinite");

    const unsubscribe = bridge.onMessage((msg) => {
      if (msg.evaluation) {
        setEvaluation(msg.evaluation);
      }
      if (msg.bestMove) {
        unsubscribe();
      }
    });
  }, []);

  const stopThinking = useCallback(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    clearTimeout(delayTimerRef.current);
    bridge.send("stop");
    setEngineStatus("ready");
  }, []);

  const analyzePosition = useCallback(
    (fen: string, depth: number): Promise<PositionAnalysis> => {
      return new Promise((resolve) => {
        const bridge = bridgeRef.current;
        if (!bridge?.ready) {
          resolve({
            evaluation: { type: "cp", value: 0, depth: 0 },
            bestMove: "",
          });
          return;
        }

        bridge.send("setoption name MultiPV value 1");
        bridge.send("setoption name Skill Level value 20");
        bridge.send("setoption name UCI_LimitStrength value false");
        bridge.send(`position fen ${fen}`);
        bridge.send(`go depth ${depth}`);

        let lastEval: EvalScore = { type: "cp", value: 0, depth: 0 };

        const unsubscribe = bridge.onMessage((msg) => {
          if (msg.evaluation) {
            lastEval = msg.evaluation;
          }
          if (msg.bestMove) {
            unsubscribe();
            resolve({ evaluation: lastEval, bestMove: msg.bestMove });
          }
        });
      });
    },
    [],
  );

  return {
    engineStatus,
    isThinking: engineStatus === "thinking",
    bestMove,
    evaluation,
    findBestMove,
    startAnalysis,
    stopThinking,
    analyzePosition,
  };
}
