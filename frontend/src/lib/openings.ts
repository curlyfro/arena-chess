/**
 * Lightweight ECO opening book. Maps move sequences to opening names.
 * Uses SAN move notation for lookup (e.g., "1.e4 e5 2.Nf3 Nc6").
 */

interface Opening {
  readonly eco: string;
  readonly name: string;
}

// Map from move sequence prefix (space-separated SAN) to opening info.
// Built from the most commonly played openings.
const OPENINGS: ReadonlyMap<string, Opening> = new Map([
  // King's Pawn
  ["e4", { eco: "B00", name: "King's Pawn" }],
  ["e4 e5", { eco: "C20", name: "King's Pawn Game" }],
  ["e4 e5 Nf3", { eco: "C40", name: "King's Knight Opening" }],
  ["e4 e5 Nf3 Nc6", { eco: "C44", name: "King's Pawn Game" }],
  ["e4 e5 Nf3 Nc6 Bb5", { eco: "C60", name: "Ruy Lopez" }],
  ["e4 e5 Nf3 Nc6 Bb5 a6", { eco: "C68", name: "Ruy Lopez: Morphy Defense" }],
  ["e4 e5 Nf3 Nc6 Bb5 a6 Ba4", { eco: "C70", name: "Ruy Lopez: Morphy Defense" }],
  ["e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6", { eco: "C78", name: "Ruy Lopez: Morphy Defense" }],
  ["e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O", { eco: "C88", name: "Ruy Lopez: Closed" }],
  ["e4 e5 Nf3 Nc6 Bb5 Nf6", { eco: "C65", name: "Ruy Lopez: Berlin Defense" }],
  ["e4 e5 Nf3 Nc6 Bc4", { eco: "C50", name: "Italian Game" }],
  ["e4 e5 Nf3 Nc6 Bc4 Bc5", { eco: "C50", name: "Italian Game: Giuoco Piano" }],
  ["e4 e5 Nf3 Nc6 Bc4 Nf6", { eco: "C55", name: "Italian Game: Two Knights Defense" }],
  ["e4 e5 Nf3 Nc6 d4", { eco: "C44", name: "Scotch Game" }],
  ["e4 e5 Nf3 Nc6 d4 exd4", { eco: "C45", name: "Scotch Game" }],
  ["e4 e5 Nf3 Nf6", { eco: "C42", name: "Petrov's Defense" }],
  ["e4 e5 Nf3 d6", { eco: "C41", name: "Philidor Defense" }],
  ["e4 e5 f4", { eco: "C30", name: "King's Gambit" }],
  ["e4 e5 Bc4", { eco: "C23", name: "Bishop's Opening" }],
  ["e4 e5 d4", { eco: "C21", name: "Center Game" }],

  // Sicilian Defense
  ["e4 c5", { eco: "B20", name: "Sicilian Defense" }],
  ["e4 c5 Nf3", { eco: "B27", name: "Sicilian Defense" }],
  ["e4 c5 Nf3 d6", { eco: "B50", name: "Sicilian Defense" }],
  ["e4 c5 Nf3 d6 d4", { eco: "B50", name: "Sicilian Defense: Open" }],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4", { eco: "B80", name: "Sicilian Defense: Open" }],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3", { eco: "B90", name: "Sicilian Defense: Najdorf" }],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6", { eco: "B90", name: "Sicilian Najdorf" }],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e5", { eco: "B57", name: "Sicilian Defense: Classical" }],
  ["e4 c5 Nf3 Nc6", { eco: "B30", name: "Sicilian Defense" }],
  ["e4 c5 Nf3 e6", { eco: "B40", name: "Sicilian Defense" }],
  ["e4 c5 Nf3 e6 d4 cxd4 Nxd4", { eco: "B40", name: "Sicilian Defense: Open" }],
  ["e4 c5 Nc3", { eco: "B23", name: "Sicilian Defense: Closed" }],
  ["e4 c5 c3", { eco: "B22", name: "Sicilian Defense: Alapin" }],
  ["e4 c5 d4", { eco: "B21", name: "Sicilian Defense: Smith-Morra Gambit" }],

  // French Defense
  ["e4 e6", { eco: "C00", name: "French Defense" }],
  ["e4 e6 d4", { eco: "C00", name: "French Defense" }],
  ["e4 e6 d4 d5", { eco: "C00", name: "French Defense" }],
  ["e4 e6 d4 d5 Nc3", { eco: "C03", name: "French Defense" }],
  ["e4 e6 d4 d5 Nc3 Nf6", { eco: "C11", name: "French Defense: Classical" }],
  ["e4 e6 d4 d5 Nc3 Bb4", { eco: "C15", name: "French Defense: Winawer" }],
  ["e4 e6 d4 d5 Nd2", { eco: "C01", name: "French Defense: Tarrasch" }],
  ["e4 e6 d4 d5 e5", { eco: "C02", name: "French Defense: Advance" }],
  ["e4 e6 d4 d5 exd5", { eco: "C01", name: "French Defense: Exchange" }],

  // Caro-Kann
  ["e4 c6", { eco: "B10", name: "Caro-Kann Defense" }],
  ["e4 c6 d4", { eco: "B10", name: "Caro-Kann Defense" }],
  ["e4 c6 d4 d5", { eco: "B12", name: "Caro-Kann Defense" }],
  ["e4 c6 d4 d5 Nc3", { eco: "B15", name: "Caro-Kann Defense" }],
  ["e4 c6 d4 d5 Nc3 dxe4 Nxe4", { eco: "B17", name: "Caro-Kann Defense: Classical" }],
  ["e4 c6 d4 d5 e5", { eco: "B12", name: "Caro-Kann Defense: Advance" }],
  ["e4 c6 d4 d5 exd5", { eco: "B13", name: "Caro-Kann Defense: Exchange" }],

  // Pirc / Modern
  ["e4 d6", { eco: "B07", name: "Pirc Defense" }],
  ["e4 d6 d4 Nf6", { eco: "B07", name: "Pirc Defense" }],
  ["e4 d6 d4 Nf6 Nc3", { eco: "B08", name: "Pirc Defense: Classical" }],
  ["e4 g6", { eco: "B06", name: "Modern Defense" }],
  ["e4 d5", { eco: "B01", name: "Scandinavian Defense" }],
  ["e4 d5 exd5 Qxd5", { eco: "B01", name: "Scandinavian Defense" }],
  ["e4 Nf6", { eco: "B02", name: "Alekhine's Defense" }],

  // Queen's Pawn
  ["d4", { eco: "A40", name: "Queen's Pawn" }],
  ["d4 d5", { eco: "D00", name: "Queen's Pawn Game" }],
  ["d4 d5 c4", { eco: "D06", name: "Queen's Gambit" }],
  ["d4 d5 c4 e6", { eco: "D30", name: "Queen's Gambit Declined" }],
  ["d4 d5 c4 e6 Nc3", { eco: "D31", name: "Queen's Gambit Declined" }],
  ["d4 d5 c4 e6 Nc3 Nf6", { eco: "D35", name: "Queen's Gambit Declined" }],
  ["d4 d5 c4 e6 Nf3", { eco: "D30", name: "Queen's Gambit Declined" }],
  ["d4 d5 c4 e6 Nf3 Nf6", { eco: "D37", name: "Queen's Gambit Declined" }],
  ["d4 d5 c4 dxc4", { eco: "D20", name: "Queen's Gambit Accepted" }],
  ["d4 d5 c4 c6", { eco: "D10", name: "Slav Defense" }],
  ["d4 d5 c4 c6 Nf3 Nf6", { eco: "D11", name: "Slav Defense" }],
  ["d4 d5 c4 c6 Nc3", { eco: "D10", name: "Slav Defense" }],
  ["d4 d5 Nf3", { eco: "D02", name: "Queen's Pawn Game" }],
  ["d4 d5 Nf3 Nf6", { eco: "D02", name: "Queen's Pawn Game" }],
  ["d4 d5 Bf4", { eco: "D00", name: "London System" }],
  ["d4 d5 Nf3 Nf6 Bf4", { eco: "D02", name: "London System" }],

  // Indian Defenses
  ["d4 Nf6", { eco: "A45", name: "Indian Defense" }],
  ["d4 Nf6 c4", { eco: "A46", name: "Indian Defense" }],
  ["d4 Nf6 c4 e6", { eco: "E00", name: "Indian Defense" }],
  ["d4 Nf6 c4 e6 Nc3", { eco: "E20", name: "Nimzo-Indian Defense" }],
  ["d4 Nf6 c4 e6 Nc3 Bb4", { eco: "E20", name: "Nimzo-Indian Defense" }],
  ["d4 Nf6 c4 e6 Nf3", { eco: "E10", name: "Indian Defense" }],
  ["d4 Nf6 c4 e6 Nf3 b6", { eco: "E10", name: "Queen's Indian Defense" }],
  ["d4 Nf6 c4 e6 g3", { eco: "E00", name: "Catalan Opening" }],
  ["d4 Nf6 c4 e6 g3 d5", { eco: "E00", name: "Catalan Opening" }],
  ["d4 Nf6 c4 g6", { eco: "E60", name: "King's Indian Defense" }],
  ["d4 Nf6 c4 g6 Nc3", { eco: "E60", name: "King's Indian Defense" }],
  ["d4 Nf6 c4 g6 Nc3 Bg7", { eco: "E70", name: "King's Indian Defense" }],
  ["d4 Nf6 c4 g6 Nc3 Bg7 e4", { eco: "E70", name: "King's Indian Defense" }],
  ["d4 Nf6 c4 g6 Nc3 Bg7 e4 d6", { eco: "E70", name: "King's Indian Defense" }],
  ["d4 Nf6 c4 g6 Nc3 d5", { eco: "D85", name: "Grunfeld Defense" }],
  ["d4 Nf6 c4 c5", { eco: "A57", name: "Benko Gambit" }],
  ["d4 Nf6 Nf3", { eco: "A46", name: "Indian Defense" }],
  ["d4 Nf6 Bf4", { eco: "A45", name: "London System" }],
  ["d4 Nf6 Nf3 g6 Bf4", { eco: "A48", name: "London System" }],
  ["d4 Nf6 Nf3 d5 Bf4", { eco: "D02", name: "London System" }],

  // Dutch
  ["d4 f5", { eco: "A80", name: "Dutch Defense" }],
  ["d4 e6 c4 f5", { eco: "A83", name: "Dutch Defense" }],

  // English Opening
  ["c4", { eco: "A10", name: "English Opening" }],
  ["c4 e5", { eco: "A20", name: "English Opening: Reversed Sicilian" }],
  ["c4 Nf6", { eco: "A15", name: "English Opening" }],
  ["c4 c5", { eco: "A30", name: "English Opening: Symmetrical" }],
  ["c4 e6", { eco: "A10", name: "English Opening" }],

  // Reti
  ["Nf3", { eco: "A04", name: "Reti Opening" }],
  ["Nf3 d5", { eco: "A06", name: "Reti Opening" }],
  ["Nf3 d5 c4", { eco: "A09", name: "Reti Opening" }],
  ["Nf3 Nf6", { eco: "A04", name: "Reti Opening" }],
  ["Nf3 d5 g3", { eco: "A06", name: "Reti Opening" }],

  // Other
  ["g3", { eco: "A00", name: "Hungarian Opening" }],
  ["b3", { eco: "A01", name: "Nimzo-Larsen Attack" }],
  ["f4", { eco: "A02", name: "Bird's Opening" }],
  ["b4", { eco: "A00", name: "Polish Opening" }],
]);

/**
 * Look up the opening name for the current move sequence.
 * Returns the deepest match found.
 */
export function lookupOpening(
  history: readonly { readonly san: string }[],
): { eco: string; name: string } | null {
  let lastMatch: Opening | null = null;
  const parts: string[] = [];

  for (const move of history) {
    parts.push(move.san);
    const key = parts.join(" ");
    const found = OPENINGS.get(key);
    if (found) {
      lastMatch = found;
    }
  }

  return lastMatch;
}
