"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches. False on the server and during hydration, so
 * markup that depends on it never mismatches; it updates right after, and again
 * whenever the answer changes.
 */
export function useMediaQuery(query: string): boolean {
  // Stable per query, so the store is not unsubscribed and resubscribed on every render.
  const subscribe = useCallback(
    (notify: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
