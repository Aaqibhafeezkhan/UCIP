import { describe, it, expect, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useInView } from "./useInView";

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

/** An IntersectionObserver the test drives by hand, the way scrolling would. */
function stubIntersectionObserver() {
  const observers: Array<{ callback: Callback; observed: Element[]; disconnected: boolean }> = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      record = { callback: null as unknown as Callback, observed: [] as Element[], disconnected: false };
      constructor(callback: Callback) {
        this.record.callback = callback;
        observers.push(this.record);
      }
      observe(el: Element) {
        this.record.observed.push(el);
      }
      disconnect() {
        this.record.disconnected = true;
      }
    }
  );
  return {
    observers,
    set(isIntersecting: boolean) {
      act(() => observers[observers.length - 1]!.callback([{ isIntersecting }]));
    },
  };
}

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} data-testid="probe">
      {inView ? "in view" : "out of view"}
    </div>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("useInView", () => {
  it("starts in view and observes the element", () => {
    const io = stubIntersectionObserver();
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("in view");
    expect(io.observers).toHaveLength(1);
    expect(io.observers[0]!.observed).toEqual([screen.getByTestId("probe")]);
  });

  it("follows the element as it scrolls away and back", () => {
    const io = stubIntersectionObserver();
    render(<Probe />);
    io.set(false);
    expect(screen.getByTestId("probe")).toHaveTextContent("out of view");
    io.set(true);
    expect(screen.getByTestId("probe")).toHaveTextContent("in view");
  });

  it("stops observing on unmount", () => {
    const io = stubIntersectionObserver();
    const { unmount } = render(<Probe />);
    unmount();
    expect(io.observers[0]!.disconnected).toBe(true);
  });

  it("stays in view where IntersectionObserver does not exist", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("in view");
  });
});
