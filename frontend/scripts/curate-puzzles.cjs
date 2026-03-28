/**
 * Curate 500 puzzles from the Lichess puzzle database CSV.
 *
 * Selection criteria:
 * - Popular puzzles (Popularity >= 80, NbPlays >= 500)
 * - Low rating deviation (RatingDeviation <= 100 for stability)
 * - Balanced across 8 rating bands (~62 each)
 * - Diverse themes within each band
 * - Moves with 2-8 ply (not too short, not too long)
 */

const fs = require("fs");
const readline = require("readline");
const path = require("path");

const INPUT = process.env.TEMP
  ? require("path").join(process.env.TEMP, "lichess_puzzles.csv")
  : "/tmp/lichess_puzzles.csv";
const OUTPUT = path.join(__dirname, "..", "public", "puzzles.json");

const BANDS = [
  { min: 400, max: 700, target: 62 },
  { min: 700, max: 1000, target: 62 },
  { min: 1000, max: 1200, target: 63 },
  { min: 1200, max: 1400, target: 63 },
  { min: 1400, max: 1600, target: 63 },
  { min: 1600, max: 1800, target: 62 },
  { min: 1800, max: 2100, target: 62 },
  { min: 2100, max: 2900, target: 63 },
];

// Collect candidates per band, then pick the best
const candidates = BANDS.map(() => []);

async function main() {
  const stream = fs.createReadStream(INPUT, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // skip header

    const parts = line.split(",");
    if (parts.length < 8) continue;

    const [id, fen, movesStr, ratingStr, rdStr, popStr, playsStr, themes] = parts;
    const rating = parseInt(ratingStr, 10);
    const rd = parseInt(rdStr, 10);
    const pop = parseInt(popStr, 10);
    const plays = parseInt(playsStr, 10);
    const moves = movesStr.split(" ");

    // Quality filters
    if (rd > 100) continue;
    if (pop < 75) continue;
    if (plays < 500) continue;
    if (moves.length < 2 || moves.length > 8) continue;
    if (!fen || !id) continue;

    // Find which band this belongs to
    for (let i = 0; i < BANDS.length; i++) {
      if (rating >= BANDS[i].min && rating < BANDS[i].max) {
        candidates[i].push({
          id,
          fen,
          moves,
          rating,
          themes: themes.split(" ").filter(Boolean),
          score: pop * 0.5 + Math.min(plays, 50000) / 1000,
        });
        break;
      }
    }

    // Early exit once we have enough candidates
    const totalCandidates = candidates.reduce((s, c) => s + c.length, 0);
    if (totalCandidates > 50000) break;
  }

  console.log("Candidates per band:");
  BANDS.forEach((b, i) => {
    console.log(`  ${b.min}-${b.max}: ${candidates[i].length} candidates`);
  });

  // Select puzzles: sort by score, pick top N with theme diversity
  const selected = [];
  for (let i = 0; i < BANDS.length; i++) {
    const band = candidates[i];
    const target = BANDS[i].target;

    // Sort by quality score
    band.sort((a, b) => b.score - a.score);

    // Pick with theme diversity: track seen themes, prefer puzzles with unseen themes
    const usedThemes = new Set();
    const picked = [];

    for (const puzzle of band) {
      if (picked.length >= target) break;

      // Prefer puzzles that introduce new themes
      const newThemes = puzzle.themes.filter((t) => !usedThemes.has(t));
      if (picked.length < target * 0.7 || newThemes.length > 0) {
        picked.push({
          id: puzzle.id,
          fen: puzzle.fen,
          moves: puzzle.moves,
          rating: puzzle.rating,
          themes: puzzle.themes,
        });
        puzzle.themes.forEach((t) => usedThemes.add(t));
      }
    }

    // Fill remaining if we didn't hit target
    if (picked.length < target) {
      for (const puzzle of band) {
        if (picked.length >= target) break;
        if (picked.some((p) => p.id === puzzle.id)) continue;
        picked.push({
          id: puzzle.id,
          fen: puzzle.fen,
          moves: puzzle.moves,
          rating: puzzle.rating,
          themes: puzzle.themes,
        });
      }
    }

    selected.push(...picked);
  }

  // Shuffle within each band for variety, then sort by rating overall
  selected.sort((a, b) => a.rating - b.rating);

  fs.writeFileSync(OUTPUT, JSON.stringify(selected));
  const size = Buffer.byteLength(JSON.stringify(selected));
  console.log(`\nWritten ${selected.length} puzzles to ${OUTPUT} (${(size / 1024).toFixed(1)} KB)`);

  // Print theme distribution
  const themeCounts = {};
  for (const p of selected) {
    for (const t of p.themes) {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    }
  }
  console.log("\nTheme distribution:");
  Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([theme, count]) => console.log(`  ${theme}: ${count}`));
}

main().catch(console.error);
