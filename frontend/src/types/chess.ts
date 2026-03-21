/** All 64 algebraic square identifiers */
export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type Square = `${File}${Rank}`;

export type PieceSymbol = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";

export interface BoardPiece {
  readonly type: PieceSymbol;
  readonly color: PieceColor;
}

export type PromotionPiece = "n" | "b" | "r" | "q";

export interface ChessMove {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: PromotionPiece;
}

export interface AnnotatedMove extends ChessMove {
  readonly san: string;
  readonly fen: string;
  readonly captured?: PieceSymbol;
  readonly flags: string;
  readonly evaluation?: import("./engine").EvalScore;
  readonly classification?: MoveClassification;
}

export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type GameStatus =
  | "idle"
  | "active"
  | "checkmate"
  | "stalemate"
  | "draw_repetition"
  | "draw_insufficient"
  | "draw_50move"
  | "draw_agreement"
  | "resigned"
  | "flagged";

export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

export const FILES: readonly File[] = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
];
export const RANKS: readonly Rank[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
];

export interface BoardTheme {
  readonly id: string;
  readonly name: string;
  readonly lightSquare: string;
  readonly darkSquare: string;
  readonly highlightLastMove: string;
  readonly highlightLegalMove: string;
  readonly highlightCheck: string;
  readonly highlightPremove: string;
}

export type PieceSet = "merida" | "neo";
