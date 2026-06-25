import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Schema for an A1-level German reading exercise
export const readingExerciseSchema = {
  type: "object",
  properties: {
    story: {
      type: "object",
      properties: {
        title: { type: "string" },
        germanText: { type: "string" },
        englishTranslation: { type: "string" },
        level: { type: "string" },
      },
      required: ["title", "germanText", "englishTranslation", "level"],
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
          },
          correctAnswer: { type: "number" },
          explanation: { type: "string" },
        },
        required: ["id", "question", "options", "correctAnswer", "explanation"],
      },
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          german: { type: "string" },
          english: { type: "string" },
          partOfSpeech: { type: "string" },
        },
        required: ["german", "english", "partOfSpeech"],
      },
    },
  },
  required: ["story", "questions", "vocabulary"],
};
