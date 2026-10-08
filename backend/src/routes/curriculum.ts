import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { LEKTIONEN } from "../curriculum/lektionen";
import { ai, readingExerciseSchema } from "../services/geminiService";

const router = Router();

const DATA_DIR = path.join(process.cwd(), "data", "curriculum");

// GET /api/curriculum
router.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, data: LEKTIONEN });
});

// GET /api/curriculum/:id/lecture?lang=de|en
router.get("/:id/lecture", (req: Request, res: Response) => {
  const lektion = LEKTIONEN.find((l) => l.id === req.params.id);
  if (!lektion) return res.status(404).json({ success: false, error: "Lektion not found" });

  const lang = req.query.lang === "en" ? "en" : "de";
  const fileName = lang === "en" ? "lecture.en.md" : "lecture.md";
  const filePath = path.join(DATA_DIR, lektion.id, fileName);
  const fallbackPath = path.join(DATA_DIR, lektion.id, "lecture.md");

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    return res.json({ success: true, data: { content, authored: true, lang } });
  }

  // English requested but missing — fall back to German if available
  if (lang === "en" && fs.existsSync(fallbackPath)) {
    const content = fs.readFileSync(fallbackPath, "utf-8");
    return res.json({ success: true, data: { content, authored: true, lang: "de" } });
  }

  const placeholder = lang === "en"
    ? [
        `# Lesson ${lektion.number} — ${lektion.title}`,
        "",
        `**Vocabulary topics:** ${lektion.wortfelder.join(", ")}`,
        "",
        `**Grammar:** ${lektion.grammar.join(", ")}`,
        "",
        "---",
        "",
        "*This content hasn't been written yet.*",
        "",
        `Create the file \`data/curriculum/${lektion.id}/lecture.en.md\` to add learning material here.`,
      ].join("\n")
    : [
        `# Lektion ${lektion.number} — ${lektion.title}`,
        "",
        `**Wortfelder:** ${lektion.wortfelder.join(", ")}`,
        "",
        `**Grammatik:** ${lektion.grammar.join(", ")}`,
        "",
        "---",
        "",
        "*Dieser Inhalt wurde noch nicht verfasst.*",
        "",
        `Erstellen Sie die Datei \`data/curriculum/${lektion.id}/lecture.md\`, um hier Lernmaterial hinzuzufügen.`,
      ].join("\n");

  return res.json({ success: true, data: { content: placeholder, authored: false, lang } });
});

// GET /api/curriculum/:id/exercises
router.get("/:id/exercises", (req: Request, res: Response) => {
  const lektion = LEKTIONEN.find((l) => l.id === req.params.id);
  if (!lektion) return res.status(404).json({ success: false, error: "Lektion not found" });

  const filePath = path.join(DATA_DIR, lektion.id, "exercises.json");

  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return res.json({ success: true, data });
    } catch {
      return res.status(500).json({ success: false, error: "Invalid exercises file" });
    }
  }

  return res.json({ success: true, data: { lessonId: lektion.id, exercises: [] } });
});

// POST /api/curriculum/:id/practice
router.post("/:id/practice", async (req: Request, res: Response) => {
  const lektion = LEKTIONEN.find((l) => l.id === req.params.id);
  if (!lektion) return res.status(404).json({ success: false, error: "Lektion not found" });

  const prompt = `You are an expert German language tutor creating a focused practice reading exercise.

LESSON CONTEXT — stay strictly within these constraints:
- CEFR Level: ${lektion.level}
- Vocabulary topics (Wortfelder): ${lektion.wortfelder.join(", ")}
- Grammar targets for this lesson: ${lektion.grammar.join(", ")}

RULES:
1. Write a short story (4–6 sentences) that naturally practices the grammar targets above.
2. Vocabulary must come primarily from the Wortfelder listed — supplement only with very basic common words.
3. Do NOT use any grammar structure NOT listed (e.g., if Perfekt is not in grammar targets, do not use it).
4. Set it in a specific, concrete situation in Germany with a real-feeling character name.
5. Every sentence must be grammatically correct.

COMPREHENSION QUESTIONS:
6. Write exactly 3 multiple-choice questions (3 options each, 0-indexed correct answer).
7. At least one question should test the grammar target directly.
8. Each explanation must quote the exact phrase from the text that supports the answer.

VOCABULARY:
9. List exactly 5 key vocabulary words drawn directly from the story.
10. Prioritize nouns, verbs, and adjectives from the Wortfelder.`;

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
