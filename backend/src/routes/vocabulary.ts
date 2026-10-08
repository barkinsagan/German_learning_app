import { Router, Request, Response } from "express";
import { ai } from "../services/geminiService";
import db from "../db/database";

const router = Router();

function getSystemInstruction(difficulty: string): string {
  return `You are an expert German language tutor specializing in CEFR ${difficulty}-level German proficiency. Your task is to test the user on their vocabulary words using the format they provided:
[german | english | article | part_of_speech | example_sentence]

Follow these rules for the practice session:
1. Provide ONE vocabulary word at a time from the user's list.
2. To help the user build their original sentence, provide 3–4 extra simple "building block" words (e.g., common verbs, pronouns, or prepositions like "gehen", "mit", "heute", "mein") that would fit well in a sentence with the main vocabulary word.
3. Ask the user to:
   a) Translate the main word into English (including the correct German article if it's a noun).
   b) Write an original German practice sentence using the main word (they can use the building block words you provided, or choose their own).
4. Wait for the user's response before moving on.
5. Provide immediate, constructive feedback. Correct any grammatical errors in their sentence gently (paying special attention to word order, verb conjugation, and noun cases), and give a brief, clear explanation of the correction.
6. Once the correction is done, provide the next word with its building blocks. Keep the tone encouraging, supportive, and engaging.

Start by greeting the user and presenting the first practice word along with its building block words.`;
}

interface DbWord {
  id: number;
  german: string;
  english: string;
  article: string | null;
  part_of_speech: string;
  example_sentence: string | null;
  familiarity: number;
}

function getRandomWords(difficulty: string, count: number, profile: string): Promise<DbWord[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT w.id, w.german, w.english, w.article, w.part_of_speech, w.example_sentence,
              COALESCE(f.level, 0) AS familiarity
       FROM words w
       LEFT JOIN familiarity f ON f.word_id = w.id AND f.profile = ?
       WHERE w.difficulty = ? ORDER BY RANDOM() LIMIT ?`,
      [profile, difficulty, count],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as DbWord[]);
      }
    );
  });
}

function formatWordList(words: DbWord[]): string {
  return words
    .map((w) => {
      const article = w.article ?? "—";
      const example = w.example_sentence ?? "";
      return `${w.german} | ${w.english} | ${article} | ${w.part_of_speech} | ${example}`;
    })
    .join("\n");
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// GET /api/vocabulary/words?level=A1&count=20&profile=Barkin
router.get("/words", async (req: Request, res: Response) => {
  const level =
    typeof req.query.level === "string" ? req.query.level.toUpperCase() : "A1";
  const count =
    typeof req.query.count === "string"
      ? Math.min(50, Math.max(1, parseInt(req.query.count, 10)))
      : 20;
  const profile =
    typeof req.query.profile === "string" ? req.query.profile : "default";

  try {
    const words = await getRandomWords(level, count, profile);
    if (words.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: `No words found for level: ${level}` });
    }
    const data = words.map((w) => ({
      id: w.id,
      german: w.german,
      english: w.english,
      partOfSpeech: w.part_of_speech,
      article: w.article,
      exampleSentence: w.example_sentence,
      familiarity: w.familiarity,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Database error" });
  }
});

// PATCH /api/vocabulary/familiarity
router.patch("/familiarity", async (req: Request, res: Response) => {
  const { wordId, profile, delta } = req.body as {
    wordId: number;
    profile: string;
    delta: 1 | -1;
  };

  if (!wordId || !profile || (delta !== 1 && delta !== -1)) {
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO familiarity (word_id, profile, level) VALUES (?, ?, MAX(0, ?))
         ON CONFLICT(word_id, profile) DO UPDATE SET level = MAX(0, level + ?)`,
        [wordId, profile, delta === 1 ? 1 : 0, delta],
        (err) => (err ? reject(err) : resolve())
      );
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Database error" });
  }
});

// POST /api/vocabulary/chat
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages, difficulty = "A1", count = 10 } = req.body as {
      messages: ChatMessage[];
      difficulty?: string;
      count?: number;
      wordListSnapshot?: string;
    };

    let vocabularyList: string = req.body.wordListSnapshot ?? "";

    if (!vocabularyList) {
      const words = await getRandomWords(difficulty, count, "default");
      if (words.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: `No words found for difficulty: ${difficulty}` });
      }
      vocabularyList = formatWordList(words);
    }

    const isFirstTurn = !messages || messages.length === 0;

    const contents = isFirstTurn
      ? [
          {
            role: "user",
            parts: [
              {
                text: `Here is my vocabulary list:\n\n${vocabularyList}\n\nPlease start the session.`,
              },
            ],
          },
        ]
      : [
          {
            role: "user",
            parts: [
              {
                text: `Here is my vocabulary list:\n\n${vocabularyList}\n\nPlease start the session.`,
              },
            ],
          },
          ...messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        ];

    const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let rawText: string | null | undefined;
    let lastError: Error | null = null;

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: getSystemInstruction(difficulty) },
        });
        rawText = response.text;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (!lastError.message.includes("503")) throw lastError;
      }
    }

    if (!rawText) {
      const msg = lastError?.message ?? "No content returned from Gemini";
      return res.status(503).json({ success: false, error: msg });
    }

    return res.json({
      success: true,
      data: { reply: rawText, wordListSnapshot: vocabularyList },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
