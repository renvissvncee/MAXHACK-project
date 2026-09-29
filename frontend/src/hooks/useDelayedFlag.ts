import { useEffect, useState } from "react";

/**
 * Mirrors `active`, but only flips to true once it has stayed true for
 * `delayMs`. A fetch that resolves faster than that never shows a loading
 * state at all — which is what kills the "flash of a loading message" look
 * on fast tab switches, instead of the state snapping on and off instantly.
 */
export function useDelayedFlag(active: boolean, delayMs = 180): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return shown;
}
