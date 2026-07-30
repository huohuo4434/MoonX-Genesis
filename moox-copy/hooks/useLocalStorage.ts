import { useCallback, useEffect, useState } from "react";

/**
 * Sync a piece of state with `localStorage`, tolerant of SSR (Next.js
 * renders on the server first, so we fall back to `initialValue` until
 * the component mounts on the client).
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Ignore malformed/unavailable storage and keep the initial value.
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  const setStoredValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage may be unavailable (e.g. private browsing); fail silently.
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, setStoredValue, isHydrated] as const;
}
