import { useCallback, useEffect, useRef, useState } from "react";
import type { PieceColor } from "@/types/chess";
import type { TimeControlPreset } from "@/types/clock";

export interface UseGameClockReturn {
  readonly whiteMs: number;
  readonly blackMs: number;
  readonly whiteMsRef: React.RefObject<number>;
  readonly blackMsRef: React.RefObject<number>;
  readonly activeColor: PieceColor | null;
  readonly flaggedColor: PieceColor | null;
  readonly start: (color: PieceColor) => void;
  readonly switchClock: (addIncrementTo?: PieceColor) => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly reset: (timeControl: TimeControlPreset) => void;
  readonly restore: (white: number, black: number, active: PieceColor | null) => void;
}

export function useGameClock(
  timeControl: TimeControlPreset,
): UseGameClockReturn {
  const [whiteMs, setWhiteMs] = useState(timeControl.initialMs);
  const [blackMs, setBlackMs] = useState(timeControl.initialMs);
  const [activeColor, setActiveColor] = useState<PieceColor | null>(null);
  const [flaggedColor, setFlaggedColor] = useState<PieceColor | null>(null);

  const whiteMsRef = useRef(timeControl.initialMs);
  const blackMsRef = useRef(timeControl.initialMs);
  const activeColorRef = useRef<PieceColor | null>(null);
  const lastTickRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const runningRef = useRef(false);
  const incrementMsRef = useRef(timeControl.incrementMs);

  // Keep refs in sync with state
  useEffect(() => {
    incrementMsRef.current = timeControl.incrementMs;
  }, [timeControl.incrementMs]);

  const tick = useCallback(() => {
    if (!runningRef.current || !activeColorRef.current) return;

    const now = performance.now();
    const elapsed = now - lastTickRef.current;
    lastTickRef.current = now;

    if (activeColorRef.current === "w") {
      whiteMsRef.current = Math.max(0, whiteMsRef.current - elapsed);
      if (whiteMsRef.current <= 0) {
        setWhiteMs(0);
        setFlaggedColor("w");
        runningRef.current = false;
        return;
      }
    } else {
      blackMsRef.current = Math.max(0, blackMsRef.current - elapsed);
      if (blackMsRef.current <= 0) {
        setBlackMs(0);
        setFlaggedColor("b");
        runningRef.current = false;
        return;
      }
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTickRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafIdRef.current);
    // Final sync
    setWhiteMs(Math.round(whiteMsRef.current));
    setBlackMs(Math.round(blackMsRef.current));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      runningRef.current = false;
    };
  }, []);

  const start = useCallback(
    (color: PieceColor) => {
      activeColorRef.current = color;
      setActiveColor(color);
      startLoop();
    },
    [startLoop],
  );

  const switchClock = useCallback(
    (addIncrementTo?: PieceColor) => {
      if (!activeColorRef.current) return;

      // Add increment to the player who just moved
      if (addIncrementTo && incrementMsRef.current > 0) {
        if (addIncrementTo === "w") {
          whiteMsRef.current += incrementMsRef.current;
        } else {
          blackMsRef.current += incrementMsRef.current;
        }
      }

      const next: PieceColor = activeColorRef.current === "w" ? "b" : "w";
      activeColorRef.current = next;
      setActiveColor(next);
      lastTickRef.current = performance.now();

      // Sync state immediately on switch
      setWhiteMs(Math.round(whiteMsRef.current));
      setBlackMs(Math.round(blackMsRef.current));
    },
    [],
  );

  const pause = useCallback(() => {
    stopLoop();
  }, [stopLoop]);

  const resume = useCallback(() => {
    if (activeColorRef.current) {
      startLoop();
    }
  }, [startLoop]);

  const reset = useCallback(
    (tc: TimeControlPreset) => {
      stopLoop();
      whiteMsRef.current = tc.initialMs;
      blackMsRef.current = tc.initialMs;
      incrementMsRef.current = tc.incrementMs;
      activeColorRef.current = null;
      setWhiteMs(tc.initialMs);
      setBlackMs(tc.initialMs);
      setActiveColor(null);
      setFlaggedColor(null);
    },
    [stopLoop],
  );

  const restore = useCallback(
    (white: number, black: number, active: PieceColor | null) => {
      stopLoop();
      whiteMsRef.current = white;
      blackMsRef.current = black;
      activeColorRef.current = active;
      setWhiteMs(white);
      setBlackMs(black);
      setActiveColor(active);
      setFlaggedColor(null);
      if (active) {
        startLoop();
      }
    },
    [stopLoop, startLoop],
  );

  return {
    whiteMs,
    blackMs,
    whiteMsRef,
    blackMsRef,
    activeColor,
    flaggedColor,
    start,
    switchClock,
    pause,
    resume,
    reset,
    restore,
  };
}
