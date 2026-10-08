import { useState, useEffect } from "react";
import { CurriculumProgress, LessonStatus } from "../types";

const KEY = "curriculum_progress";

export function useCurriculumProgress() {
  const [progress, setProgress] = useState<CurriculumProgress>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch {}
  }, [progress]);

  function getStatus(id: string): LessonStatus {
    return progress[id] ?? "available";
  }

  function startLektion(id: string) {
    setProgress((p) => {
      if (p[id] === "completed" || p[id] === "in_progress") return p;
      return { ...p, [id]: "in_progress" };
    });
  }

  function completeLektion(id: string) {
    setProgress((p) => ({ ...p, [id]: "completed" }));
  }

  return { getStatus, startLektion, completeLektion };
}
