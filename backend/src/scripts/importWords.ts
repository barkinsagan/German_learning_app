import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";

const VALID_DIFFICULTIES = ["A1", "A2", "B1", "B2", "C1", "C2"];
const WORDS_DIR = path.join(process.cwd(), "data", "words");
const DB_PATH = path.join(process.cwd(), "data", "words.db");

const filename = process.argv[2];

if (!filename) {
  console.error("Usage: tsx src/scripts/importWords.ts <filename>  (e.g. a1.txt)");
  process.exit(1);
}

const difficulty = path.basename(filename, ".txt").toUpperCase();

if (!VALID_DIFFICULTIES.includes(difficulty)) {
  console.error(`Filename must be one of: ${VALID_DIFFICULTIES.map((d) => d.toLowerCase() + ".txt").join(", ")}`);
  process.exit(1);
}

const filePath = path.join(WORDS_DIR, filename);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const lines = fs
  .readFileSync(filePath, "utf-8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS words (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      german           TEXT NOT NULL,
      english          TEXT NOT NULL,
      article          TEXT,
      part_of_speech   TEXT NOT NULL,
      difficulty       TEXT NOT NULL CHECK(difficulty IN ('A1','A2','B1','B2','C1','C2')),
      example_sentence TEXT
    )
  `);

  const stmt = db.prepare(
    "INSERT INTO words (german, english, article, part_of_speech, difficulty, example_sentence) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let inserted = 0;
  let skipped = 0;

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());

    if (parts.length !== 5) {
      console.warn(`Skipping malformed line: "${line}"`);
      skipped++;
      continue;
    }

    const [german, english, article, partOfSpeech, exampleSentence] = parts;

    if (!german || !english || !partOfSpeech) {
      console.warn(`Skipping incomplete line: "${line}"`);
      skipped++;
      continue;
    }

    stmt.run(german, english, article || null, partOfSpeech, difficulty, exampleSentence || null);
    inserted++;
  }

  stmt.finalize(() => {
    db.close();
    console.log(`Done — inserted ${inserted} words, skipped ${skipped} (difficulty: ${difficulty})`);
  });
});
