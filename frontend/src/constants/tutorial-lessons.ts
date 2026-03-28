import type { TutorialCategoryDef, TutorialLesson } from "@/types/tutorial";

export const TUTORIAL_CATEGORIES: readonly TutorialCategoryDef[] = [
  { id: "basics", label: "Chess Basics", icon: "\u2659", description: "Learn how pieces move and basic rules" },
  { id: "openings", label: "Openings", icon: "\u2658", description: "Master common opening principles" },
  { id: "midgame", label: "Mid-Game", icon: "\u2656", description: "Tactics and strategy for the middle game" },
  { id: "endgame", label: "End-Game", icon: "\u2654", description: "Win in the endgame" },
];

export const TUTORIAL_LESSONS: readonly TutorialLesson[] = [
  // ═══════════════════════════════════════════
  // BASICS
  // ═══════════════════════════════════════════

  {
    id: "basics-pawn",
    title: "The Pawn",
    description: "Learn how pawns move and capture",
    category: "basics",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "Pawn Movement",
        text: "Pawns move forward one square, or two squares from their starting position. They are the soul of chess!",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        highlights: ["e2"],
      },
      {
        type: "move",
        title: "Push the Pawn",
        text: "Move the e-pawn two squares forward to e4.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        expectedMove: { from: "e2", to: "e4" },
        playerColor: "w",
        hintText: "Click the pawn on e2 and move it to e4.",
      },
      {
        type: "instruction",
        title: "Pawn Captures",
        text: "Pawns capture diagonally, one square forward. The e4 pawn can capture the black pawn on d5.",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2",
        highlights: ["e4", "d5"],
        arrows: [{ from: "e4", to: "d5" }],
      },
      {
        type: "move",
        title: "Capture the Pawn",
        text: "Capture the black pawn on d5 with your e4 pawn.",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2",
        expectedMove: { from: "e4", to: "d5" },
        playerColor: "w",
        hintText: "Move the e4 pawn diagonally to d5.",
      },
    ],
  },

  {
    id: "basics-minor-pieces",
    title: "Knights & Bishops",
    description: "Learn how knights and bishops move",
    category: "basics",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "The Knight",
        text: "Knights move in an L-shape: two squares in one direction, then one square perpendicular. They can jump over other pieces!",
        fen: "8/8/8/8/4N3/8/8/8 w - - 0 1",
        highlights: ["d6", "f6", "g5", "g3", "f2", "d2", "c3", "c5"],
      },
      {
        type: "move",
        title: "Jump the Knight",
        text: "Move the knight from e4 to f6.",
        fen: "8/8/8/8/4N3/8/8/8 w - - 0 1",
        expectedMove: { from: "e4", to: "f6" },
        playerColor: "w",
        hintText: "Click the knight on e4 and move it to f6 (two up, one right).",
      },
      {
        type: "instruction",
        title: "The Bishop",
        text: "Bishops move diagonally any number of squares. They stay on the same color square for the entire game.",
        fen: "8/8/8/8/3B4/8/8/8 w - - 0 1",
        highlights: ["e5", "f6", "g7", "h8", "c5", "b6", "a7", "e3", "f2", "g1", "c3", "b2", "a1"],
      },
      {
        type: "move",
        title: "Slide the Bishop",
        text: "Move the bishop from d4 to h8, sweeping across the diagonal.",
        fen: "8/8/8/8/3B4/8/8/8 w - - 0 1",
        expectedMove: { from: "d4", to: "h8" },
        playerColor: "w",
        hintText: "Click the bishop on d4 and move it to h8.",
      },
    ],
  },

  {
    id: "basics-checkmate",
    title: "Check & Checkmate",
    description: "Learn how to win the game",
    category: "basics",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "What Is Check?",
        text: "Check means the king is under attack. When in check, the king MUST escape — by moving, blocking, or capturing the attacker.",
        fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
        arrows: [{ from: "a1", to: "a8" }],
      },
      {
        type: "instruction",
        title: "What Is Checkmate?",
        text: "Checkmate means the king is in check and cannot escape. The game is over! Here the rook can deliver a back-rank mate.",
        fen: "6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1",
        arrows: [{ from: "a1", to: "a8" }],
      },
      {
        type: "move",
        title: "Deliver Checkmate!",
        text: "Move the rook to a8 to deliver checkmate. The black king has no escape!",
        fen: "6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1",
        expectedMove: { from: "a1", to: "a8" },
        playerColor: "w",
        hintText: "Move the rook to the 8th rank — a8!",
      },
    ],
  },

  {
    id: "basics-castling",
    title: "Castling",
    description: "Learn the special move that protects your king",
    category: "basics",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "What Is Castling?",
        text: "Castling is a special move where the king moves two squares toward a rook, and the rook jumps over the king. It can only be done if neither piece has moved.",
        fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1",
        highlights: ["e1", "g1", "h1"],
      },
      {
        type: "move",
        title: "Castle Kingside",
        text: "Castle kingside by moving the king from e1 to g1. The rook will automatically jump to f1.",
        fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1",
        expectedMove: { from: "e1", to: "g1" },
        playerColor: "w",
        hintText: "Move the king two squares toward the h1 rook (e1 to g1).",
      },
      {
        type: "instruction",
        title: "Safe and Sound",
        text: "The king is now tucked behind the pawns with the rook active. Castle early to keep your king safe — it's one of the most important opening principles!",
        fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 w kq - 1 1",
        highlights: ["g1", "f1"],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // OPENINGS
  // ═══════════════════════════════════════════

  {
    id: "openings-italian",
    title: "The Italian Game",
    description: "A classic opening targeting the f7 square",
    category: "openings",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "The Italian Game",
        text: "The Italian Game begins with 1.e4 e5 2.Nf3 Nc6 3.Bc4 — controlling the center and aiming at Black's weakest point, f7. Let's play it move by move.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      },
      {
        type: "move",
        title: "1. e4",
        text: "Start by pushing the e-pawn two squares. This controls the center and opens lines for the bishop.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        expectedMove: { from: "e2", to: "e4" },
        playerColor: "w",
        autoReply: { from: "e7", to: "e5" },
        hintText: "Push the e-pawn to e4.",
      },
      {
        type: "move",
        title: "2. Nf3",
        text: "Develop the knight to f3, attacking the e5 pawn and preparing to control the center.",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
        expectedMove: { from: "g1", to: "f3" },
        playerColor: "w",
        autoReply: { from: "b8", to: "c6" },
        hintText: "Develop the knight from g1 to f3.",
      },
      {
        type: "move",
        title: "3. Bc4",
        text: "Place the bishop on c4, targeting the f7 pawn — the weakest point in Black's position (only the king defends it).",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        expectedMove: { from: "f1", to: "c4" },
        playerColor: "w",
        hintText: "Develop the bishop from f1 to c4.",
      },
      {
        type: "instruction",
        title: "The Italian Position",
        text: "This is the Italian Game! The bishop on c4 aims straight at f7. White has rapid development and central control.",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        arrows: [{ from: "c4", to: "f7" }],
      },
      {
        type: "freeplay",
        title: "Explore",
        text: "Explore the Italian Game position freely. Try different continuations for both sides!",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        playerColor: "w",
      },
    ],
  },

  {
    id: "openings-queens-gambit",
    title: "The Queen's Gambit",
    description: "Offer a pawn to seize the center",
    category: "openings",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "The Queen's Gambit",
        text: "The Queen's Gambit (1.d4 d5 2.c4) is one of the oldest and most respected openings. White offers a pawn to gain control of the center.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      },
      {
        type: "move",
        title: "1. d4",
        text: "Start with the queen's pawn. This controls the center and prepares to challenge Black's center pawn.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        expectedMove: { from: "d2", to: "d4" },
        playerColor: "w",
        autoReply: { from: "d7", to: "d5" },
        hintText: "Push the d-pawn to d4.",
      },
      {
        type: "move",
        title: "2. c4 — The Gambit",
        text: "Offer the c-pawn! If Black takes (dxc4), White can recapture later and play e4, dominating the center.",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2",
        expectedMove: { from: "c2", to: "c4" },
        playerColor: "w",
        hintText: "Push the c-pawn to c4.",
      },
      {
        type: "instruction",
        title: "The Gambit Position",
        text: "White offers the c4 pawn. If Black captures with dxc4, White gets a strong center with e4 next. If Black declines, White maintains central pressure. It's a win-win!",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2",
        arrows: [{ from: "d5", to: "c4" }],
      },
    ],
  },

  {
    id: "openings-sicilian",
    title: "The Sicilian Defense",
    description: "Black's most popular reply to 1.e4",
    category: "openings",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "The Sicilian Defense",
        text: "The Sicilian Defense (1.e4 c5) is Black's most aggressive response to 1.e4. It creates an asymmetric, fighting game from the very first move.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      },
      {
        type: "move",
        title: "1. e4",
        text: "Start with 1.e4 — the most popular opening move.",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        expectedMove: { from: "e2", to: "e4" },
        playerColor: "w",
        autoReply: { from: "c7", to: "c5" },
        hintText: "Push the e-pawn to e4.",
      },
      {
        type: "instruction",
        title: "Why c5?",
        text: "Black's c5 pawn fights for the d4 square without mirroring White's center. This avoids a symmetrical position and leads to rich, complex play.",
        fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
        highlights: ["c5", "d4"],
      },
      {
        type: "freeplay",
        title: "Explore",
        text: "Common continuations: 2.Nf3 (most popular), 2.Nc3 (Closed Sicilian), or 2.d4 (immediate central break). Try them out!",
        fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
        playerColor: "w",
      },
    ],
  },

  // ═══════════════════════════════════════════
  // MID-GAME (Tactics)
  // ═══════════════════════════════════════════

  {
    id: "midgame-pin",
    title: "The Pin",
    description: "Restrict pieces by attacking through them",
    category: "midgame",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "What Is a Pin?",
        text: "A pin restricts a piece from moving because it would expose a more valuable piece behind it. The pinned piece is stuck!",
        fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        arrows: [{ from: "b5", to: "c6" }, { from: "b5", to: "e8" }],
      },
      {
        type: "instruction",
        title: "Create a Pin",
        text: "Now it's your turn. In this position after 1.d4 d5 2.c4 e6 3.Nc3 Nf6, you can pin the knight on f6 to the queen on d8 with Bg5.",
        fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
        arrows: [{ from: "c1", to: "g5" }],
      },
      {
        type: "move",
        title: "Pin the Knight!",
        text: "Play Bg5 to pin the knight on f6 to the queen on d8.",
        fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
        expectedMove: { from: "c1", to: "g5" },
        playerColor: "w",
        hintText: "Move the bishop from c1 to g5 — pin the knight to the queen!",
      },
      {
        type: "instruction",
        title: "Pinned!",
        text: "The knight on f6 is now pinned to the queen on d8. If the knight moves, the bishop captures the queen! This is a powerful positional weapon.",
        fen: "rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b KQkq - 3 4",
        arrows: [{ from: "g5", to: "f6" }, { from: "g5", to: "d8" }],
      },
    ],
  },

  {
    id: "midgame-fork",
    title: "The Fork",
    description: "Attack two pieces at once",
    category: "midgame",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "What Is a Fork?",
        text: "A fork attacks two or more pieces simultaneously. The opponent can only save one, so you win material! Knights are especially good at forking.",
        fen: "r2qk2r/ppp2ppp/2n1b3/3N4/8/8/PPP2PPP/R1BQK2R w KQkq - 0 1",
        highlights: ["d5"],
      },
      {
        type: "move",
        title: "Fork the King and Rook!",
        text: "Move the knight from d5 to c7, attacking both the king on e8 and the rook on a8!",
        fen: "r2qk2r/ppp2ppp/2n1b3/3N4/8/8/PPP2PPP/R1BQK2R w KQkq - 0 1",
        expectedMove: { from: "d5", to: "c7" },
        playerColor: "w",
        hintText: "The knight on d5 can jump to c7 — attacking the king AND the rook!",
      },
      {
        type: "instruction",
        title: "Forked!",
        text: "Nc7+ is check, so the king must move. Then you capture the rook on a8 for free! Forks are one of the most common tactical patterns.",
        fen: "r2qk2r/ppN2ppp/2n1b3/8/8/8/PPP2PPP/R1BQK2R b KQkq - 1 1",
        arrows: [{ from: "c7", to: "e8" }, { from: "c7", to: "a8" }],
      },
    ],
  },

  {
    id: "midgame-skewer",
    title: "The Skewer",
    description: "Attack through a valuable piece",
    category: "midgame",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "What Is a Skewer?",
        text: "A skewer attacks a valuable piece that, when it moves, exposes a piece behind it. It's like a reverse pin — the more valuable piece is in front!",
        fen: "5rk1/8/8/8/8/8/8/R3K3 w - - 0 1",
        arrows: [{ from: "a1", to: "a8" }],
      },
      {
        type: "move",
        title: "Skewer!",
        text: "Play Ra8+! The rook checks the king on g8 along the 8th rank. When the king moves, you capture the rook on f8.",
        fen: "5rk1/8/8/8/8/8/8/R3K3 w - - 0 1",
        expectedMove: { from: "a1", to: "a8" },
        playerColor: "w",
        hintText: "Check the king with Ra8+ — the rook on f8 is behind it!",
      },
      {
        type: "instruction",
        title: "Won Material!",
        text: "The king must move, and the rook on f8 falls. Skewers are devastating along ranks, files, and diagonals. Watch for them with rooks, bishops, and queens!",
        fen: "R4k2/8/8/8/8/8/8/4K3 w - - 0 2",
        arrows: [{ from: "a8", to: "f8" }],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // END-GAME
  // ═══════════════════════════════════════════

  {
    id: "endgame-kq-mate",
    title: "King & Queen Checkmate",
    description: "Force checkmate with king and queen",
    category: "endgame",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "Queen Checkmate Technique",
        text: "With king and queen vs. lone king, the technique is to use the queen to restrict the opponent's king to the edge of the board, then bring your king closer to deliver mate.",
        fen: "8/8/8/4k3/8/8/8/K6Q w - - 0 1",
      },
      {
        type: "move",
        title: "Restrict the King",
        text: "Play Qf3! This cuts off the king from ranks 1-3 and the f-file, boxing it in without giving check.",
        fen: "8/8/8/4k3/8/8/8/K6Q w - - 0 1",
        expectedMove: { from: "h1", to: "f3" },
        playerColor: "w",
        hintText: "Move the queen to f3 — restrict the king's escape squares!",
      },
      {
        type: "instruction",
        title: "Squeeze and Mate",
        text: "The queen restricts the king. Now walk your king closer to help deliver checkmate. The key: restrict first, then approach with the king. Never stalemate!",
        fen: "8/8/8/4k3/8/5Q2/8/K7 w - - 1 1",
      },
    ],
  },

  {
    id: "endgame-kr-mate",
    title: "King & Rook Checkmate",
    description: "Force checkmate with king and rook",
    category: "endgame",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "Rook Checkmate Technique",
        text: "Rook + King vs. King: use the rook to cut off ranks or files, confining the enemy king. Then walk your king up to assist for a back-rank or edge mate.",
        fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1",
        arrows: [{ from: "a1", to: "a5" }],
      },
      {
        type: "move",
        title: "Cut Off the King",
        text: "Play Ra5! This confines the black king to the top half of the board by cutting off the 5th rank.",
        fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1",
        expectedMove: { from: "a1", to: "a5" },
        playerColor: "w",
        hintText: "Move the rook to a5 — cut off the 5th rank!",
      },
      {
        type: "instruction",
        title: "Confined!",
        text: "The black king is now trapped on ranks 6-8. March your king up to support the rook. Together they will force the enemy king to the edge for checkmate.",
        fen: "8/8/8/R3k3/8/8/8/4K3 w - - 2 2",
      },
    ],
  },

  {
    id: "endgame-promotion",
    title: "Pawn Promotion",
    description: "Turn a pawn into a queen",
    category: "endgame",
    xpReward: 25,
    steps: [
      {
        type: "instruction",
        title: "Pawn Promotion",
        text: "When a pawn reaches the 8th rank, it promotes to any piece — almost always a queen! Getting a pawn to promote is often the key to winning endgames.",
        fen: "8/4P1k1/8/8/8/8/8/4K3 w - - 0 1",
        highlights: ["e7"],
        arrows: [{ from: "e7", to: "e8" }],
      },
      {
        type: "move",
        title: "Promote!",
        text: "Push the pawn to e8 and promote it to a queen!",
        fen: "8/4P1k1/8/8/8/8/8/4K3 w - - 0 1",
        expectedMove: { from: "e7", to: "e8", promotion: "q" },
        playerColor: "w",
        hintText: "Move the e7 pawn to e8 — it will promote!",
      },
      {
        type: "instruction",
        title: "A New Queen!",
        text: "Congratulations! With an extra queen, it's now a straightforward king and queen checkmate. Passed pawns are incredibly powerful in the endgame.",
        fen: "4Q3/6k1/8/8/8/8/8/4K3 w - - 0 1",
      },
    ],
  },
];

export function getLessonsForCategory(category: string): readonly TutorialLesson[] {
  return TUTORIAL_LESSONS.filter((l) => l.category === category);
}

export function getLessonById(id: string): TutorialLesson | undefined {
  return TUTORIAL_LESSONS.find((l) => l.id === id);
}

export function getNextLesson(currentId: string): TutorialLesson | undefined {
  const idx = TUTORIAL_LESSONS.findIndex((l) => l.id === currentId);
  return idx >= 0 && idx < TUTORIAL_LESSONS.length - 1 ? TUTORIAL_LESSONS[idx + 1] : undefined;
}
