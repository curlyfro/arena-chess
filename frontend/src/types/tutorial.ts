import type { Square, PieceColor } from "./chess";

export type TutorialCategory = "basics" | "openings" | "midgame" | "endgame";

export type TutorialStepType = "instruction" | "move" | "freeplay";

export interface TutorialStepBase {
  readonly type: TutorialStepType;
  readonly title: string;
  readonly text: string;
  readonly fen: string;
  readonly flipped?: boolean;
  readonly highlights?: readonly Square[];
  readonly arrows?: readonly { readonly from: Square; readonly to: Square }[];
}

export interface InstructionStep extends TutorialStepBase {
  readonly type: "instruction";
}

export interface MoveStep extends TutorialStepBase {
  readonly type: "move";
  readonly expectedMove: { readonly from: Square; readonly to: Square; readonly promotion?: string };
  readonly playerColor: PieceColor;
  readonly hintText?: string;
  readonly autoReply?: { readonly from: Square; readonly to: Square; readonly promotion?: string };
}

export interface FreeplayStep extends TutorialStepBase {
  readonly type: "freeplay";
  readonly playerColor: PieceColor;
}

export type TutorialStep = InstructionStep | MoveStep | FreeplayStep;

export interface TutorialLesson {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: TutorialCategory;
  readonly steps: readonly TutorialStep[];
  readonly xpReward: number;
}

export interface TutorialCategoryDef {
  readonly id: TutorialCategory;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
}
