import { Router, Request, Response } from "express";
import { ai } from "../services/geminiService";

const router = Router();

const LEVEL_GUIDANCE: Record<string, string> = {
  A1: "present tense only, very simple vocabulary (under 500 words), topics: greetings, family, food, daily routines",
  A2: "present and simple past tense, basic conjunctions, ~1000 word vocabulary, topics: shopping, travel, hobbies, weather",
  B1: "all common tenses, compound sentences with subordinate clauses, ~2000 word vocabulary, topics: culture, health, current events",
  B2: "all tenses including Konjunktiv II, complex sentence structures, rich vocabulary, abstract topics: politics, society, opinions",
};

const TYPE_SENTENCE_COUNT: Record<string, string> = {
  sentence: "2–3 sentences",
  paragraph: "5–8 sentences",
};

const promptSchema = {
  type: "object",
  properties: {
    task: { type: "string" },
    context: { type: "string" },
    vocabularyHints: { type: "array", items: { type: "string" } },
  },
  required: ["task", "context", "vocabularyHints"],
};

const feedbackSchema = {
  type: "object",
  properties: {
    correctedText: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          corrected: { type: "string" },
          explanation: { type: "string" },
          type: { type: "string" },
        },
        required: ["original", "corrected", "explanation", "type"],
      },
    },
    overallFeedback: { type: "string" },
    grade: { type: "string" },
    strengths: { type: "string" },
  },
  required: ["correctedText", "errors", "overallFeedback", "grade", "strengths"],
};

async function callGemini(prompt: string, schema: object): Promise<string> {
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema },
      });
      if (response.text) return response.text;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (!lastError.message.includes("503")) throw lastError;
    }
  }

  throw lastError ?? new Error("No content returned from Gemini");
}

// GET /api/writing/prompt?level=A1&type=sentence
router.get("/prompt", async (req: Request, res: Response) => {
  const level =
    typeof req.query.level === "string" ? req.query.level.toUpperCase() : "A1";
  const type =
    typeof req.query.type === "string" ? req.query.type : "sentence";

  const guidance = LEVEL_GUIDANCE[level] ?? LEVEL_GUIDANCE["A1"];
  const sentenceCount = TYPE_SENTENCE_COUNT[type] ?? TYPE_SENTENCE_COUNT["sentence"];

  const prompt = `You are a German language teacher creating a writing exercise for a CEFR ${level} student.

Generate a writing prompt with these requirements:
1. The "task" field: a clear English instruction asking the student to write ${sentenceCount} in German. Be specific (e.g., "Write 2–3 sentences describing what you did yesterday morning" not just "Write about your day").
2. The "context" field: a single sentence in English giving a concrete starting scenario or situation to help the student get going.
3. The "vocabularyHints" field: exactly 4 useful German words or short phrases (with English translation in parentheses) that would fit naturally in the response. Format each hint as "deutschesWort (english meaning)".
4. The task must be appropriate for CEFR ${level}: ${guidance}.
5. Choose everyday, relatable topics a learner would actually care about.`;

  try {
    const rawText = await callGemini(prompt, promptSchema);
    return res.json({ success: true, data: JSON.parse(rawText) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/writing/evaluate
// Body: { level: string, task: string, userText: string }
router.post("/evaluate", async (req: Request, res: Response) => {
  const { level, task, userText } = req.body as {
    level?: string;
    task?: string;
    userText?: string;
  };

  if (!userText?.trim()) {
    return res.status(400).json({ success: false, error: "userText is required" });
  }

  const safeLevel = (level ?? "A1").toUpperCase();

  const prompt = `You are a German language teacher evaluating a CEFR ${safeLevel} student's writing.

Task the student was given: "${task ?? ""}"

Student's submission:
"${userText}"

Evaluate the writing and return structured feedback:
1. "correctedText": The full corrected version of the student's text. If it's already perfect, repeat it unchanged.
2. "errors": List every specific mistake. For each error:
   - "original": the exact incorrect phrase or word from the submission
   - "corrected": the correct replacement
   - "explanation": a concise English explanation of the grammar rule or fix
   - "type": one of "grammar", "spelling", "word-order", "vocabulary", "case"
   If there are no errors, return an empty array.
3. "strengths": One specific sentence praising something the student did well (not generic like "good effort").
4. "overallFeedback": 2–3 sentences of constructive feedback appropriate for a ${safeLevel} learner.
5. "grade": A single letter — "A" (excellent, at most 1 minor error), "B" (good, 2–3 minor errors), "C" (needs work, several errors), "D" (significant errors or wrong language used).

If the student wrote in English instead of German, grade it "D" and explain why in overallFeedback.`;

  try {
    const rawText = await callGemini(prompt, feedbackSchema);
    return res.json({ success: true, data: JSON.parse(rawText) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
