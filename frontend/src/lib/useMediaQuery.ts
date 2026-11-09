"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches. False on the server and during hydration, so
 * markup that depends on it never mismatches; it updates right after, and again
 * whenever the answer changes.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
