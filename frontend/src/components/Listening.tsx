import { useState, useRef, useEffect } from "react";
import { ReadingExercise, ApiResponse } from "../types";
import { API_BASE } from "../config";
import { Level, TextLength, WordCount } from "../exerciseConfig";
import { QuestionCard } from "./QuestionCard";
import { ExerciseSettingsCard } from "./ExerciseSettingsCard";
import { useSessionStorage } from "../hooks/useSessionStorage";
import { useBookmarks } from "../hooks/useBookmarks";

type Phase = "idle" | "loading" | "active";
type LoadingStep = "text" | "audio";

const RATES = [0.75, 1, 1.25, 1.5] as const;

interface ListeningSession {
  level: Level;
  textLength: TextLength;
  wordCount: WordCount;
  exercise: ReadingExercise | null;
  answers: Record<number, number>;
  submitted: boolean;
  showTranscript: boolean;
  showTranslation: boolean;
}

const DEFAULT: ListeningSession = {
  level: "A1",
  textLength: "medium",
  wordCount: 5,
  exercise: null,
  answers: {},
  submitted: false,
  showTranscript: false,
  showTranslation: false,
};

export function Listening() {
  const [session, setSession, clearSession] = useSessionStorage<ListeningSession>(
    "listening_session",
    DEFAULT
  );
  // If we have a persisted exercise, go straight to loading (fetch audio only)
  const [phase, setPhase] = useState<Phase>(session.exercise ? "loading" : "idle");
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("audio");
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const { toggle, isBookmarked } = useBookmarks();
  const { level, textLength, wordCount, exercise, answers, submitted, showTranscript, showTranslation } = session;

  // On mount: if we have a persisted exercise, fetch its audio
  useEffect(() => {
    if (session.exercise) {
      fetchAudio(session.exercise.story.germanText);
    }
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function patch<K extends keyof ListeningSession>(key: K, val: ListeningSession[K]) {
    setSession((s) => ({ ...s, [key]: val }));
  }

  async function fetchAudio(text: string) {
    setLoadingStep("audio");
    try {
      const ttsRes = await fetch(`${API_BASE}/api/listening/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!ttsRes.ok) {
        const errJson = (await ttsRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error ?? "Failed to generate audio");
      }
      const blob = await ttsRes.blob();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPhase("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      clearSession();
      setPhase("idle");
    }
  }

  async function generateExercise() {
    setPhase("loading");
    setLoadingStep("text");
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
      setAudioUrl(null);
    }
    setSession((s) => ({
      ...s,
      exercise: null,
      answers: {},
      submitted: false,
      showTranscript: false,
      showTranslation: false,
    }));

    try {
      const exerciseRes = await fetch(
        `${API_BASE}/api/listening/generate?level=${level}&length=${textLength}&words=${wordCount}`
      );
      const exerciseJson: ApiResponse<ReadingExercise> = await exerciseRes.json();
      if (!exerciseJson.success)
        throw new Error(exerciseJson.error ?? "Failed to generate exercise");

      const ex = exerciseJson.data;
      setSession((s) => ({ ...s, exercise: ex }));
      await fetchAudio(ex.story.germanText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }

  function startNew() {
    clearSession();
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setPhase("idle");
    setError(null);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
  }

  function restart() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  }

  function changeRate(rate: number) {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── IDLE ─────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Hören — Listening</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Listen to AI-generated German audio and answer comprehension questions.
          </p>
        </div>

        <ExerciseSettingsCard
          level={level}
          onLevelChange={(l) => patch("level", l)}
          textLength={textLength}
          onLengthChange={(l) => patch("textLength", l)}
          wordCount={wordCount}
          onWordCountChange={(n) => patch("wordCount", n)}
          lengthLabel="Audio Length"
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
              Gemini writes a short German story at your chosen CEFR level.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">2.</span>
              Gemini TTS voices it aloud — slow down playback speed if needed.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">3.</span>
              Answer 3 comprehension questions, then reveal the transcript.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    const steps: { key: LoadingStep; label: string }[] = [
      { key: "text", label: "Generating story & questions" },
      { key: "audio", label: "Creating audio with Gemini TTS" },
    ];
    const stepIndex: Record<LoadingStep, number> = { text: 0, audio: 1 };

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Hören — Listening</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Preparing your {level} exercise…
          </p>
        </div>
        <div className="card py-12 flex flex-col items-center gap-8">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {steps.map((step, i) => {
              const done = stepIndex[loadingStep] > i;
              const active = loadingStep === step.key;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 border font-medium transition-all ${
                      done
                        ? "bg-success/10 border-success/30 text-success"
                        : active
                        ? "bg-accent-muted border-accent/40 text-accent"
                        : "bg-surface-raised border-white/10 text-text-muted"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      done ? "text-success" : active ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
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
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Hören — Listening</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Listen carefully, then answer the comprehension questions.
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

      {/* Audio Player */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">{ex.story.title}</h2>

        <div
          className="w-full h-1.5 bg-surface-raised rounded-full cursor-pointer group relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-accent rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={restart}
              title="Restart"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-xs font-mono text-text-muted tabular-nums">
              {fmt(currentTime)} / {duration > 0 ? fmt(duration) : "--:--"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => changeRate(r)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                    playbackRate === r
                      ? "bg-accent-muted text-accent border-accent/30"
                      : "text-text-muted border-white/10 hover:text-text-secondary hover:border-white/20"
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>
            <button
              onClick={() => patch("showTranscript", !showTranscript)}
              className={`btn-ghost text-xs py-1.5 border transition-all ${
                showTranscript
                  ? "border-accent/30 text-accent bg-accent-muted"
                  : "border-white/10 text-text-muted"
              }`}
            >
              Transcript
            </button>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && (
        <div className="card space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-primary">Transcript</h3>
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
            <p className="text-text-secondary leading-relaxed text-sm italic border-l-2 border-accent pl-4 animate-slide-up">
              {ex.story.englishTranslation}
            </p>
          )}
        </div>
      )}

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
                : "Good effort — listen again and review the transcript."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              onClick={() =>
                setSession((s) => ({ ...s, answers: {}, submitted: false }))
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
