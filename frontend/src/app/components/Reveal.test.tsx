import { describe, it, expect, afterEach, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import Reveal from "./Reveal";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Reveal", () => {
  it("watches for any overlap, not a fraction of the element", () => {
    const seen: { options?: IntersectionObserverInit }[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(_cb: unknown, options?: IntersectionObserverInit) {
          seen.push({ options });
        }
        observe() {}
        disconnect() {}
      }
    );
    render(<Reveal>content</Reveal>);
    expect(seen[0].options?.threshold).toBe(0);
  });

  it("stops observing once it has revealed", () => {
    let fire: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof fire) {
          fire = cb;
        }
        observe() {}
        disconnect = disconnect;
      }
    );
    render(<Reveal>content</Reveal>);
    disconnect.mockClear();
    act(() => fire([{ isIntersecting: true }]));
    expect(disconnect).toHaveBeenCalled();
  });

  it("shows its content in a browser that has no IntersectionObserver", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal>content</Reveal>);
    await waitFor(() => expect(screen.getByText("content")).toHaveAttribute("data-reveal", "shown"));
  });

  describe("when the observer never reports", () => {
    function silentObserver() {
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          observe() {}
          disconnect() {}
        }
      );
    }

    it("shows its content after the grace period", () => {
      vi.useFakeTimers();
      silentObserver();
      render(<Reveal>content</Reveal>);
      const el = screen.getByText("content");
      expect(el).toHaveAttribute("data-reveal", "hidden");
      act(() => vi.advanceTimersByTime(1000));
      expect(el).toHaveAttribute("data-reveal", "hidden");
      act(() => vi.advanceTimersByTime(600));
      expect(el).toHaveAttribute("data-reveal", "shown");
    });

    it("leaves a working observer alone, so below-the-fold content still waits for scroll", () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(private cb: (entries: { isIntersecting: boolean }[]) => void) {}
          // Reports at once, as a real observer does, but the element is off screen.
          observe() {
            this.cb([{ isIntersecting: false }]);
          }
          disconnect() {}
        }
      );
      render(<Reveal>content</Reveal>);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("content")).toHaveAttribute("data-reveal", "hidden");
    });

    it("cancels the timer on unmount", () => {
      vi.useFakeTimers();
      silentObserver();
      const { unmount } = render(<Reveal>content</Reveal>);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
