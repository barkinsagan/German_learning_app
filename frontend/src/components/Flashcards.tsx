import { useState, useEffect, useRef } from "react";
import { FlashCard, Profile } from "../types";
import { API_BASE } from "../config";
import { LEVELS, Level } from "../exerciseConfig";
import { useBookmarks } from "../hooks/useBookmarks";

const COUNTS = [10, 20, 30] as const;
type Count = (typeof COUNTS)[number];
type Source = "random" | "bookmarked";
type Phase = "idle" | "loading" | "playing" | "results";

export function Flashcards() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [profile, setProfile] = useState<Profile>("Barkin");
  const [level, setLevel] = useState<Level>("A1");
  const [count, setCount] = useState<Count>(10);
  const [source, setSource] = useState<Source>("random");
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<("correct" | "again")[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { bookmarks } = useBookmarks();

  const handleResultRef = useRef<(r: "correct" | "again") => void>(() => {});

  function handleResult(result: "correct" | "again") {
    const card = cards[currentIndex];
    fetch(`${API_BASE}/api/vocabulary/familiarity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: card.id, profile, delta: result === "correct" ? 1 : -1 }),
    }).catch(() => {});

    const newResults = [...results, result];
    if (currentIndex + 1 >= cards.length) {
      setResults(newResults);
      setPhase("results");
    } else {
      setResults(newResults);
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  // Keep ref in sync so keyboard handler always has the latest closure
  useEffect(() => {
    handleResultRef.current = handleResult;
  });

  // Keyboard shortcuts for playing phase
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing") return;
      if (e.key === " " && !flipped) {
        e.preventDefault();
        setFlipped(true);
      } else if (e.key === "ArrowRight" && flipped) {
        e.preventDefault();
        handleResultRef.current("correct");
      } else if (e.key === "ArrowLeft" && flipped) {
        e.preventDefault();
        handleResultRef.current("again");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, flipped]);

  async function startSession() {
    setError(null);

    if (source === "bookmarked") {
      if (bookmarks.length === 0) {
        setError(
          "No bookmarked words yet. Bookmark words from Reading or Listening exercises first."
        );
        return;
      }
      const shuffled = [...bookmarks]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      const deck: FlashCard[] = shuffled.map((b, i) => ({
        id: -(i + 1),
        german: b.german,
        english: b.english,
        partOfSpeech: b.partOfSpeech,
        familiarity: 0,
      }));
      setCards(deck);
      setCurrentIndex(0);
      setFlipped(false);
      setResults([]);
      setPhase("playing");
      return;
    }

    setPhase("loading");
    try {
      const res = await fetch(
        `${API_BASE}/api/vocabulary/words?level=${level}&count=${count}&profile=${profile}`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      const deck: FlashCard[] = json.data.map(
        (w: {
          id: number;
          german: string;
          english: string;
          partOfSpeech: string;
          article?: string | null;
          exampleSentence?: string | null;
          familiarity: number;
        }) => ({
          id: w.id,
          german: w.german,
          english: w.english,
          partOfSpeech: w.partOfSpeech,
          article: w.article,
          exampleSentence: w.exampleSentence,
          familiarity: w.familiarity,
        })
      );
      setCards(deck);
      setCurrentIndex(0);
      setFlipped(false);
      setResults([]);
      setPhase("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }

  function reviewAgainCards() {
    const againCards = cards.filter((_, i) => results[i] === "again");
    setCards(againCards);
    setCurrentIndex(0);
    setFlipped(false);
    setResults([]);
    setPhase("playing");
  }

  function reset() {
    setPhase("idle");
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setResults([]);
    setError(null);
  }

  const clampedCount = source === "bookmarked" && bookmarks.length < count
    ? bookmarks.length
    : count;

  // ── IDLE ─────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Karteikarten — Flashcards
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Drill vocabulary with flip cards. Space to reveal, ← Again, → Got it.
          </p>
        </div>

        <div className="card space-y-5">
          {/* Profile */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Who's practicing?
            </p>
            <div className="flex gap-3">
              {([
                { name: "Barkin", emoji: "🔥", char: "Zuko", bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", ring: "border-orange-500/60" },
                { name: "Bahar",  emoji: "🪨", char: "Toph",  bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400",  ring: "border-green-500/60"  },
              ] as const).map(({ name, char, bg, text, ring }) => (
                <button
                  key={name}
                  onClick={() => setProfile(name)}
                  className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-150 ${
                    profile === name
                      ? `${bg} ${ring}`
                      : "bg-surface-raised border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className={`w-20 h-20 rounded-full overflow-hidden border-2 ${profile === name ? ring : "border-white/10"}`}>
                    <img src={name === "Barkin" ? "/zuko.jpg" : "/toph.jpeg"} alt={char} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${profile === name ? text : "text-text-primary"}`}>{name}</p>
                    <p className="text-xs text-text-muted">{char}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Source */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Word Source
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSource("random")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 text-left ${
                  source === "random"
                    ? "bg-accent-muted text-accent border-accent/30"
                    : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
                }`}
              >
                <span className="block font-medium">Random words</span>
                <span className="block text-xs opacity-60 mt-0.5">
                  From the vocabulary database
                </span>
              </button>
              <button
                onClick={() => setSource("bookmarked")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 text-left ${
                  source === "bookmarked"
                    ? "bg-accent-muted text-accent border-accent/30"
                    : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
                }`}
              >
                <span className="block font-medium">Bookmarked</span>
                <span className="block text-xs opacity-60 mt-0.5">
                  {bookmarks.length === 0
                    ? "No bookmarks yet"
                    : `${bookmarks.length} saved word${bookmarks.length === 1 ? "" : "s"}`}
                </span>
              </button>
            </div>
          </div>

          {source === "random" && (
            <>
              <div className="border-t border-white/5" />
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Level
                </p>
                <div className="flex gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
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
            </>
          )}

          <div className="border-t border-white/5" />

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Cards per Session
            </p>
            <div className="flex gap-2">
              {COUNTS.map((n) => {
                const disabled = source === "bookmarked" && bookmarks.length < n;
                return (
                  <button
                    key={n}
                    onClick={() => !disabled && setCount(n)}
                    disabled={disabled}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      count === n && !disabled
                        ? "bg-accent-muted text-accent border-accent/30"
                        : disabled
                        ? "bg-surface-raised text-text-muted border-white/5 opacity-40 cursor-not-allowed"
                        : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-error/20 bg-error/5 text-error text-sm py-3 px-4">
              {error}
            </div>
          )}

          <button
            className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={source === "bookmarked" && bookmarks.length === 0}
            onClick={startSession}
          >
            Start Session
            {source === "bookmarked" && bookmarks.length > 0 && (
              <span className="ml-1.5 opacity-70">({clampedCount} cards)</span>
            )}
          </button>
        </div>

        <div className="card border-dashed border-white/10 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Keyboard shortcuts
          </p>
          <div className="space-y-1 text-sm text-text-secondary">
            <div className="flex items-center gap-3">
              <kbd className="font-mono text-xs bg-surface-raised border border-white/10 rounded px-2 py-0.5">
                Space
              </kbd>
              <span>Reveal the card</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="font-mono text-xs bg-surface-raised border border-white/10 rounded px-2 py-0.5">
                ←
              </kbd>
              <span>Again (didn't know it)</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="font-mono text-xs bg-surface-raised border border-white/10 rounded px-2 py-0.5">
                →
              </kbd>
              <span>Got it (knew it)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Karteikarten — Flashcards
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Loading {count} {level} words…
          </p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16 space-y-4">
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-text-muted text-sm">Fetching words from database…</p>
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (phase === "playing") {
    const card = cards[currentIndex];
    const progress = ((currentIndex + (flipped ? 0.5 : 0)) / cards.length) * 100;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Karteikarten — Flashcards
            </h1>
            <p className="text-text-secondary mt-0.5 text-sm">
              {profile} · Card {currentIndex + 1} / {cards.length}
            </p>
          </div>
          <button className="btn-ghost text-xs py-1.5" onClick={reset}>
            End Session
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-surface-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Flashcard */}
        <div className="flashcard-scene w-full" style={{ height: "260px" }}>
          <div key={currentIndex} className={`flashcard-inner${flipped ? " is-flipped" : ""}`}>
            {/* Front */}
            <div
              className="flashcard-face bg-surface rounded-xl border border-white/5 flex flex-col items-center justify-center gap-3 cursor-pointer select-none p-8"
              onClick={() => !flipped && setFlipped(true)}
            >
              {card.article && (
                <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                  {card.article}
                </span>
              )}
              <p className="text-4xl font-bold text-text-primary font-mono text-center">
                {card.german}
              </p>
              <span className="badge bg-surface-raised text-text-muted border border-white/10 text-xs capitalize">
                {card.partOfSpeech}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-text-muted">
                  {card.familiarity === 0
                    ? "New"
                    : `Familiarity: ${card.familiarity}`}
                </span>
                <span className="text-xs text-text-muted">· click or press Space to reveal</span>
              </div>
            </div>

            {/* Back */}
            <div className="flashcard-face flashcard-back bg-surface rounded-xl border border-accent/20 flex flex-col items-center justify-center gap-3 select-none p-8">
              <p className="text-3xl font-bold text-text-primary text-center">
                {card.english}
              </p>
              {card.exampleSentence && (
                <p className="text-xs text-text-muted text-center italic mt-1 max-w-sm leading-relaxed">
                  "{card.exampleSentence}"
                </p>
              )}
              <span className="badge bg-surface-raised text-text-muted border border-white/10 text-xs capitalize mt-1">
                {card.partOfSpeech}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!flipped ? (
          <button
            className="btn-primary w-full py-3"
            onClick={() => setFlipped(true)}
          >
            Reveal
          </button>
        ) : (
          <div className="flex gap-4">
            <button
              className="flex-1 py-3 rounded-lg border border-error/30 bg-error/10 text-error font-medium text-sm hover:bg-error/20 transition-colors"
              onClick={() => handleResult("again")}
            >
              ✗ Again
            </button>
            <button
              className="flex-1 py-3 rounded-lg border border-success/30 bg-success/10 text-success font-medium text-sm hover:bg-success/20 transition-colors"
              onClick={() => handleResult("correct")}
            >
              ✓ Got it
            </button>
          </div>
        )}

        {/* Mini score tracker */}
        <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="text-success">✓</span>
            {results.filter((r) => r === "correct").length} correct
          </span>
          <span className="flex items-center gap-1">
            <span className="text-error">✗</span>
            {results.filter((r) => r === "again").length} again
          </span>
        </div>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  const correct = results.filter((r) => r === "correct").length;
  const again = results.filter((r) => r === "again").length;
  const pct = Math.round((correct / results.length) * 100);
  const againCards = cards.filter((_, i) => results[i] === "again");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Karteikarten — Flashcards
        </h1>
        <p className="text-text-secondary mt-1 text-sm">Session complete.</p>
      </div>

      {/* Score */}
      <div
        className={`card animate-slide-up ${
          pct === 100
            ? "border-success/20 bg-success/5"
            : pct >= 70
            ? "border-accent/20"
            : "border-error/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-text-primary">
              {correct}
              <span className="text-text-muted text-xl font-normal">
                /{results.length}
              </span>
            </p>
            <p className="text-text-secondary text-sm mt-1">
              {pct === 100
                ? "Ausgezeichnet! Perfect session!"
                : `${pct}% — ${again} card${again === 1 ? "" : "s"} to review`}
            </p>
          </div>
          <div
            className={`text-4xl font-bold ${
              pct === 100
                ? "text-success"
                : pct >= 70
                ? "text-accent"
                : "text-error"
            }`}
          >
            {pct}%
          </div>
        </div>
      </div>

      {/* Again cards */}
      {againCards.length > 0 && (
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Review These ({againCards.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {againCards.map((card) => (
              <div
                key={card.german}
                className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2.5 border border-error/10"
              >
                <span className="font-mono text-accent font-medium text-sm">
                  {card.german}
                </span>
                <span className="text-text-secondary text-sm">{card.english}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {againCards.length > 0 && (
          <button className="btn-ghost flex-1" onClick={reviewAgainCards}>
            Review Again Cards
          </button>
        )}
        <button className="btn-primary flex-1" onClick={reset}>
          New Session
        </button>
      </div>
    </div>
  );
}
