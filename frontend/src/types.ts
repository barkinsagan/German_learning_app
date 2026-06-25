export type Section = "reading" | "writing" | "listening" | "speaking" | "vocabulary" | "flashcards";

export interface Story {
  title: string;
  germanText: string;
  englishTranslation: string;
  level: string;
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
}

export interface VocabWord {
  german: string;
  english: string;
  partOfSpeech: string;
}

export interface ReadingExercise {
  story: Story;
  questions: Question[];
  vocabulary: VocabWord[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface BookmarkedWord {
  german: string;
  english: string;
  partOfSpeech: string;
}

export interface FlashCard {
  german: string;
  english: string;
  partOfSpeech: string;
  article?: string | null;
  exampleSentence?: string | null;
}

export interface WritingPrompt {
  task: string;
  context: string;
  vocabularyHints: string[];
}

export interface WritingError {
  original: string;
  corrected: string;
  explanation: string;
  type: "grammar" | "spelling" | "word-order" | "vocabulary" | "case";
}

export interface WritingFeedback {
  correctedText: string;
  errors: WritingError[];
  overallFeedback: string;
  grade: "A" | "B" | "C" | "D";
  strengths: string;
}
