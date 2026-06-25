import { useRef, useEffect } from "react";
import { Question } from "../types";

interface QuestionCardProps {
  question: Question;
  selected: number | undefined;
  submitted: boolean;
  onSelect: (index: number) => void;
  autoFocus?: boolean;
}

export function QuestionCard({
  question,
  selected,
  submitted,
  onSelect,
  autoFocus,
}: QuestionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) cardRef.current?.focus();
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (submitted) return;
    const map: Record<string, number> = {
      a: 0, b: 1, c: 2, d: 3,
      "1": 0, "2": 1, "3": 2, "4": 3,
    };
    const idx = map[e.key.toLowerCase()];
    if (idx !== undefined && idx < question.options.length) {
      e.preventDefault();
      onSelect(idx);
    }
  }

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="card space-y-3 focus:outline-none focus:ring-1 focus:ring-accent/30"
    >
      <p className="font-medium text-text-primary text-sm">
        <span className="text-text-muted mr-2">Q{question.id}.</span>
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((option, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === question.correctAnswer;
          let stateClass = "border-white/10 bg-surface-raised hover:border-accent/40";
          if (submitted) {
            if (isCorrect) stateClass = "border-success/40 bg-success/10 text-success";
            else if (isSelected && !isCorrect)
              stateClass = "border-error/40 bg-error/10 text-error";
          } else if (isSelected) {
            stateClass = "border-accent/50 bg-accent-muted text-accent";
          }
          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all duration-150 ${stateClass} ${
                !submitted ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <span className="font-mono text-xs text-text-muted mr-2">
                {String.fromCharCode(65 + idx)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>
      {submitted && (
        <p className="text-xs text-text-secondary italic border-l-2 border-accent pl-3 animate-slide-up">
          {question.explanation}
        </p>
      )}
    </div>
  );
}
