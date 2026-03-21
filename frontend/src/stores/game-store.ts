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

interface PreferencesSlice {
  boardThemeId: string;
  pieceSet: PieceSet;
  boardFlipped: boolean;
  soundEnabled: boolean;
  showCoordinates: boolean;
  showEvalBar: boolean;
  setBoardThemeId: (id: string) => void;
  setPieceSet: (set: PieceSet) => void;
  flipBoard: () => void;
  setSoundEnabled: (on: boolean) => void;
  setShowCoordinates: (on: boolean) => void;
  setShowEvalBar: (on: boolean) => void;
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
      showCoordinates: true,
      showEvalBar: true,

      setBoardThemeId: (id) => set({ boardThemeId: id }),
      setPieceSet: (pieceSet) => set({ pieceSet }),
      flipBoard: () =>
        set((state) => {
          state.boardFlipped = !state.boardFlipped;
        }),
      setSoundEnabled: (on) => set({ soundEnabled: on }),
      setShowCoordinates: (on) => set({ showCoordinates: on }),
      setShowEvalBar: (on) => set({ showEvalBar: on }),

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
          const next = [...state.evalHistory, evalScore];
          state.evalHistory = next.length > MAX_EVAL_HISTORY
            ? next.slice(-MAX_EVAL_HISTORY)
            : next;
        }),
      setBestMoveArrow: (arrow) => set({ bestMoveArrow: arrow }),

      setPremove: (move) => set({ premove: move }),

      setPostGameStats: (stats) => set({ postGameStats: stats }),

      setLastMove: (move) => set({ lastMove: move }),

      resetGame: () => set(initialGameState),
    })),
    {
      name: "chess-arena-state",
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          state.soundEnabled = true;
        }
        return state as typeof persisted;
      },
      partialize: (state) => ({
        // Preferences
        boardThemeId: state.boardThemeId,
        pieceSet: state.pieceSet,
        boardFlipped: state.boardFlipped,
        soundEnabled: state.soundEnabled,
        showCoordinates: state.showCoordinates,
        showEvalBar: state.showEvalBar,
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
