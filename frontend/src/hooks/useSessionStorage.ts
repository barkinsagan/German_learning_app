import { useState } from "react";

export function useSessionStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  function set(val: T | ((prev: T) => T)) {
    setValue((prev) => {
      const next = typeof val === "function" ? (val as (p: T) => T)(prev) : val;
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clear() {
    try {
      sessionStorage.removeItem(key);
    } catch {}
    setValue(initialValue);
  }

  return [value, set, clear] as const;
}
