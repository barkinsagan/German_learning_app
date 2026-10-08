import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "words.db");
const WORDS_DIR = path.join(process.cwd(), "data", "words");
const VALID_DIFFICULTIES = ["A1", "A2", "B1", "B2", "C1", "C2"];

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database at", DB_PATH);
});

function seedFromFile(difficulty: string, filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    const stmt = db.prepare(
      "INSERT INTO words (german, english, article, part_of_speech, difficulty, example_sentence) VALUES (?, ?, ?, ?, ?, ?)"
    );

    let inserted = 0;
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length !== 5) continue;
      const [german, english, article, partOfSpeech, exampleSentence] = parts;
      if (!german || !english || !partOfSpeech) continue;
      stmt.run(german, english, article || null, partOfSpeech, difficulty, exampleSentence || null);
      inserted++;
    }

    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve(inserted);
    });
  });
}

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

  db.run(`
    CREATE TABLE IF NOT EXISTS familiarity (
      word_id  INTEGER NOT NULL,
      profile  TEXT NOT NULL,
      level    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (word_id, profile),
      FOREIGN KEY (word_id) REFERENCES words(id)
    )
  `);

  // Auto-seed if words table is empty
  db.get("SELECT COUNT(*) as count FROM words", async (err, row: { count: number }) => {
    if (err || row.count > 0) return;
    console.log("Words table empty — seeding from data/words/...");
    for (const diff of VALID_DIFFICULTIES) {
      const filePath = path.join(WORDS_DIR, `${diff.toLowerCase()}.txt`);
      if (!fs.existsSync(filePath)) continue;
      try {
        const n = await seedFromFile(diff, filePath);
        console.log(`Seeded ${n} words for ${diff}`);
      } catch (e) {
        console.error(`Failed to seed ${diff}:`, e);
      }
    }
  });
});

export default db;
