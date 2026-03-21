export interface Puzzle {
  readonly id: string;
  readonly fen: string;
  readonly moves: readonly string[]; // UCI moves: the first move is played, the rest are the solution
  readonly rating: number;
  readonly themes: readonly string[];
}

/**
 * Curated puzzle set.
 *
 * Format: FEN is the position to solve. moves[] is the expected UCI move
 * sequence — moves[0] is the player's move, moves[1] is the opponent's
 * response, moves[2] is the player's next move, etc.
 *
 * To expand: source puzzles from https://database.lichess.org/#puzzles (CC0).
 */
export const PUZZLES: readonly Puzzle[] = [
  {
    id: "p001",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    moves: ["h5f7"],
    rating: 600,
    themes: ["mate", "mateIn1", "short"],
  },
  {
    id: "p002",
    fen: "r1b1kb1r/pppp1ppp/5n2/4p1q1/2BnP3/2N2N2/PPPP1PPP/R1BQ1RK1 w kq - 6 5",
    moves: ["c3d5"],
    rating: 800,
    themes: ["fork", "short"],
  },
  {
    id: "p003",
    fen: "rnbqk2r/ppppbppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    moves: ["c4f7"],
    rating: 700,
    themes: ["sacrifice", "check"],
  },
  {
    id: "p004",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    moves: ["f1b5"],
    rating: 500,
    themes: ["opening", "pin"],
  },
  {
    id: "p005",
    fen: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 3",
    moves: ["h4e1"],
    rating: 400,
    themes: ["mate", "mateIn1", "short"],
  },
  {
    id: "p006",
    fen: "r1bqkb1r/pppppppp/2n2n2/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 3",
    moves: ["f6e4"],
    rating: 700,
    themes: ["pawnCenter", "tactical"],
  },
  {
    id: "p007",
    fen: "rnbqkb1r/pp2pppp/5n2/2pp4/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4",
    moves: ["e4e5"],
    rating: 800,
    themes: ["attack", "advance"],
  },
  {
    id: "p008",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    moves: ["f3g5"],
    rating: 900,
    themes: ["attack", "tactical"],
  },
  {
    id: "p009",
    fen: "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
    moves: ["d1c2"],
    rating: 850,
    themes: ["development", "nimzoIndian"],
  },
  {
    id: "p010",
    fen: "r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2",
    moves: ["d2d4"],
    rating: 500,
    themes: ["opening", "center"],
  },
];

export function getRandomPuzzle(excluding?: string): Puzzle {
  const candidates = excluding
    ? PUZZLES.filter((p) => p.id !== excluding)
    : PUZZLES;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

