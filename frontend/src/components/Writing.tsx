import { useState } from "react";
import { WritingPrompt, WritingFeedback, ApiResponse } from "../types";
import { API_BASE } from "../config";
import { LEVELS, Level } from "../exerciseConfig";
import { useSessionStorage } from "../hooks/useSessionStorage";

const TYPES = ["sentence", "paragraph"] as const;
type ExerciseType = (typeof TYPES)[number];

const TYPE_META: Record<ExerciseType, { label: string; hint: string }> = {
  sentence: { label: "Sentences", hint: "2–3 sentences" },
  paragraph: { label: "Paragraph", hint: "5–8 sentences" },
};

const GRADE_STYLES: Record<string, string> = {
  A: "text-success border-success/30 bg-success/10",
  B: "text-accent border-accent/30 bg-accent-muted",
  C: "text-warning border-warning/30 bg-warning/10",
  D: "text-error border-error/30 bg-error/10",
};

interface WritingSession {
  level: Level;
  exerciseType: ExerciseType;
  prompt: WritingPrompt | null;
  userText: string;
  feedback: WritingFeedback | null;
}

const DEFAULT: WritingSession = {
  level: "A1",
  exerciseType: "sentence",
  prompt: null,
  userText: "",
  feedback: null,
};

type Phase = "idle" | "loading-prompt" | "writing" | "loading-feedback" | "feedback";

function derivePhase(s: WritingSession): Phase {
  if (s.feedback) return "feedback";
  if (s.prompt) return "writing";
  return "idle";
}

