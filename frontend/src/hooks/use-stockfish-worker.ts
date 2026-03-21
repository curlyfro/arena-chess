import { useCallback, useEffect, useRef, useState } from "react";
import { StockfishBridge } from "@/workers/stockfish-bridge";
import type { EngineLevel, EvalScore, EngineStatus } from "@/types/engine";

export interface UseStockfishWorkerReturn {
  readonly engineStatus: EngineStatus;
  readonly isThinking: boolean;
  readonly bestMove: string | null;
  readonly evaluation: EvalScore | null;
  readonly findBestMove: (fen: string, level: EngineLevel) => void;
  readonly startAnalysis: (fen: string) => void;
  readonly stopThinking: () => void;
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

function detectThreads(): number {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return Math.min(navigator.hardwareConcurrency, 4);
  }
  return 1;
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
        // Configure engine
        bridge.send(`setoption name Hash value ${detectHashSize()}`);
        const threads = detectThreads();
        if (threads > 1) {
          bridge.send(`setoption name Threads value ${threads}`);
        }
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

    // Configure difficulty
    bridge.send(`setoption name Skill Level value ${level.skillLevel}`);
    bridge.send(`position fen ${fen}`);
    bridge.send(`go depth ${level.depth} movetime ${level.moveTimeMs}`);

    // Listen for bestmove response
    const unsubscribe = bridge.onMessage((msg) => {
      if (msg.evaluation) {
        setEvaluation(msg.evaluation);
      }

      if (msg.bestMove) {
        unsubscribe();
        const currentLevel = pendingLevelRef.current;
        const delay = currentLevel?.artificialDelayMs ?? 0;

        if (delay > 0) {
          // Add artificial delay for lower levels (L1-4)
          delayTimerRef.current = setTimeout(() => {
            setBestMove(msg.bestMove!);
            setEngineStatus("ready");
          }, delay);
        } else {
          setBestMove(msg.bestMove);
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

  return {
    engineStatus,
    isThinking: engineStatus === "thinking",
    bestMove,
    evaluation,
    findBestMove,
    startAnalysis,
    stopThinking,
  };
}
