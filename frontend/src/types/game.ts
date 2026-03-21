import type {
  PieceColor,
  GameStatus,
  GameResult,
  AnnotatedMove,
} from "./chess";
import type { EngineLevel } from "./engine";
import type { TimeControlPreset } from "./clock";

export interface GameSession {
  readonly playerColor: PieceColor;
  readonly engineLevel: EngineLevel;
  readonly timeControl: TimeControlPreset;
  readonly isRated: boolean;
}

export interface GameState {
  readonly fen: string;
  readonly history: readonly AnnotatedMove[];
  readonly status: GameStatus;
  readonly result: GameResult;
  readonly turn: PieceColor;
}

export interface PostGameStats {
  readonly accuracy: { readonly white: number; readonly black: number };
  readonly blunders: number;
  readonly mistakes: number;
  readonly inaccuracies: number;
  readonly averageCentipawnLoss: number;
  readonly openingName?: string;
  readonly openingEco?: string;
}