export function Writing() {
  const [session, setSession, clearSession] = useSessionStorage<WritingSession>(
    "writing_session",
    DEFAULT
  );
  const [phase, setPhase] = useState<Phase>(() => derivePhase(session));
  const [error, setError] = useState<string | null>(null);

  const { level, exerciseType, prompt, userText, feedback } = session;

  function patch<K extends keyof WritingSession>(key: K, val: WritingSession[K]) {
    setSession((s) => ({ ...s, [key]: val }));
  }

  async function generatePrompt() {
    setPhase("loading-prompt");
    setError(null);
    setSession((s) => ({ ...s, prompt: null, userText: "", feedback: null }));
    try {
      const res = await fetch(
        `${API_BASE}/api/writing/prompt?level=${level}&type=${exerciseType}`
      );
      const json: ApiResponse<WritingPrompt> = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setSession((s) => ({ ...s, prompt: json.data }));
      setPhase("writing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }

  async function submitWriting() {
    if (!userText.trim() || !prompt) return;
    setPhase("loading-feedback");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/writing/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, task: prompt.task, userText }),
      });
      const json: ApiResponse<WritingFeedback> = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setSession((s) => ({ ...s, feedback: json.data }));
      setPhase("feedback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("writing");
    }
  }

  function reset() {
    clearSession();
    setPhase("idle");
    setError(null);
  }

  const wordCount = userText.trim().split(/\s+/).filter(Boolean).length;

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Schreiben — Writing
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Get a writing prompt, compose your German response, and receive instant AI feedback.
          </p>
        </div>

        <div className="card space-y-5">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Level
            </p>
            <div className="flex gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => patch("level", l)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    level === l
                      ? "bg-accent-muted text-accent border-accent/30"
                      : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5" />

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Format
            </p>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => patch("exerciseType", t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    exerciseType === t
                      ? "bg-accent-muted text-accent border-accent/30"
                      : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
                  }`}
                >
                  {TYPE_META[t].label}
                  <span className="ml-1.5 text-xs font-normal opacity-60">
                    {TYPE_META[t].hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-error/20 bg-error/5 text-error text-sm py-3 px-4">
              {error}
            </div>
          )}

          <button className="btn-primary w-full py-3" onClick={generatePrompt}>
            Get Writing Prompt
          </button>
        </div>

        <div className="card border-dashed border-white/10 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            How it works
          </p>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">1.</span>
              Gemini generates a concrete writing task at your CEFR level.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">2.</span>
              Write your German response — vocabulary hints are provided to help.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">3.</span>
              Get a corrected version, per-error explanations, and a grade.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // ── LOADING PROMPT ────────────────────────────────────────────────────────
  if (phase === "loading-prompt") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Schreiben — Writing
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Generating your {level} writing prompt…
          </p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16 space-y-4">
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-text-muted text-sm">Asking Gemini for a prompt…</p>
        </div>
      </div>
    );
  }

  // ── WRITING ───────────────────────────────────────────────────────────────
  if (phase === "writing" && prompt) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Schreiben — Writing
            </h1>
            <p className="text-text-secondary mt-1 text-sm">
              Read the prompt, then write your German response below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-accent-muted text-accent border border-accent/20">
              {level} Level
            </span>
            <button className="btn-ghost text-xs py-1.5" onClick={reset}>
              New Prompt
            </button>
          </div>
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Your Task
          </p>
          <p className="text-text-primary font-medium">{prompt.task}</p>
          <p className="text-text-secondary text-sm italic border-l-2 border-accent/40 pl-3">
            {prompt.context}
          </p>
          {prompt.vocabularyHints.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-text-muted mb-2">Vocabulary hints:</p>
              <div className="flex flex-wrap gap-2">
                {prompt.vocabularyHints.map((hint) => (
                  <span
                    key={hint}
                    className="font-mono text-xs bg-background/60 border border-white/10 text-accent rounded px-2 py-1"
                  >
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Your Response
          </p>
          <textarea
            className="w-full bg-background/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-text-primary resize-none focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-muted font-mono leading-relaxed"
            rows={6}
            placeholder="Schreib hier auf Deutsch…"
            value={userText}
            onChange={(e) => patch("userText", e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-error/20 bg-error/5 text-error text-sm py-3 px-4">
              {error}
            </div>
          )}

          <button
            className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!userText.trim()}
            onClick={submitWriting}
          >
            Submit for Feedback
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING FEEDBACK ──────────────────────────────────────────────────────
  if (phase === "loading-feedback") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Schreiben — Writing
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Evaluating your German…</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16 space-y-4">
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-text-muted text-sm">
            Checking grammar, word order, and vocabulary…
          </p>
        </div>
      </div>
    );
  }

  // ── FEEDBACK ──────────────────────────────────────────────────────────────
  const fb = feedback!;
  const gradeStyle = GRADE_STYLES[fb.grade] ?? GRADE_STYLES["B"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Schreiben — Writing
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Here's your feedback.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-accent-muted text-accent border border-accent/20">
            {level} Level
          </span>
          <button className="btn-ghost text-xs py-1.5" onClick={reset}>
            New Prompt
          </button>
        </div>
      </div>

      <div className="card animate-slide-up">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold shrink-0 ${gradeStyle}`}
          >
            {fb.grade}
          </div>
          <div className="min-w-0">
            <p className="text-text-primary font-semibold">{fb.strengths}</p>
            <p className="text-text-secondary text-sm mt-1">{fb.overallFeedback}</p>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Your Submission
        </p>
        <p className="text-text-secondary leading-relaxed text-sm font-mono bg-background/50 rounded-lg px-4 py-3 border border-white/5 whitespace-pre-wrap">
          {userText}
        </p>
      </div>

      {fb.errors.length > 0 && (
        <div className="card space-y-3 border-success/10">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Corrected Version
          </p>
          <p className="text-text-primary leading-relaxed text-sm font-mono bg-success/5 rounded-lg px-4 py-3 border border-success/10 whitespace-pre-wrap">
            {fb.correctedText}
          </p>
        </div>
      )}

      {fb.errors.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-text-primary">
            Corrections ({fb.errors.length})
          </h3>
          {fb.errors.map((err, i) => (
            <div key={i} className="card space-y-2 animate-slide-up">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-error line-through opacity-70">
                  {err.original}
                </span>
                <span className="text-text-muted text-xs">→</span>
                <span className="font-mono text-sm text-success">{err.corrected}</span>
                <span className="ml-auto badge bg-surface-raised text-text-muted border border-white/10 text-xs capitalize shrink-0">
                  {err.type}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{err.explanation}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-success/20 bg-success/5 text-center py-6 animate-slide-up">
          <p className="text-success font-semibold">Perfekt! Keine Fehler.</p>
          <p className="text-text-secondary text-sm mt-1">
            Your German is spot on for this exercise.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="btn-ghost flex-1"
          onClick={() => {
            setSession((s) => ({ ...s, feedback: null }));
            setError(null);
            setPhase("writing");
          }}
        >
          Edit &amp; Resubmit
        </button>
        <button className="btn-primary flex-1" onClick={generatePrompt}>
          New Prompt
        </button>
      </div>
    </div>
  );
}
