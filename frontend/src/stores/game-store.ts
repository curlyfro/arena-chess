import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Square,
  PieceColor,
  GameStatus,
  GameResult,
  AnnotatedMove,
  ChessMove,
  PieceSet,
} from "@/types/chess";
import type { EvalScore } from "@/types/engine";
import type { ClockState } from "@/types/clock";
import type { GameSession, PostGameStats } from "@/types/game";
import { INITIAL_FEN } from "@/constants/chess";

// ── Preferences (persisted to localStorage) ──

export interface LastGameSettings {
  readonly levelIndex: number;
  readonly timeControlId: string;
  readonly colorChoice: "w" | "b" | "random";
  readonly isRated: boolean;
}

interface PreferencesSlice {
  boardThemeId: string;
  pieceSet: PieceSet;
  boardFlipped: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  showCoordinates: boolean;
  showEvalBar: boolean;
  autoAnalyze: boolean;
  avatarId: string | null;
  avatarImage: string | null;
  lastGameSettings: LastGameSettings | null;
  winStreak: number;
  bestWinStreak: number;
  setBoardThemeId: (id: string) => void;
  setPieceSet: (set: PieceSet) => void;
  flipBoard: () => void;
  setSoundEnabled: (on: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setShowCoordinates: (on: boolean) => void;
  setShowEvalBar: (on: boolean) => void;
  setAutoAnalyze: (on: boolean) => void;
  setAvatarId: (id: string | null) => void;
  setAvatarImage: (dataUrl: string | null) => void;
  setLastGameSettings: (settings: LastGameSettings) => void;
  incrementWinStreak: () => void;
  resetWinStreak: () => void;
}

// ── Game state (ephemeral) ──

interface GameSlice {
  // Session
  session: GameSession | null;
  setSession: (session: GameSession | null) => void;

  // Position (synced from useChessGame hook)
  fen: string;
  history: readonly AnnotatedMove[];
  status: GameStatus;
  result: GameResult;
  turn: PieceColor;
  isCheck: boolean;
  syncPosition: (state: {
    fen: string;
    history: readonly AnnotatedMove[];
    status: GameStatus;
    result: GameResult;
    turn: PieceColor;
    isCheck: boolean;
  }) => void;

  // Clock (synced from useGameClock hook)
  clock: ClockState;
  syncClock: (clock: ClockState) => void;

  // Engine
  engineBusy: boolean;
  evalHistory: readonly EvalScore[];
  bestMoveArrow: { from: Square; to: Square } | null;
  setEngineBusy: (busy: boolean) => void;
  pushEval: (evalScore: EvalScore) => void;
  setBestMoveArrow: (arrow: { from: Square; to: Square } | null) => void;

  // Premove
  premove: ChessMove | null;
  setPremove: (move: ChessMove | null) => void;

  // Post-game
  postGameStats: PostGameStats | null;
  setPostGameStats: (stats: PostGameStats | null) => void;

  // Last move (for highlight)
  lastMove: { from: Square; to: Square } | null;
  setLastMove: (move: { from: Square; to: Square } | null) => void;

