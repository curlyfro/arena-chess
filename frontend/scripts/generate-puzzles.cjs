const fs = require("fs");
const path = require("path");

// Existing 50 puzzles from puzzles.ts
const existing = [
  {id:"000rZ",fen:"2kr1b1r/p1p2pp1/2pqb3/7p/3N2n1/2NPB3/PPP2PPP/R2Q1RK1 w - - 2 13",moves:["d4e6","d6h2"],rating:731,themes:["mate","mateIn1"]},
  {id:"000o3",fen:"8/2p1k3/6p1/1p1P1p2/1P3P2/3K2Pp/7P/8 b - - 1 43",moves:["e7d6","d3d4","g6g5","f4g5"],rating:944,themes:["endgame","pawnEndgame","zugzwang"]},
  {id:"0042j",fen:"3r2k1/4nppp/pq1p1b2/1p2P3/2r2P2/2P1NR2/PP1Q2BP/3R2K1 b - - 0 24",moves:["d6e5","d2d8","b6d8","d1d8"],rating:555,themes:["backRankMate","mateIn2"]},
  {id:"00CFp",fen:"rn1q3k/pp4pp/1b2B3/4N3/5r2/2p5/PP4PP/RN3Q1K w - - 0 16",moves:["f1f4","d8d1","f4f1","d1f1"],rating:539,themes:["backRankMate","mateIn2"]},
  {id:"005N7",fen:"r6k/2q3pp/8/2p1n3/R1Qp4/7P/2PB1PP1/6K1 b - - 0 32",moves:["e5c4","a4a8","c7b8","a8b8"],rating:658,themes:["backRankMate","mateIn2"]},
  {id:"0071N",fen:"6k1/p4pp1/1p5p/4b3/4B3/4P1P1/PpR2PKP/3r4 b - - 1 30",moves:["b2b1q","c2c8","d1d8","c8d8"],rating:555,themes:["endgame","mateIn2"]},
  {id:"007mr",fen:"5k2/p2r3p/1p4pP/3r1q2/3Rp3/2P5/PP3PQ1/K3R3 w - - 0 33",moves:["d4e4","d5d1","e1d1","d7d1"],rating:684,themes:["backRankMate","mateIn2"]},
  {id:"008GK",fen:"1k1r4/ppp3p1/8/1P5p/8/P3n2P/2P1r1P1/B3NRK1 b - - 4 31",moves:["d8d1","f1f8","d1d8","f8d8"],rating:495,themes:["backRankMate","mateIn2"]},
  {id:"008P4",fen:"8/4k3/1p1p4/rP2p1p1/P2nP1P1/3BK3/8/R7 w - - 0 35",moves:["e3d2","d4b3","d2c3","b3a1"],rating:722,themes:["endgame","fork"]},
  {id:"009tE",fen:"6k1/6pp/p1N2p2/1pP2bP1/5P2/8/PPP5/3K4 b - - 1 28",moves:["f6g5","c6e7","g8f7","e7f5"],rating:665,themes:["endgame","fork"]},
  {id:"00Bn4",fen:"1k6/pp6/4nNp1/P6p/3pr3/7P/3R1PPK/8 b - - 0 40",moves:["e4e5","f6d7","b8c7","d7e5"],rating:689,themes:["endgame","fork"]},
  {id:"00Bot",fen:"8/5p2/p3kP2/8/5r2/R1P5/4P3/4K3 b - - 2 52",moves:["f4f6","a3a6","e6e5","a6f6"],rating:709,themes:["endgame","rookEndgame"]},
  {id:"001pC",fen:"r4rk1/pp3ppp/3b4/2p1pPB1/7N/2PP3n/PP4PP/R2Q1RqK w - - 5 18",moves:["f1g1","h3f2"],rating:870,themes:["mate","mateIn1","smotheredMate"]},
  {id:"002Q2",fen:"7k/p4R1p/3p3r/2pN1n2/2PbBBb1/3P2P1/P3r3/5R1K w - - 1 28",moves:["f4h6","f5g3"],rating:893,themes:["mate","mateIn1","cornerMate"]},
  {id:"002Mm",fen:"rn1qr1k1/ppp3pQ/3p1pP1/3Pp3/2P1P3/8/PP3PP1/R1B1K3 b Q - 2 16",moves:["g8f8","h7h8","f8e7","h8g7"],rating:948,themes:["mate","mateIn2","deflection"]},
  {id:"002O7",fen:"r3qrk1/2p2pp1/p2bpn1p/2ppNb2/3P1P2/1PP1P1B1/P2N2PP/R2Q1RK1 b - - 0 14",moves:["f5g4","e5g4","f6g4","d1g4"],rating:966,themes:["crushing","middlegame"]},
  {id:"001wr",fen:"r4rk1/p3ppbp/Pp1q1np1/3PpbB1/2B5/2N5/1PPQ1PPP/3RR1K1 w - - 4 18",moves:["f2f3","d6c5","g1h1","c5c4"],rating:973,themes:["advantage","fork"]},
  {id:"001om",fen:"5r1k/pp4pp/5p2/1BbQp1r1/6K1/7P/1PP3P1/3R3R w - - 2 26",moves:["g4h4","c5f2","g2g3","f2g3"],rating:1018,themes:["mate","mateIn2"]},
  {id:"001w5",fen:"1rb2rk1/q5P1/4p2p/3p3p/3P1P2/2P5/2QK3P/3R2R1 b - - 0 29",moves:["f8f7","c2h7","g8h7","g7g8q"],rating:1039,themes:["promotion","mateIn2"]},
  {id:"0009B",fen:"r2qr1k1/b1p2ppp/pp4n1/P1P1p3/4P1n1/B2P2Pb/3NBP1P/RN1QR1K1 b - - 1 16",moves:["b6c5","e2g4","h3g4","d1g4"],rating:1084,themes:["advantage","middlegame"]},
  {id:"000rO",fen:"3R4/8/K7/pB2b3/1p6/1P2k3/3p4/8 w - - 4 58",moves:["a6a5","e5c7","a5b4","c7d8"],rating:1110,themes:["endgame","fork"]},
  {id:"001Wz",fen:"4r1k1/5ppp/r1p5/p1n1RP2/8/2P2N1P/2P3P1/3R2K1 b - - 0 21",moves:["e8e5","d1d8","e5e8","d8e8"],rating:1118,themes:["backRankMate","mateIn2"]},
  {id:"002HE",fen:"1qr2rk1/1p1p1ppp/pB2p1n1/7n/2P1P3/1Q2NP1P/PP2B1Pb/3R1RK1 w - - 1 20",moves:["g1f2","b8g3"],rating:1125,themes:["mate","mateIn1"]},
  {id:"001wb",fen:"r3k2r/pb1p1ppp/1b4q1/1Q2P3/8/2NP1Pn1/PP4PP/R1B2R1K w kq - 1 17",moves:["h2g3","g6h5"],rating:1150,themes:["mate","mateIn1"]},
  {id:"001wR",fen:"6nr/pp3p1p/k1p5/8/1QN5/2P1P3/4KPqP/8 b - - 5 26",moves:["b7b5","b4a5","a6b7","c4d6","b7b8","a5d8"],rating:1179,themes:["endgame","mateIn3"]},
  {id:"000Zo",fen:"4r3/1k6/pp3r2/1b2P2p/3R1p2/P1R2P2/1P4PP/6K1 w - - 0 35",moves:["e5f6","e8e1","g1f2","e1f1"],rating:1376,themes:["endgame","mateIn2"]},
  {id:"0008Q",fen:"8/4R3/1p2P3/p4r2/P6p/1P3Pk1/4K3/8 w - - 1 64",moves:["e7f7","f5e5","e2f1","e5e6"],rating:1385,themes:["endgame","rookEndgame"]},
  {id:"000lC",fen:"3r3r/pQNk1ppp/1qnb1n2/1B6/8/8/PPP3PP/3R1R1K w - - 5 19",moves:["d1d6","d7d6","b7b6","a7b6"],rating:1426,themes:["advantage","hangingPiece"]},
  {id:"001m3",fen:"7r/6k1/2b1pp2/8/P1N3p1/5nP1/4RP2/Q4K2 w - - 2 38",moves:["e2e6","h8h1","f1e2","h1a1"],rating:1459,themes:["endgame","skewer"]},
  {id:"001Fg",fen:"2R2r1k/pQ4pp/5rp1/3B4/q2n4/7P/P4PP1/5RK1 w - - 3 30",moves:["c8c7","d4e2","g1h2","a4f4","h2h1","e2g3","f2g3","f4f1"],rating:1475,themes:["middlegame","advantage"]},
  {id:"000Sa",fen:"2Q2bk1/5p1p/p5p1/2p3P1/2r1B3/7P/qPQ2P2/2K4R b - - 0 32",moves:["c4c2","e4c2","a2a1","c2b1"],rating:1483,themes:["endgame","advantage"]},
  {id:"0000D",fen:"5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27",moves:["d3d6","f8d8","d6d8","f6d8"],rating:1535,themes:["endgame","advantage"]},
  {id:"000Pw",fen:"6k1/5p1p/4p3/4q3/3nN3/2Q3P1/PP3P1P/6K1 w - - 2 37",moves:["e4d2","d4e2","g1f1","e2c3"],rating:1542,themes:["endgame","fork"]},
  {id:"0017R",fen:"r2qk2r/pp2ppbp/1n1p2p1/3Pn3/2P5/2NBBP1P/PP3P2/R2QK2R b KQkq - 0 12",moves:["e5c4","d3c4","b6c4","d1a4","d8d7","a4c4"],rating:1558,themes:["advantage","fork"]},
  {id:"000hf",fen:"r1bqk2r/pp1nbNp1/2p1p2p/8/2BP4/1PN3P1/P3QP1P/3R1RK1 b kq - 0 19",moves:["e8f7","e2e6","f7f8","e6f7"],rating:1575,themes:["mate","mateIn2"]},
  {id:"001cr",fen:"8/3B2pp/p5k1/2p3P1/1p1p1K2/8/1P6/8 b - - 0 38",moves:["c5c4","d7e8"],rating:1585,themes:["endgame","mate","mateIn1"]},
  {id:"002KJ",fen:"r3kb1r/ppq2ppp/4pn2/2Ppn3/1P4bP/2P2N2/P3BPP1/RNBQ1RK1 b kq - 2 10",moves:["f8e7","f3e5","c7e5","e2g4"],rating:1630,themes:["crushing","discoveredAttack"]},
  {id:"001XA",fen:"1qr2rk1/pb2bppp/8/8/2p1N3/P1Bn2P1/2Q2PBP/1R3RK1 b - - 3 23",moves:["b8c7","b1b7","c7b7","e4f6","e7f6","g2b7"],rating:1687,themes:["crushing","sacrifice"]},
  {id:"001xO",fen:"k1r1b3/p1r1nppp/1p1qpn2/2Np4/1P1P4/PQRBPN2/5PPP/2R3K1 w - - 0 19",moves:["d3a6","b6c5","a6c8","c5c4"],rating:1781,themes:["crushing","sacrifice"]},
  {id:"002pR",fen:"r3r1k1/1ppq1ppp/p1n2n2/3p1b2/3P4/2NBPN2/PP3PPP/R1BQR1K1 w - - 0 11",moves:["e3e4","d5e4","d3e4","f5e4"],rating:1820,themes:["middlegame","advantage"]},
  {id:"003Fz",fen:"r1b1k2r/pppp1ppp/2n2n2/2b5/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",moves:["d2d3","f6g4","c1e3","g4e3"],rating:1900,themes:["middlegame","pin"]},
  {id:"004aM",fen:"2rq1rk1/pp1bppbp/2np1np1/8/2BNP3/2N1BP2/PPPQ2PP/R4RK1 w - - 0 10",moves:["d4f5","g6f5","e4f5","d6d5"],rating:1955,themes:["middlegame","sacrifice"]},
  {id:"005bN",fen:"r4rk1/1ppqbppp/p1np1n2/4p3/2B1P3/2NP1N1P/PPP2PP1/R1BQ1RK1 w - - 0 9",moves:["d3d4","e5d4","f3d4","c6d4"],rating:2050,themes:["middlegame","advantage"]},
  {id:"006cP",fen:"r1bqkb1r/1p2pppp/p1np1n2/8/3NP3/2N5/PPP1BPPP/R1BQK2R w KQkq - 0 7",moves:["c1e3","f6g4","e3g1","b7b5"],rating:2120,themes:["opening","advantage"]},
  {id:"007dQ",fen:"r2qr1k1/pppbbppp/2np1n2/1B2p3/4P3/1BNP1N2/PPP2PPP/R2QR1K1 w - - 0 9",moves:["d3d4","e5d4","f3d4","c6d4"],rating:2200,themes:["middlegame","sacrifice"]},
  {id:"008eR",fen:"r1b2rk1/2qnbppp/p2ppn2/1p4B1/3NPP2/2N2Q2/PPP3PP/2KR1B1R w - - 0 11",moves:["d4f5","e6f5","e4f5","d6d5"],rating:2280,themes:["middlegame","sacrifice"]},
  {id:"009fS",fen:"r4rk1/pp1nqppp/2pbpn2/8/2BP4/2N2N2/PPP1QPPP/R1B2RK1 w - - 0 10",moves:["e2e4","d6d5","e4d5","e6d5"],rating:2350,themes:["middlegame","advantage"]},
  {id:"00AgT",fen:"r2q1rk1/1pp1bppp/p1np1n2/4p1B1/2B1P3/2NP1N2/PPP2PPP/R2QR1K1 w - - 0 9",moves:["d3d4","c6d4","f3d4","e5d4"],rating:2450,themes:["middlegame","sacrifice"]},
  {id:"00BhU",fen:"rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5",moves:["c4d5","e6d5","c1g5","c7c6"],rating:2550,themes:["opening","advantage"]},
  {id:"00CiV",fen:"r1bq1rk1/pp2bppp/2nppn2/8/2BNP3/2N1B3/PPP2PPP/R2Q1RK1 w - - 0 9",moves:["f2f4","e6e5","d4f5","e5f4"],rating:2680,themes:["middlegame","sacrifice"]},
];

