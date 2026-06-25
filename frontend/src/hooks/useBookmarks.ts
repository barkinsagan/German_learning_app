import { useState } from "react";
import { BookmarkedWord } from "../types";

const STORAGE_KEY = "germanapp_bookmarks";

function load(): BookmarkedWord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as BookmarkedWord[]) : [];
  } catch {
    return [];
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkedWord[]>(load);

  function toggle(word: BookmarkedWord) {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.german === word.german);
      const next = exists
        ? prev.filter((b) => b.german !== word.german)
        : [...prev, word];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function isBookmarked(german: string) {
    return bookmarks.some((b) => b.german === german);
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setBookmarks([]);
  }

  return { bookmarks, toggle, isBookmarked, clear };
}
