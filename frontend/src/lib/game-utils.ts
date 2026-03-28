import type { PieceColor, GameResult } from "@/types/chess";

export function isPlayerWin(playerColor: PieceColor, result: GameResult): boolean {
  return (playerColor === "w" && result === "1-0") ||
         (playerColor === "b" && result === "0-1");
}
