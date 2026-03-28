/**
 * Generates opening-tree.json from a comprehensive ECO dataset.
 *
 * Sources the data from the lichess chess-openings TSV files (public domain).
 * Falls back to building from our existing openings.ts data.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUTPUT = path.join(__dirname, "..", "public", "opening-tree.json");

// Lichess opening TSV files (public domain, CC0)
const LICHESS_URLS = [
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master/a.tsv",
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master/b.tsv",
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master/c.tsv",
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master/d.tsv",
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master/e.tsv",
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "ChessArena/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function insertLine(root, moves, eco, name) {
  let node = root;
  for (let i = 0; i < moves.length; i++) {
    const san = moves[i];
    if (!node.children) node.children = {};
    if (!node.children[san]) node.children[san] = {};
    node = node.children[san];
  }
  // Set the opening info at the terminal node
  node.eco = eco;
  node.name = name;
}

function countNodes(node) {
  let count = 1;
  if (node.children) {
    for (const child of Object.values(node.children)) {
      count += countNodes(child);
    }
  }
  return count;
}

function countNamedNodes(node) {
  let count = node.name ? 1 : 0;
  if (node.children) {
    for (const child of Object.values(node.children)) {
      count += countNamedNodes(child);
    }
  }
  return count;
}

async function main() {
  const root = {};
  let totalLines = 0;

  // Try to fetch Lichess opening data
  console.log("Fetching Lichess opening database...");

  for (const url of LICHESS_URLS) {
    try {
      const tsv = await fetch(url);
      const lines = tsv.trim().split("\n");
      // TSV format: eco\tname\tpgn
      // First line is header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split("\t");
        if (parts.length < 3) continue;
        const [eco, name, pgn] = parts;

        // Parse PGN into SAN moves
        const moves = pgn
          .replace(/\d+\.\s*/g, " ")  // strip move numbers
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        if (moves.length > 0) {
          insertLine(root, moves, eco.trim(), name.trim());
          totalLines++;
        }
      }
      const letter = url.split("/").pop().replace(".tsv", "").toUpperCase();
      console.log(`  ${letter}: loaded`);
    } catch (err) {
      console.error(`  Failed to fetch ${url}: ${err.message}`);
    }
  }

  if (totalLines === 0) {
    console.error("No openings loaded! Check network connectivity.");
    process.exit(1);
  }

  const json = JSON.stringify(root);
  fs.writeFileSync(OUTPUT, json);

  const nodes = countNodes(root);
  const named = countNamedNodes(root);
  const size = Buffer.byteLength(json);

  console.log(`\nGenerated opening tree:`);
  console.log(`  ${totalLines} opening lines`);
  console.log(`  ${nodes} total nodes`);
  console.log(`  ${named} named positions`);
  console.log(`  ${(size / 1024).toFixed(1)} KB`);
  console.log(`  Written to ${OUTPUT}`);
}

main().catch(console.error);
