import { useState } from "react";
import { ReadingExercise, ApiResponse } from "../types";
import { API_BASE } from "../config";
import { Level, TextLength, WordCount } from "../exerciseConfig";
import { QuestionCard } from "./QuestionCard";
import { ExerciseSettingsCard } from "./ExerciseSettingsCard";
import { useSessionStorage } from "../hooks/useSessionStorage";
import { useBookmarks } from "../hooks/useBookmarks";

type Phase = "idle" | "loading" | "active";

interface ReadingSession {
  level: Level;
  textLength: TextLength;
  wordCount: WordCount;
  exercise: ReadingExercise | null;
  answers: Record<number, number>;
  submitted: boolean;
  showTranslation: boolean;
}

const DEFAULT: ReadingSession = {
  level: "A1",
  textLength: "medium",
  wordCount: 5,
  exercise: null,
  answers: {},
  submitted: false,
  showTranslation: false,
};

export function Reading() {
  const [session, setSession, clearSession] = useSessionStorage<ReadingSession>(
    "reading_session",
    DEFAULT
  );
  const [phase, setPhase] = useState<Phase>(session.exercise ? "active" : "idle");
  const [error, setError] = useState<string | null>(null);
  const { toggle, isBookmarked } = useBookmarks();

  const { level, textLength, wordCount, exercise, answers, submitted, showTranslation } = session;

  function patch<K extends keyof ReadingSession>(key: K, val: ReadingSession[K]) {
    setSession((s) => ({ ...s, [key]: val }));
  }

  async function generateExercise() {
    setPhase("loading");
    setError(null);
    setSession((s) => ({
      ...s,
      exercise: null,
      answers: {},
      submitted: false,
      showTranslation: false,
    }));
    try {
      const res = await fetch(
        `${API_BASE}/api/exercises/generate?level=${level}&length=${textLength}&words=${wordCount}`
      );
      const json: ApiResponse<ReadingExercise> = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setSession((s) => ({ ...s, exercise: json.data }));
      setPhase("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }

  function startNew() {
    clearSession();
    setPhase("idle");
    setError(null);
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lesen — Reading</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Read an AI-generated German passage and answer comprehension questions.
          </p>
        </div>

        <ExerciseSettingsCard
          level={level}
          onLevelChange={(l) => patch("level", l)}
          textLength={textLength}
          onLengthChange={(l) => patch("textLength", l)}
          wordCount={wordCount}
          onWordCountChange={(n) => patch("wordCount", n)}
          lengthLabel="Text Length"
          error={error}
          onGenerate={generateExercise}
        />

        <div className="card border-dashed border-white/10 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            How it works
          </p>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">1.</span>
              Gemini generates a short German story at your chosen CEFR level.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">2.</span>
              Read the passage and answer 3 comprehension questions.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">3.</span>
              Review key vocabulary — bookmark words to practice in Flashcards.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lesen — Reading</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Generating your {level} exercise…
          </p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16 space-y-4">
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-text-muted text-sm">Asking Gemini to write your story…</p>
        </div>
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  const ex = exercise!;
  const score = submitted
    ? ex.questions.filter((q) => answers[q.id] === q.correctAnswer).length
    : 0;
  const allAnswered = ex.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lesen — Reading</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Read the passage carefully, then answer the comprehension questions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-accent-muted text-accent border border-accent/20">
            {ex.story.level} Level
          </span>
          <button className="btn-ghost text-xs py-1.5" onClick={startNew}>
            New Exercise
          </button>
        </div>
      </div>

      {/* Story */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{ex.story.title}</h2>
          <button
            onClick={() => patch("showTranslation", !showTranslation)}
            className="btn-ghost text-xs py-1.5"
          >
            {showTranslation ? "Hide" : "Show"} Translation
          </button>
        </div>
        <p className="text-text-primary leading-relaxed text-base font-mono bg-background/50 rounded-lg px-4 py-3 border border-white/5">
          {ex.story.germanText}
        </p>
        {showTranslation && (
          <p className="text-text-secondary leading-relaxed text-sm italic animate-slide-up border-l-2 border-accent pl-4">
            {ex.story.englishTranslation}
          </p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">
            Comprehension Questions
          </h3>
          <span className="text-xs text-text-muted">
            Focus a card, then press A / B / C / D
          </span>
        </div>
        {ex.questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            selected={answers[q.id]}
            submitted={submitted}
            onSelect={(idx) => {
              if (submitted) return;
              patch("answers", { ...answers, [q.id]: idx });
            }}
          />
        ))}
      </div>

      {/* Submit / Score */}
      {!submitted ? (
        <button
          className="btn-primary w-full py-3"
          disabled={!allAnswered}
          onClick={() => patch("submitted", true)}
        >
          Check Answers
        </button>
      ) : (
        <div
          className={`card flex items-center justify-between animate-slide-up ${
            score === ex.questions.length
              ? "border-success/20 bg-success/5"
              : "border-accent/20"
          }`}
        >
          <div>
            <p className="text-lg font-bold text-text-primary">
              {score}/{ex.questions.length} correct
            </p>
            <p className="text-text-secondary text-sm mt-0.5">
              {score === ex.questions.length
                ? "Ausgezeichnet! Perfect score!"
                : "Good effort — review the explanations below."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              onClick={() =>
                setSession((s) => ({
                  ...s,
                  answers: {},
                  submitted: false,
                  showTranslation: false,
                }))
              }
            >
              Try Again
            </button>
            <button className="btn-primary text-sm px-4 py-2" onClick={generateExercise}>
              New Exercise
            </button>
          </div>
        </div>
      )}

      {/* Vocabulary */}
      <div className="card space-y-3">
        <h3 className="text-base font-semibold text-text-primary">Key Vocabulary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ex.vocabulary.map((word) => {
            const bookmarked = isBookmarked(word.german);
            return (
              <div
                key={word.german}
                className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2.5 border border-white/5"
              >
                <div>
                  <span className="font-mono text-accent font-medium text-sm">
                    {word.german}
                  </span>
                  <span className="text-text-secondary text-xs ml-2">
                    ({word.partOfSpeech})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm">{word.english}</span>
                  <button
                    onClick={() =>
                      toggle({
                        german: word.german,
                        english: word.english,
                        partOfSpeech: word.partOfSpeech,
                      })
                    }
                    title={bookmarked ? "Remove bookmark" : "Save to Flashcards"}
                    className={`text-base leading-none transition-colors ${
                      bookmarked
                        ? "text-accent"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {bookmarked ? "★" : "☆"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