  // Reset
  resetGame: () => void;
}

type GameStore = PreferencesSlice & GameSlice;

const initialGameState: Pick<
  GameSlice,
  | "session"
  | "fen"
  | "history"
  | "status"
  | "result"
  | "turn"
  | "isCheck"
  | "clock"
  | "engineBusy"
  | "evalHistory"
  | "bestMoveArrow"
  | "premove"
  | "postGameStats"
  | "lastMove"
> = {
  session: null,
  fen: INITIAL_FEN,
  history: [],
  status: "idle",
  result: "*",
  turn: "w",
  isCheck: false,
  clock: { whiteMs: 0, blackMs: 0, activeColor: null, flaggedColor: null },
  engineBusy: false,
  evalHistory: [],
  bestMoveArrow: null,
  premove: null,
  postGameStats: null,
  lastMove: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    immer((set) => ({
      // ── Preferences (persisted) ──
      boardThemeId: "dark-green",
      pieceSet: "merida" as PieceSet,
      boardFlipped: false,
      soundEnabled: true,
      soundVolume: 50,
      showCoordinates: true,
      showEvalBar: true,
      autoAnalyze: false,
      avatarId: null as string | null,
      avatarImage: null as string | null,
      lastGameSettings: null,
      winStreak: 0,
      bestWinStreak: 0,

      setBoardThemeId: (id) => set({ boardThemeId: id }),
      setPieceSet: (pieceSet) => set({ pieceSet }),
      flipBoard: () =>
        set((state) => {
          state.boardFlipped = !state.boardFlipped;
        }),
      setSoundEnabled: (on) => set({ soundEnabled: on }),
      setSoundVolume: (volume) => set({ soundVolume: volume }),
      setShowCoordinates: (on) => set({ showCoordinates: on }),
      setShowEvalBar: (on) => set({ showEvalBar: on }),
      setAutoAnalyze: (on) => set({ autoAnalyze: on }),
      setAvatarId: (id) => set({ avatarId: id, avatarImage: null }),
      setAvatarImage: (dataUrl) => set({ avatarImage: dataUrl, avatarId: null }),
      setLastGameSettings: (settings) => set({ lastGameSettings: settings }),
      incrementWinStreak: () =>
        set((state) => {
          const next = state.winStreak + 1;
          state.winStreak = next;
          state.bestWinStreak = Math.max(state.bestWinStreak, next);
        }),
      resetWinStreak: () => set({ winStreak: 0 }),

      // ── Game state (ephemeral) ──
      ...initialGameState,

      setSession: (session) => set({ session }),

      syncPosition: (pos) =>
        set({
          fen: pos.fen,
          history: pos.history,
          status: pos.status,
          result: pos.result,
          turn: pos.turn,
          isCheck: pos.isCheck,
        }),

      syncClock: (clock) => set({ clock }),

      setEngineBusy: (busy) => set({ engineBusy: busy }),
      pushEval: (evalScore) =>
        set((state) => {
          const MAX_EVAL_HISTORY = 500;
          state.evalHistory.push(evalScore);
          if (state.evalHistory.length > MAX_EVAL_HISTORY) {
            state.evalHistory.splice(0, state.evalHistory.length - MAX_EVAL_HISTORY);
          }
        }),
      setBestMoveArrow: (arrow) => set({ bestMoveArrow: arrow }),

      setPremove: (move) => set({ premove: move }),

      setPostGameStats: (stats) => set({ postGameStats: stats }),

      setLastMove: (move) => set({ lastMove: move }),

      resetGame: () => set(initialGameState),
    })),
    {
      name: "chess-arena-state",
      version: 5,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          state.soundEnabled = true;
        }
        if (version < 3) {
          state.lastGameSettings = null;
        }
        if (version < 4) {
          state.avatarId = null;
          state.avatarImage = null;
        }
        if (version < 5) {
          state.winStreak = 0;
          state.bestWinStreak = 0;
        }
        return state as typeof persisted;
      },
      partialize: (state) => ({
        // Preferences
        boardThemeId: state.boardThemeId,
        pieceSet: state.pieceSet,
        boardFlipped: state.boardFlipped,
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        showCoordinates: state.showCoordinates,
        showEvalBar: state.showEvalBar,
        autoAnalyze: state.autoAnalyze,
        avatarId: state.avatarId,
        avatarImage: state.avatarImage,
        lastGameSettings: state.lastGameSettings,
        winStreak: state.winStreak,
        bestWinStreak: state.bestWinStreak,
        // Active game (restored on reload)
        session: state.session,
        fen: state.fen,
        history: state.history,
        status: state.status,
        result: state.result,
        turn: state.turn,
        clock: state.clock,
        lastMove: state.lastMove,
      }),
    },
  ),
);
