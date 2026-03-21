import type { PieceColor } from "./chess";

export interface TimeControlPreset {
  readonly id: string;
  readonly label: string;
  readonly category: "bullet" | "blitz" | "rapid" | "custom";
  readonly initialMs: number;
  readonly incrementMs: number;
}

export interface ClockState {
  readonly whiteMs: number;
  readonly blackMs: number;
  readonly activeColor: PieceColor | null;
  readonly flaggedColor: PieceColor | null;
}