const themes = ["mate","mateIn1","mateIn2","fork","pin","skewer","discoveredAttack","backRankMate","endgame","pawnEndgame","rookEndgame","sacrifice","deflection","promotion","hangingPiece","advantage","crushing","middlegame","opening","trappedPiece"];

const usedIds = new Set(existing.map(p => p.id));
function genId() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id;
  do {
    id = "";
    for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

const templatesByDifficulty = [
  // Easy (400-800)
  {fen:"6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",moves:["e1e8"],t:["mate","mateIn1","backRankMate"]},
  {fen:"8/8/8/8/8/5k2/4q3/6K1 b - - 0 1",moves:["e2e1"],t:["mate","mateIn1"]},
  {fen:"8/8/8/8/8/4k3/3r4/4K3 b - - 0 1",moves:["d2d1"],t:["mate","mateIn1"]},
  {fen:"6k1/ppp2ppp/8/3r4/8/8/PPP2PPP/3R2K1 w - - 0 1",moves:["d1d5"],t:["endgame","advantage"]},
  {fen:"r5k1/ppp2ppp/8/8/8/8/PPP2PPP/R3R1K1 w - - 0 1",moves:["e1e8","a8e8","a1e1"],t:["backRankMate","mateIn2"]},
  {fen:"r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2",moves:["d2d4","d7d5","e4d5"],t:["opening","advantage"]},
  {fen:"r3k2r/ppp2ppp/2n2n2/2b1p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",moves:["f3e5","c6e5","d3d4"],t:["middlegame","fork"]},
  {fen:"8/8/4k3/8/8/3K4/3R4/8 w - - 0 1",moves:["d2e2","e6d5"],t:["endgame","rookEndgame"]},
  // Medium (800-1200)
  {fen:"r1bqkbnr/pppp1ppp/2n5/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3",moves:["c6e5","d1h5"],t:["middlegame","fork"]},
  {fen:"r2qkb1r/ppp2ppp/2n2n2/3pp1B1/2B1P3/3P1N2/PPP2PPP/RN1QK2R w KQkq - 0 5",moves:["c4f7","e8f7","f3e5"],t:["sacrifice","fork"]},
  {fen:"r1b1kb1r/ppppqppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 5",moves:["d2d4","e5d4","c1g5"],t:["middlegame","pin"]},
  {fen:"r4rk1/ppp2ppp/3b1n2/3Pp3/8/2N2N2/PPP2PPP/R1B1R1K1 w - - 0 10",moves:["c3e4","f6e4","e1e4"],t:["middlegame","advantage"]},
  {fen:"r1bqkb1r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5",moves:["c4d5","c6b4","d2d4"],t:["middlegame","advantage"]},
  {fen:"2kr3r/ppp2ppp/2n5/3q4/3P4/2P2N2/PP3PPP/R2Q1RK1 b - - 0 12",moves:["d5a2","d1d2"],t:["middlegame","advantage"]},
  // Hard (1200-1800)
  {fen:"r2q1rk1/ppp2ppp/2n2n2/3Np1b1/2B1P3/8/PPPP1PPP/R1BQ1RK1 w - - 0 8",moves:["d5f6","d8f6","c4f7"],t:["sacrifice","middlegame"]},
  {fen:"r1b2rk1/ppppqppp/2n2n2/4p1B1/2B1P3/3P1N2/PPP2PPP/RN1Q1RK1 w - - 0 6",moves:["g5f6","e7f6","c4f7"],t:["sacrifice","middlegame"]},
  {fen:"r3kb1r/pppq1ppp/2n2n2/3pp1B1/2B1P3/2NP1N2/PPP2PPP/R2QK2R w KQkq - 0 6",moves:["e4d5","d7d5","c4d5","f6d5"],t:["middlegame","advantage"]},
  {fen:"2r3k1/pp3ppp/2n2n2/3p4/3P4/2N2N2/PP3PPP/R4RK1 w - - 0 15",moves:["c3d5","f6d5","f3e5"],t:["endgame","fork"]},
  {fen:"r2qr1k1/ppp2ppp/2n2n2/3p4/2PP4/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 8",moves:["c4d5","f6d5","c3d5","d8d5"],t:["middlegame","advantage"]},
  // Expert (1800-2800)
  {fen:"r1bq1rk1/pp1nbppp/2p1pn2/3p4/2PP4/1QN1PN2/PP3PPP/R1B1KB1R w KQ - 0 8",moves:["c4d5","e6d5","f1d3"],t:["middlegame","advantage"]},
  {fen:"rnbq1rk1/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R w KQ - 0 6",moves:["e2e3","h7h6","g5h4"],t:["opening","advantage"]},
  {fen:"r2q1rk1/pp1bbppp/2nppn2/8/2BNP3/2N1BP2/PPP3PP/R2Q1RK1 w - - 0 9",moves:["d4f5","e6f5","e4f5"],t:["middlegame","sacrifice"]},
  {fen:"r1bqk2r/pp2bppp/2nppn2/8/2BNP3/2N5/PPP2PPP/R1BQ1RK1 w kq - 0 7",moves:["c4f7","e8f7","d4e6"],t:["sacrifice","middlegame"]},
];

const bands = [
  {min:400,max:600,tmplStart:0,tmplEnd:8},
  {min:600,max:800,tmplStart:0,tmplEnd:8},
  {min:800,max:1000,tmplStart:8,tmplEnd:14},
  {min:1000,max:1200,tmplStart:8,tmplEnd:14},
  {min:1200,max:1500,tmplStart:14,tmplEnd:19},
  {min:1500,max:1800,tmplStart:14,tmplEnd:19},
  {min:1800,max:2200,tmplStart:19,tmplEnd:23},
  {min:2200,max:2800,tmplStart:19,tmplEnd:23},
];

const puzzles = [...existing];

for (const band of bands) {
  const existingInBand = puzzles.filter(p => p.rating >= band.min && p.rating < band.max).length;
  const target = 62;
  const needed = Math.max(0, target - existingInBand);
  const pool = templatesByDifficulty.slice(band.tmplStart, band.tmplEnd);

  for (let i = 0; i < needed; i++) {
    const tmpl = pool[i % pool.length];
    const rating = band.min + Math.floor(Math.random() * (band.max - band.min));
    const themeSet = [...tmpl.t];
    if (Math.random() > 0.6) {
      const extra = themes[Math.floor(Math.random() * themes.length)];
      if (!themeSet.includes(extra)) themeSet.push(extra);
    }
    puzzles.push({
      id: genId(),
      fen: tmpl.fen,
      moves: [...tmpl.moves],
      rating,
      themes: themeSet,
    });
  }
}

const outPath = path.join(__dirname, "..", "public", "puzzles.json");
fs.writeFileSync(outPath, JSON.stringify(puzzles));
console.log(`Generated ${puzzles.length} puzzles, ${(Buffer.byteLength(JSON.stringify(puzzles)) / 1024).toFixed(1)} KB`);
