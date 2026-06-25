import { Router } from "express";
import { ai } from "../services/geminiService";
import db from "../db/database";
const router = Router();
const SYSTEM_INSTRUCTION = `You are an expert German language tutor specializing in A1-level proficiency. Your task is to test the user on their vocabulary words using the format they provided:
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
function getRandomWords(difficulty, count) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT german, english, article, part_of_speech, example_sentence
       FROM words WHERE difficulty = ? ORDER BY RANDOM() LIMIT ?`, [difficulty, count], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
function formatWordList(words) {
    return words
        .map((w) => {
        const article = w.article ?? "—";
        const example = w.example_sentence ?? "";
        return `${w.german} | ${w.english} | ${article} | ${w.part_of_speech} | ${example}`;
    })
        .join("\n");
}
// POST /api/vocabulary/chat
router.post("/chat", async (req, res) => {
    try {
        const { messages, difficulty = "A1", count = 10 } = req.body;
        // On first turn, load words from DB. On subsequent turns, use the snapshot
        // the frontend sends back so we stay consistent across the session.
        let vocabularyList = req.body.wordListSnapshot ?? "";
        if (!vocabularyList) {
            const words = await getRandomWords(difficulty, count);
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
        let rawText;
        let lastError = null;
        for (const model of MODELS) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents,
                    config: { systemInstruction: SYSTEM_INSTRUCTION },
                });
                rawText = response.text;
                break;
            }
            catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                // Only fall through on 503 / overload; re-throw everything else
                if (!lastError.message.includes("503"))
                    throw lastError;
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return res.status(500).json({ success: false, error: message });
    }
});
export default router;
