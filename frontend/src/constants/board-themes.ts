import type { BoardTheme, PieceSet } from "@/types/chess";

export const BOARD_THEMES: readonly BoardTheme[] = [
  {
    id: "classic-wood",
    name: "Classic Wood",
    lightSquare: "#f0d9b5",
    darkSquare: "#b58863",
    highlightLastMove: "rgba(255, 255, 0, 0.4)",
    highlightLegalMove: "rgba(0, 0, 0, 0.15)",
    highlightCheck: "rgba(255, 0, 0, 0.6)",
    highlightPremove: "rgba(0, 130, 255, 0.3)",
  },
  {
    id: "dark-green",
    name: "Dark Green",
    lightSquare: "#eeeed2",
    darkSquare: "#769656",
    highlightLastMove: "rgba(255, 255, 0, 0.4)",
    highlightLegalMove: "rgba(0, 0, 0, 0.15)",
    highlightCheck: "rgba(255, 0, 0, 0.6)",
    highlightPremove: "rgba(0, 130, 255, 0.3)",
  },
  {
    id: "blue-ice",
    name: "Blue Ice",
    lightSquare: "#dee3e6",
    darkSquare: "#8ca2ad",
    highlightLastMove: "rgba(0, 180, 255, 0.35)",
    highlightLegalMove: "rgba(0, 0, 0, 0.15)",
    highlightCheck: "rgba(255, 0, 0, 0.6)",
    highlightPremove: "rgba(100, 0, 255, 0.3)",
  },
] as const;

export const PIECE_SETS: readonly PieceSet[] = ["merida", "neo"] as const;

export const DEFAULT_BOARD_THEME = BOARD_THEMES[1]; // Dark Green (Lichess-style)
export const DEFAULT_PIECE_SET: PieceSet = "merida";
