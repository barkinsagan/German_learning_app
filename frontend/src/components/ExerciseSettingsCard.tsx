import {
  LEVELS,
  LENGTHS,
  WORD_COUNTS,
  LENGTH_LABELS,
  Level,
  TextLength,
  WordCount,
} from "../exerciseConfig";

interface ExerciseSettingsCardProps {
  level: Level;
  onLevelChange: (l: Level) => void;
  textLength: TextLength;
  onLengthChange: (l: TextLength) => void;
  wordCount: WordCount;
  onWordCountChange: (n: WordCount) => void;
  lengthLabel?: string;
  error: string | null;
  onGenerate: () => void;
  generateLabel?: string;
}

export function ExerciseSettingsCard({
  level,
  onLevelChange,
  textLength,
  onLengthChange,
  wordCount,
  onWordCountChange,
  lengthLabel = "Text Length",
  error,
  onGenerate,
  generateLabel = "Generate Exercise",
}: ExerciseSettingsCardProps) {
  return (
    <div className="card space-y-5">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Level
        </p>
        <div className="flex gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => onLevelChange(l)}
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
          {lengthLabel}
        </p>
        <div className="flex gap-2">
          {LENGTHS.map((l) => (
            <button
              key={l}
              onClick={() => onLengthChange(l)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                textLength === l
                  ? "bg-accent-muted text-accent border-accent/30"
                  : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
              }`}
            >
              {LENGTH_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5" />

      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Vocabulary Words
        </p>
        <div className="flex gap-2">
          {WORD_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => onWordCountChange(n)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                wordCount === n
                  ? "bg-accent-muted text-accent border-accent/30"
                  : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
              }`}
            >
              {n} words
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/20 bg-error/5 text-error text-sm py-3 px-4">
          {error}
        </div>
      )}

      <button className="btn-primary w-full py-3" onClick={onGenerate}>
        {generateLabel}
      </button>
    </div>
  );
}
