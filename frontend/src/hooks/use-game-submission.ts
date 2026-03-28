import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useLevelStore } from "@/stores/level-store";
import { gameApi } from "@/lib/api";
import { XP_REWARDS } from "@/constants/xp-config";
import type { GameStatus, GameResult } from "@/types/chess";
import type { GameSession } from "@/types/game";
import type { UseGameClockReturn } from "@/hooks/use-game-clock";
import type { UseStockfishWorkerReturn } from "@/hooks/use-stockfish-worker";
import type { SoundType } from "@/lib/sounds";

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

export interface UseGameSubmissionReturn {
  readonly eloResult: { change: number; after: number } | null;
  readonly gameSubmitError: string | null;
  readonly submittedGameIdRef: React.RefObject<string | null>;
  readonly resetSubmission: () => void;
}

export function useGameSubmission(
  sessionRef: React.RefObject<GameSession | null>,
  gameRef: React.RefObject<{ pgn: () => string }>,
  clockRef: React.RefObject<UseGameClockReturn>,
  engineRef: React.RefObject<UseStockfishWorkerReturn>,
  setAiThinking: (v: boolean) => void,
  playSfxRef: React.RefObject<(sound: SoundType) => void>,
  isGameOver: boolean,
  gameStatus: GameStatus,
  gameResult: GameResult,
): UseGameSubmissionReturn {
  const [eloResult, setEloResult] = useState<{ change: number; after: number } | null>(null);
  const [gameSubmitError, setGameSubmitError] = useState<string | null>(null);
  const gameSubmittedRef = useRef(false);
  const submittedGameIdRef = useRef<string | null>(null);
  const gameStartTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!isGameOver) return;
    clockRef.current.pause();
    engineRef.current.stopThinking();
    setAiThinking(false);

    if (gameStatus === "checkmate") {
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
    const r = gameResult;
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

    const durationSeconds = Math.max(1, Math.round((Date.now() - gameStartTimeRef.current) / 1000));
    const rawPgn = gameRef.current.pgn()
      .replace('[Result "*"]', `[Result "${gameResult}"]`)
      .replace(/ \*\s*$/, ` ${gameResult}`);
    // Strip all PGN headers — backend validator parses movetext only
    const pgn = rawPgn.replace(/\[[^\]]*\]\s*/g, "").trim();
    const timeControl = sess.timeControl.category;

    gameApi.submit({
      aiLevel: sess.engineLevel.level,
      timeControl,
      isRated: sess.isRated,
      result: playerResult,
      termination: statusToTermination(gameStatus),
      playerColor: sess.playerColor === "w" ? "white" : "black",
      pgn,
      accuracyPlayer: 0,
      durationSeconds,
    }).then(({ data }) => {
      submittedGameIdRef.current = data.gameId;
      setEloResult({ change: data.eloChange, after: data.eloAfter });
      setGameSubmitError(null);

      const currentProfile = useAuthStore.getState().playerProfile;
      if (currentProfile) {
        const updatedProfile = {
          ...currentProfile,
          title: data.newTitle ?? currentProfile.title,
          eloBullet: timeControl === "bullet" ? data.eloAfter : currentProfile.eloBullet,
          eloBlitz: timeControl === "blitz" ? data.eloAfter : currentProfile.eloBlitz,
          eloRapid: timeControl === "rapid" ? data.eloAfter : currentProfile.eloRapid,
          stats: {
            ...currentProfile.stats,
            totalGames: currentProfile.stats.totalGames + 1,
            wins: currentProfile.stats.wins + (playerResult === "win" ? 1 : 0),
            losses: currentProfile.stats.losses + (playerResult === "loss" ? 1 : 0),
            draws: currentProfile.stats.draws + (playerResult === "draw" ? 1 : 0),
            winRate: (() => {
              const newTotal = currentProfile.stats.totalGames + 1;
              const newWins = currentProfile.stats.wins + (playerResult === "win" ? 1 : 0);
              return newTotal > 0 ? (newWins / newTotal) * 100 : 0;
            })(),
          },
        };
        useAuthStore.setState({ playerProfile: updatedProfile });
      }

      useAuthStore.getState().refreshProfile();

      // Award XP
      let xp = XP_REWARDS.gameComplete;
      if (playerResult === "win") xp += XP_REWARDS.gameWin;
      if (playerResult === "win" && gameStatus === "checkmate") xp += XP_REWARDS.gameCheckmate;
      useLevelStore.getState().addXp(xp);
    }).catch((err) => {
      console.error("Failed to submit game:", err?.response?.data ?? err);
      setGameSubmitError("Failed to save game result. Your rating was not updated.");
      gameSubmittedRef.current = false;
    });
    // Refs are stable — only reactive values in deps
  }, [isGameOver, gameResult, gameStatus, setAiThinking, clockRef, engineRef, playSfxRef, sessionRef, gameRef]);

  const resetSubmission = useCallback(() => {
    gameSubmittedRef.current = false;
    submittedGameIdRef.current = null;
    gameStartTimeRef.current = Date.now();
    setEloResult(null);
    setGameSubmitError(null);
  }, []);

  return {
    eloResult,
    gameSubmitError,
    submittedGameIdRef,
    resetSubmission,
  };
}
