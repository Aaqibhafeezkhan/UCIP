import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * jsdom has no matchMedia. This stub answers from `matches` (a query to boolean
 * map, false for anything unlisted) and lets a test flip an answer and notify
 * the listeners, the way crossing a breakpoint does.
 */
export function stubMatchMedia(initial: Record<string, boolean> = {}) {
  const state = { ...initial };
  const listeners = new Map<string, Set<() => void>>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return state[query] ?? false;
      },
      addEventListener: (_type: string, listener: () => void) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)!.add(listener);
      },
      removeEventListener: (_type: string, listener: () => void) => {
        listeners.get(query)?.delete(listener);
      },
    }))
  );
  return {
    set(query: string, matches: boolean) {
      state[query] = matches;
      act(() => listeners.get(query)?.forEach((listener) => listener()));
    },
  };
}
