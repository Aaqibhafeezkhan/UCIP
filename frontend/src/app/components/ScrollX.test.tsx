import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ScrollX from "./ScrollX";

// jsdom has no layout, so the observer is captured and the metrics are faked.
let notify: () => void = () => {};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        notify = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setMetrics(el: HTMLElement, m: { scrollWidth: number; clientWidth: number; scrollLeft: number }) {
  for (const [key, value] of Object.entries(m)) {
    Object.defineProperty(el, key, { configurable: true, writable: true, value });
  }
}

const fades = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-scroll-fade]")).map((n) => n.getAttribute("data-scroll-fade"));

describe("ScrollX", () => {
  it("shows no fade when the content fits", () => {
    const { container } = render(<ScrollX label="Table"><p>short</p></ScrollX>);
    setMetrics(screen.getByRole("region", { name: "Table" }), { scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
    act(() => notify());
    expect(fades(container)).toEqual([]);
  });

  it("fades the side that has more content as the region scrolls", () => {
    const { container } = render(<ScrollX label="Table"><p>wide</p></ScrollX>);
    const region = screen.getByRole("region", { name: "Table" });

    setMetrics(region, { scrollWidth: 600, clientWidth: 300, scrollLeft: 0 });
    act(() => notify());
    expect(fades(container)).toEqual(["end"]);

    region.scrollLeft = 150;
    fireEvent.scroll(region);
    expect(fades(container)).toEqual(["start", "end"]);

    region.scrollLeft = 300;
    fireEvent.scroll(region);
    expect(fades(container)).toEqual(["start"]);
  });

  it("is a keyboard stop by default and not when told otherwise", () => {
    const { rerender } = render(<ScrollX label="Table"><p>wide</p></ScrollX>);
    expect(screen.getByRole("region", { name: "Table" })).toHaveAttribute("tabindex", "0");

    rerender(<ScrollX focusable={false}><p>wide</p></ScrollX>);
    expect(screen.queryByRole("region")).toBeNull();
    expect(document.querySelector("[tabindex]")).toBeNull();
  });
});
