import type { PieceColor, PieceSymbol, PieceSet } from "@/types/chess";

export function getPieceUrl(
  color: PieceColor,
  type: PieceSymbol,
  pieceSet: PieceSet,
): string {
  return `/pieces/${pieceSet}/${color}${type}.svg`;
}
