import { useCallback, useEffect, useRef, useState } from "react";
import type { UseStockfishWorkerReturn } from "@/hooks/use-stockfish-worker";
import type { UseChessGameReturn } from "@/hooks/use-chess-game";
import type { GameSession } from "@/types/game";

export type DrawOfferStatus = "offered" | "accepted" | "declined" | null;

export interface UseDrawOfferReturn {
  readonly drawOfferStatus: DrawOfferStatus;
  readonly handleOfferDraw: () => void;
  readonly resetDrawOffer: () => void;
}

export function useDrawOffer(
  engineRef: React.RefObject<UseStockfishWorkerReturn>,
  gameRef: React.RefObject<UseChessGameReturn>,
  sessionRef: React.RefObject<GameSession | null>,
): UseDrawOfferReturn {
  const [drawOfferStatus, setDrawOfferStatus] = useState<DrawOfferStatus>(null);
  const drawTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drawClearTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleOfferDraw = useCallback(() => {
    if (!sessionRef.current || gameRef.current.isGameOver) return;
    if (drawOfferStatus === "offered") return;

    setDrawOfferStatus("offered");

    const evalIsRoughlyEqual = (() => {
      const ev = engineRef.current.evaluation;
      if (!ev) return true;
      if (ev.type === "mate") return false;
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
  }, [drawOfferStatus, sessionRef, engineRef, gameRef]);

  const resetDrawOffer = useCallback(() => {
    clearTimeout(drawTimerRef.current);
    clearTimeout(drawClearTimerRef.current);
    setDrawOfferStatus(null);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(drawTimerRef.current);
      clearTimeout(drawClearTimerRef.current);
    };
  }, []);

  return { drawOfferStatus, handleOfferDraw, resetDrawOffer };
}
