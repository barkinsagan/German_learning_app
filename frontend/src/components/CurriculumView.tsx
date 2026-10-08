import { useState, useEffect } from "react";
import { LEKTIONEN, Lektion } from "../curriculum/lektionen";
import { LessonStatus, LectureData, ReadingExercise, ApiResponse, Question } from "../types";
import { useCurriculumProgress } from "../hooks/useCurriculumProgress";
import { QuestionCard } from "./QuestionCard";
import { API_BASE } from "../config";

// ── Markdown renderer ────────────────────────────────────────────────────────

function inlineFmt(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded text-accent">{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMd(md: string): React.ReactNode {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: React.ReactNode[] = [];
  let k = 0;

  function flush() {
    if (listBuf.length) {
      nodes.push(<ul key={k++} className="space-y-1.5 ml-4 mt-2 mb-2">{listBuf}</ul>);
      listBuf = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("# ")) {
      flush();
      nodes.push(<h1 key={k++} className="text-xl font-bold text-text-primary mt-2 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      flush();
      nodes.push(<h2 key={k++} className="text-base font-semibold text-text-primary mt-5 mb-2 pb-1 border-b border-white/5">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flush();
      nodes.push(<h3 key={k++} className="text-sm font-semibold text-text-primary mt-4 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      listBuf.push(
        <li key={k++} className="flex gap-2 text-text-secondary text-sm">
          <span className="text-accent shrink-0 mt-0.5">•</span>
          <span>{inlineFmt(line.slice(2))}</span>
        </li>
      );
    } else if (line === "---") {
      flush();
      nodes.push(<hr key={k++} className="border-white/10 my-4" />);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      nodes.push(<p key={k++} className="text-text-secondary text-sm leading-relaxed mt-1.5">{inlineFmt(line)}</p>);
    }
  }
  flush();
  return <>{nodes}</>;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LessonStatus }) {
  if (status === "completed")
    return <span className="text-success text-sm font-bold">✓</span>;
  if (status === "in_progress")
    return <span className="text-accent text-sm">→</span>;
  return <span className="text-text-muted text-sm">○</span>;
}

// ── Lesson card ───────────────────────────────────────────────────────────────

function LessonCard({
  lektion,
  status,
  onClick,
}: {
  lektion: Lektion;
  status: LessonStatus;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`card text-left p-4 w-full transition-all duration-200 hover:border-accent/30 cursor-pointer ${
        status === "completed" ? "border-success/20 bg-success/5" : ""
      } ${status === "in_progress" ? "border-accent/20" : ""}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl font-bold text-accent/25 font-mono leading-none">
          {String(lektion.number).padStart(2, "0")}
        </span>
        <StatusBadge status={status} />
      </div>
      <p className="text-text-primary text-sm font-medium leading-snug">{lektion.title}</p>
      <p className="text-text-muted text-xs mt-1.5 leading-snug line-clamp-2">
        {lektion.grammar.join(" · ")}
      </p>
    </button>
  );
}

// ── Level progress bar ────────────────────────────────────────────────────────

function LevelProgress({ lektionen, getStatus }: { lektionen: Lektion[]; getStatus: (id: string) => LessonStatus }) {
  const done = lektionen.filter((l) => getStatus(l.id) === "completed").length;
  const pct = Math.round((done / lektionen.length) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-muted shrink-0">{done}/{lektionen.length}</span>
    </div>
  );
}

// ── Module tree view ──────────────────────────────────────────────────────────

function ModuleTree({ onSelect }: { onSelect: (id: string) => void }) {
  const { getStatus } = useCurriculumProgress();

  const a11 = LEKTIONEN.filter((l) => l.level === "A1.1");
  const a12 = LEKTIONEN.filter((l) => l.level === "A1.2");
  const modules = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Kursplan — Curriculum</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Structured A1 German: 24 lessons across 8 modules, from basics to past tense and beyond.
        </p>
      </div>

      {(["A1.1", "A1.2"] as const).map((level) => {
        const lektionen = level === "A1.1" ? a11 : a12;
        const levelModules = level === "A1.1" ? modules.slice(0, 4) : modules.slice(4);
        return (
          <div key={level} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-text-primary">{level}</h2>
                <span className="badge bg-accent-muted text-accent border border-accent/20 text-xs">
                  {level === "A1.1" ? "Grundstufe 1" : "Grundstufe 2"}
                </span>
              </div>
              <LevelProgress lektionen={lektionen} getStatus={getStatus} />
            </div>

            {levelModules.map((mod) => {
              const modLektionen = LEKTIONEN.filter((l) => l.module === mod);
              return (
                <div key={mod} className="space-y-2">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
                    Modul {mod}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {modLektionen.map((l) => (
                      <LessonCard
                        key={l.id}
                        lektion={l}
                        status={getStatus(l.id)}
                        onClick={() => onSelect(l.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Lesson view ───────────────────────────────────────────────────────────────

type Tab = "lecture" | "exercises" | "practice";

function LessonView({ id, onBack }: { id: string; onBack: () => void }) {
  const lektion = LEKTIONEN.find((l) => l.id === id)!;
  const { getStatus, completeLektion } = useCurriculumProgress();
  const status = getStatus(id);

  const [tab, setTab] = useState<Tab>("lecture");

  // Lecture
  const [lecture, setLecture] = useState<LectureData | null>(null);
  const [lectureLoading, setLectureLoading] = useState(true);
  const [lectureLang, setLectureLang] = useState<"de" | "en">("de");

  // Exercises
  const [exercises, setExercises] = useState<Question[] | null>(null);
  const [exAnswers, setExAnswers] = useState<Record<number, number>>({});
  const [exSubmitted, setExSubmitted] = useState(false);

  // Practice
  const [practice, setPractice] = useState<ReadingExercise | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [prAnswers, setPrAnswers] = useState<Record<number, number>>({});
  const [prSubmitted, setPrSubmitted] = useState(false);

  useEffect(() => {
    setLectureLoading(true);
    fetch(`${API_BASE}/api/curriculum/${id}/lecture?lang=${lectureLang}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setLecture(json.data); })
      .finally(() => setLectureLoading(false));
  }, [id, lectureLang]);

  useEffect(() => {
    if (tab === "exercises" && exercises === null) {
      fetch(`${API_BASE}/api/curriculum/${id}/exercises`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setExercises(json.data.exercises); });
    }
  }, [id, tab, exercises]);

  async function generatePractice() {
    setPracticeLoading(true);
    setPracticeError(null);
    setPractice(null);
    setPrAnswers({});
    setPrSubmitted(false);
    try {
      const res = await fetch(`${API_BASE}/api/curriculum/${id}/practice`, { method: "POST" });
      const json: ApiResponse<ReadingExercise> = await res.json();
      if (!json.success) throw new Error(json.error ?? "Generation failed");
      setPractice(json.data);
    } catch (e) {
      setPracticeError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPracticeLoading(false);
    }
  }

  function handleExSubmit() {
    setExSubmitted(true);
    completeLektion(id);
  }

  function handlePracticeSubmit() {
    setPrSubmitted(true);
    if (status !== "completed") completeLektion(id);
  }

  const TABS: { id: Tab; label: string; sub: string }[] = [
    { id: "lecture", label: "Lektion", sub: "Lecture" },
    { id: "exercises", label: "Übungen", sub: "Exercises" },
    { id: "practice", label: "Üben", sub: "Practice" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="btn-ghost text-xs py-1.5 mt-1 shrink-0">← Back</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-muted text-sm font-mono">L{String(lektion.number).padStart(2, "0")}</span>
            <h1 className="text-xl font-bold text-text-primary">{lektion.title}</h1>
            <span className="badge bg-accent-muted text-accent border border-accent/20 text-xs">{lektion.level}</span>
            {status === "completed" && (
              <span className="badge bg-success/10 text-success border border-success/20 text-xs">Abgeschlossen</span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="card grid grid-cols-2 gap-4 py-3">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Wortfelder</p>
          <div className="flex flex-wrap gap-1.5">
            {lektion.wortfelder.map((w) => (
              <span key={w} className="text-xs bg-surface-raised border border-white/5 rounded px-2 py-0.5 text-text-secondary">{w}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Grammatik</p>
          <div className="flex flex-wrap gap-1.5">
            {lektion.grammar.map((g) => (
              <span key={g} className="text-xs bg-accent-muted border border-accent/15 rounded px-2 py-0.5 text-accent/80">{g}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 -mb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              tab === t.id
                ? "text-accent border-b-2 border-accent -mb-px"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${tab === t.id ? "text-accent/60" : "text-text-muted/60"}`}>
              {t.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Tab: Lektion */}
      {tab === "lecture" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {lectureLang === "de" ? "Sprache" : "Language"}
            </p>
            <div className="inline-flex rounded-lg border border-white/5 bg-surface-raised p-0.5 text-xs">
              {(["de", "en"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setLectureLang(lng)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    lectureLang === lng
                      ? "bg-accent text-background"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {lng === "de" ? "Deutsch" : "English"}
                </button>
              ))}
            </div>
          </div>
          {lecture && lecture.lang && lecture.lang !== lectureLang && (
            <p className="text-xs text-text-muted italic">
              {lectureLang === "en"
                ? "English version not available — showing German."
                : "Deutsche Version nicht verfügbar — zeige Englisch."}
            </p>
          )}
          <div className="card min-h-[200px]">
            {lectureLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center">
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
              </div>
            ) : lecture ? (
              <div className="lecture-prose">{renderMd(lecture.content)}</div>
            ) : (
              <p className="text-text-muted text-sm">Konnte den Inhalt nicht laden.</p>
            )}
          </div>
          {status !== "completed" && (
            <button className="btn-ghost text-xs" onClick={() => completeLektion(id)}>
              Als abgeschlossen markieren ✓
            </button>
          )}
        </div>
      )}

      {/* Tab: Übungen */}
      {tab === "exercises" && (
        <div className="space-y-4">
          {exercises === null ? (
            <div className="card flex items-center justify-center py-12">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          ) : exercises.length === 0 ? (
            <div className="card text-center py-12 space-y-3">
              <p className="text-text-secondary text-sm">Noch keine Übungen verfügbar.</p>
              <p className="text-text-muted text-xs">
                Fügen Sie Übungen in{" "}
                <code className="font-mono bg-white/5 px-1 rounded">data/curriculum/{id}/exercises.json</code>{" "}
                hinzu.
              </p>
              {status !== "completed" && (
                <button className="btn-ghost text-xs mt-2" onClick={() => completeLektion(id)}>
                  Als abgeschlossen markieren ✓
                </button>
              )}
            </div>
          ) : (
            <>
              {exercises.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  selected={exAnswers[q.id]}
                  submitted={exSubmitted}
                  onSelect={(idx) => {
                    if (exSubmitted) return;
                    setExAnswers((a) => ({ ...a, [q.id]: idx }));
                  }}
                />
              ))}
              {!exSubmitted ? (
                <button
                  className="btn-primary w-full py-3"
                  disabled={exercises.some((q) => exAnswers[q.id] === undefined)}
                  onClick={handleExSubmit}
                >
                  Antworten prüfen
                </button>
              ) : (
                <div className="card flex items-center justify-between border-success/20 bg-success/5">
                  <div>
                    <p className="font-bold text-text-primary">
                      {exercises.filter((q) => exAnswers[q.id] === q.correctAnswer).length}/{exercises.length} richtig
                    </p>
                    <p className="text-text-secondary text-sm mt-0.5">Lektion abgeschlossen!</p>
                  </div>
                  <button className="btn-ghost text-sm" onClick={() => { setExAnswers({}); setExSubmitted(false); }}>
                    Wiederholen
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Üben */}
      {tab === "practice" && (
        <div className="space-y-4">
          {!practice && !practiceLoading && (
            <div className="card text-center py-12 space-y-3">
              <p className="text-text-secondary text-sm">
                Gemini generiert eine Übung, die exakt auf die Grammatikziele dieser Lektion zugeschnitten ist.
              </p>
              {practiceError && (
                <p className="text-error text-xs">{practiceError}</p>
              )}
              <button className="btn-primary" onClick={generatePractice}>
                Übung generieren
              </button>
            </div>
          )}

          {practiceLoading && (
            <div className="card flex flex-col items-center justify-center py-16 space-y-4">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-text-muted text-sm">Gemini schreibt Ihre Übung…</p>
            </div>
          )}

          {practice && !practiceLoading && (
            <>
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">{practice.story.title}</h3>
                  <span className="badge bg-accent-muted text-accent border border-accent/20 text-xs">
                    {practice.story.level}
                  </span>
                </div>
                <p className="text-text-primary leading-relaxed text-sm font-mono bg-background/50 rounded-lg px-4 py-3 border border-white/5">
                  {practice.story.germanText}
                </p>
              </div>

              <div className="space-y-3">
                {practice.questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    selected={prAnswers[q.id]}
                    submitted={prSubmitted}
                    onSelect={(idx) => {
                      if (prSubmitted) return;
                      setPrAnswers((a) => ({ ...a, [q.id]: idx }));
                    }}
                  />
                ))}
              </div>

              {!prSubmitted ? (
                <button
                  className="btn-primary w-full py-3"
                  disabled={practice.questions.some((q) => prAnswers[q.id] === undefined)}
                  onClick={handlePracticeSubmit}
                >
                  Antworten prüfen
                </button>
              ) : (
                <div className="card flex items-center justify-between">
                  <div>
                    <p className="font-bold text-text-primary">
                      {practice.questions.filter((q) => prAnswers[q.id] === q.correctAnswer).length}/
                      {practice.questions.length} richtig
                    </p>
                  </div>
                  <button className="btn-primary text-sm px-4 py-2" onClick={generatePractice}>
                    Neue Übung
                  </button>
                </div>
              )}

              <div className="card space-y-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Vokabeln</p>
                <div className="grid grid-cols-2 gap-2">
                  {practice.vocabulary.map((w) => (
                    <div key={w.german} className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 border border-white/5">
                      <span className="font-mono text-accent text-sm font-medium">{w.german}</span>
                      <span className="text-text-secondary text-sm">{w.english}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function CurriculumView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { startLektion } = useCurriculumProgress();

  function openLektion(id: string) {
    startLektion(id);
    setSelectedId(id);
  }

  if (selectedId) {
    return <LessonView id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <ModuleTree onSelect={openLektion} />;
}
