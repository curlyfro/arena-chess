import type { ChessMove, Square } from "@/types/chess";

export function parseUciMove(uci: string): ChessMove {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as ChessMove["promotion"]) : undefined,
  };
}
