export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

export const LENGTHS = ["short", "medium", "long"] as const;
export type TextLength = (typeof LENGTHS)[number];

export const WORD_COUNTS = [3, 5, 8] as const;
export type WordCount = (typeof WORD_COUNTS)[number];

export const LENGTH_LABELS: Record<TextLength, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};
