import { Router, Request, Response } from "express";
import { ai, readingExerciseSchema } from "../services/geminiService";

const router = Router();

const LEVEL_GUIDANCE: Record<string, string> = {
  A1: "present tense only, basic vocabulary (under 500 words), very short simple sentences, topics: greetings, family, food, daily routines, numbers, colors",
  A2: "present and simple past tense, ~1000 word vocabulary, short sentences with basic conjunctions, topics: shopping, travel, work, hobbies, weather",
  B1: "all common tenses, ~2000 word vocabulary, compound sentences with subordinate clauses, topics: culture, environment, health, current events",
  B2: "all tenses including Konjunktiv II, rich vocabulary, complex sentence structures, abstract topics: politics, economics, philosophy, social issues",
};

const LENGTH_SENTENCES: Record<string, string> = {
  short: "2–3 sentences",
  medium: "5–7 sentences",
  long: "9–12 sentences",
};

// GET /api/exercises/generate?level=A1&length=medium&words=5
router.get("/generate", async (req: Request, res: Response) => {
  const level =
    typeof req.query.level === "string" ? req.query.level.toUpperCase() : "A1";
  const length =
    typeof req.query.length === "string" ? req.query.length.toLowerCase() : "medium";
  const words =
    typeof req.query.words === "string" ? parseInt(req.query.words, 10) : 5;

  const guidance = LEVEL_GUIDANCE[level] ?? LEVEL_GUIDANCE["A1"];
  const sentenceRange = LENGTH_SENTENCES[length] ?? LENGTH_SENTENCES["medium"];
  const wordCount = [3, 5, 8].includes(words) ? words : 5;

  const prompt = `You are an expert German language tutor creating reading comprehension exercises.

Generate a CEFR ${level} German reading exercise following these rules:

STORY:
1. Write a story of exactly ${sentenceRange} set in a specific, concrete situation in Germany (pick a real-feeling place, character name, and action — avoid generic descriptions).
2. Language must strictly match ${level}: ${guidance}.
3. Every sentence must be grammatically correct and culturally authentic.
4. Do not exceed ${sentenceRange} — length is important for the learner's level.

COMPREHENSION QUESTIONS:
5. Write exactly 3 multiple-choice questions (4 options each, 0-indexed correct answer).
6. Distractors must be plausible — wrong but believable based on the text. Never use obviously silly or unrelated wrong answers.
7. Cover different comprehension skills: at least one factual recall, one inference, and one vocabulary-in-context question.
8. The explanation field must quote the exact phrase from the text that proves the correct answer.

VOCABULARY:
9. Include exactly ${wordCount} vocabulary words drawn directly from the text.
10. Prioritize the most useful words for ${level} learners: choose nouns, verbs, and adjectives over particles or articles.
11. Each partOfSpeech must be accurate (use: "noun", "verb", "adjective", "adverb", "preposition").`;

  try {
    const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let rawText: string | null | undefined;
    let lastError: Error | null = null;

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: readingExerciseSchema,
          },
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

    return res.json({ success: true, data: JSON.parse(rawText) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
