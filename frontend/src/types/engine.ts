export interface EngineLevel {
  readonly level: number;
  readonly label: string;
  readonly name: string;
  readonly skillLevel: number;
  readonly depth: number;
  readonly moveTimeMs: number;
  readonly artificialDelayMs: number;
  readonly elo: number;
  readonly limitStrength: boolean;
  readonly blunderChance: number; // 0-1, probability of playing a random legal move
  readonly description: string;
  readonly tagline: string;
}

export interface EvalScore {
  readonly type: "cp" | "mate";
  readonly value: number;
  readonly depth: number;
}

export type UCICommand =
  | { readonly type: "uci" }
  | { readonly type: "isready" }
  | { readonly type: "ucinewgame" }
  | {
      readonly type: "position";
      readonly fen: string;
      readonly moves?: readonly string[];
    }
  | {
      readonly type: "go";
      readonly depth?: number;
      readonly movetime?: number;
      readonly infinite?: boolean;
    }
  | { readonly type: "stop" }
  | { readonly type: "quit" }
  | {
      readonly type: "setoption";
      readonly name: string;
      readonly value: string;
    };

export interface StockfishMessage {
  readonly bestMove?: string;
  readonly ponder?: string;
  readonly evaluation?: EvalScore;
  readonly multipv?: number;
  readonly pvMove?: string;
  readonly ready?: boolean;
  readonly uciOk?: boolean;
}

export type EngineStatus = "unloaded" | "loading" | "ready" | "thinking";
