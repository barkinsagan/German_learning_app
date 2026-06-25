import sqlite3 from "sqlite3";
import path from "path";
const DB_PATH = path.join(process.cwd(), "data", "words.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Failed to connect to database:", err.message);
        process.exit(1);
    }
    console.log("Connected to SQLite database at", DB_PATH);
});
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS words (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      german      TEXT NOT NULL,
      english     TEXT NOT NULL,
      article     TEXT,
      part_of_speech TEXT NOT NULL,
      difficulty        TEXT NOT NULL CHECK(difficulty IN ('A1','A2','B1','B2','C1','C2')),
      example_sentence  TEXT
    )
  `);
});
export default db;
