import { memo, useMemo } from "react";
import type { PieceColor, PieceSymbol, AnnotatedMove, PieceSet } from "@/types/chess";
import { getPieceUrl } from "@/lib/piece-url";

interface CapturedPiecesProps {
  readonly history: readonly AnnotatedMove[];
  readonly color: PieceColor;
  readonly pieceSet: PieceSet;
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const PIECE_ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

interface CapturedInfo {
  readonly pieces: PieceSymbol[];
  readonly advantage: number;
}

function computeCaptured(
  history: readonly AnnotatedMove[],
  color: PieceColor,
): CapturedInfo {
  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    if (!move.captured) continue;
    // Even indices (0-based) are white moves, odd are black moves
    if (i % 2 === 0) {
      capturedByWhite.push(move.captured);
    } else {
      capturedByBlack.push(move.captured);
    }
  }

  const whiteMaterial = capturedByWhite.reduce((sum, p) => sum + PIECE_VALUES[p], 0);
  const blackMaterial = capturedByBlack.reduce((sum, p) => sum + PIECE_VALUES[p], 0);

  const pieces = color === "w" ? capturedByWhite : capturedByBlack;
  pieces.sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b));

  // Advantage is from this color's perspective (positive = this side captured more material)
  const advantage = color === "w"
    ? whiteMaterial - blackMaterial
    : blackMaterial - whiteMaterial;

  return { pieces, advantage };
}

export const CapturedPieces = memo(function CapturedPieces({
  history,
  color,
  pieceSet,
}: CapturedPiecesProps) {
  const { pieces, advantage } = useMemo(
    () => computeCaptured(history, color),
    [history, color],
  );

  if (pieces.length === 0 && advantage <= 0) return null;

  // The captured pieces belong to the opponent
  const capturedColor: PieceColor = color === "w" ? "b" : "w";

  return (
    <div className="flex items-center -space-x-1 h-7">
      {pieces.map((piece, i) => (
        <img
          key={`${piece}-${i}`}
          src={getPieceUrl(capturedColor, piece, pieceSet)}
          alt={piece}
          className="h-7 w-7 drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]"
        />
      ))}
      {advantage > 0 && (
        <span className="ml-1 text-xs font-bold text-muted-foreground">
          +{advantage}
        </span>
      )}
    </div>
  );
});
