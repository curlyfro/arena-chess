import type { Square } from "@/types/chess";

export const SQUARE_SIZE = 100;
export const BOARD_SIZE = 800;

export function parseSquare(square: Square): { file: number; rank: number } {
  return {
    file: square.charCodeAt(0) - 97,
    rank: parseInt(square[1]) - 1,
  };
}

/** Top-left corner of a square in SVG coordinates */
export function squareToSvg(
  square: Square,
  flipped: boolean,
): { x: number; y: number } {
  const { file, rank } = parseSquare(square);
  return {
    x: (flipped ? 7 - file : file) * SQUARE_SIZE,
    y: (flipped ? rank : 7 - rank) * SQUARE_SIZE,
  };
}

/** Center of a square in SVG coordinates */
export function squareToSvgCenter(
  square: Square,
  flipped: boolean,
): { x: number; y: number } {
  const pos = squareToSvg(square, flipped);
  return {
    x: pos.x + SQUARE_SIZE / 2,
    y: pos.y + SQUARE_SIZE / 2,
  };
}
