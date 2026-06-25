import { Router } from "express";
import { ai, readingExerciseSchema } from "../services/geminiService";
const router = Router();
const LEVEL_GUIDANCE = {
    A1: "present tense only, very short simple sentences, basic vocabulary (under 500 words), topics: greetings, family, food, daily routines. Speech should be slow and clear.",
    A2: "present and simple past tense, ~1000 word vocabulary, short sentences, familiar topics: shopping, travel, work, hobbies. Measured natural pace.",
    B1: "all common tenses, ~2000 word vocabulary, compound sentences, broader topics: culture, environment, health. Natural conversational pace.",
    B2: "all tenses including Konjunktiv II, rich vocabulary, complex sentences, abstract topics: politics, society, current events. Native-like pace.",
};
const LENGTH_SENTENCES = {
    short: "2–3 sentences",
    medium: "4–6 sentences",
    long: "7–9 sentences",
};
// GET /api/listening/generate?level=A1&length=medium&words=5
router.get("/generate", async (req, res) => {
    const level = typeof req.query.level === "string" ? req.query.level.toUpperCase() : "A1";
    const length = typeof req.query.length === "string" ? req.query.length.toLowerCase() : "medium";
    const words = typeof req.query.words === "string" ? parseInt(req.query.words, 10) : 5;
    const guidance = LEVEL_GUIDANCE[level] ?? LEVEL_GUIDANCE["A1"];
    const sentenceRange = LENGTH_SENTENCES[length] ?? LENGTH_SENTENCES["medium"];
    const wordCount = [3, 5, 8].includes(words) ? words : 5;
    const prompt = `You are an expert German language tutor creating listening comprehension exercises.

Generate a CEFR ${level} German listening exercise following these rules:

AUDIO TEXT:
1. Write a natural-sounding monologue of exactly ${sentenceRange} about everyday life in Germany.
2. Language must strictly match ${level}: ${guidance}.
3. Write flowing prose only — no lists, bullet points, or text that only works visually. Every sentence must sound completely natural when spoken aloud.
4. Avoid parenthetical asides, punctuation-heavy sentences, and unusual word order that would create awkward pauses in speech.
5. Choose a specific, concrete scenario: a person describing their day, a short radio announcement, a voicemail message, a market vendor, etc.
6. Do not exceed ${sentenceRange} — audio length is critical for the learner's experience.

COMPREHENSION QUESTIONS:
7. Write exactly 3 multiple-choice questions (4 options each, 0-indexed correct answer).
8. Questions must test real listening skills: what someone said, when/where/how something happened, or what a word meant in context.
9. Distractors must be plausible from a listener's perspective — wrong but believable (e.g., similar details, easily confused times or names).
10. The explanation field must quote the exact phrase from the text that proves the correct answer.

VOCABULARY:
11. Include exactly ${wordCount} vocabulary words that a listener needs to understand the passage.
12. Choose words that are central to the meaning, clearly spoken, and useful at ${level} level.
13. Each partOfSpeech must be accurate (use: "noun", "verb", "adjective", "adverb", "preposition").`;
    try {
        const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        let rawText;
        let lastError = null;
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
            }
            catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                if (!lastError.message.includes("503"))
                    throw lastError;
            }
        }
        if (!rawText) {
            const msg = lastError?.message ?? "No content returned from Gemini";
            return res.status(503).json({ success: false, error: msg });
        }
        return res.json({ success: true, data: JSON.parse(rawText) });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return res.status(500).json({ success: false, error: message });
    }
});
// Wrap raw 24kHz 16-bit mono PCM in a WAV header so browsers can decode it
function pcmToWav(pcm) {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcm.length;
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(dataSize + 36, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcm]);
}
// POST /api/listening/tts
// Body: { text: string }
// Returns: audio/wav binary
router.post("/tts", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) {
            return res.status(400).json({ success: false, error: "text is required" });
        }
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: `Read the following German text aloud naturally and clearly:\n\n${text}`,
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Kore" },
                    },
                },
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const part = response.candidates?.[0]?.content?.parts?.[0];
        const b64 = part?.inlineData?.data;
        if (!b64) {
            return res
                .status(500)
                .json({ success: false, error: "No audio data returned from Gemini TTS" });
        }
        const wav = pcmToWav(Buffer.from(b64, "base64"));
        res.set("Content-Type", "audio/wav");
        res.set("Content-Length", String(wav.length));
        return res.send(wav);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return res.status(500).json({ success: false, error: message });
    }
});
export default router;
