import { useCallback, useState } from "react";

const STORAGE_KEY = "priut:intro-seen";

/**
 * Whether the person has swiped through the marketing intro before.
 * Purely a presentation-layer flag (not part of the user domain model) —
 * it just stops the intro from reappearing on every visit.
 */
export function useIntroSeen() {
  const [introSeen, setIntroSeenState] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  const markIntroSeen = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setIntroSeenState(true);
  }, []);

  return { introSeen, markIntroSeen };
}

/** Demo-only: lets "reset profile" also restart the intro carousel. */
export function clearIntroSeen() {
  localStorage.removeItem(STORAGE_KEY);
}
