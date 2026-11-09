import { describe, it, expect, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import Reveal from "./Reveal";

afterEach(() => vi.unstubAllGlobals());

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

  it("copes with a browser that has no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal>content</Reveal>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
