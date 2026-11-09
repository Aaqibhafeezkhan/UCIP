"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Edges = { start: boolean; end: boolean };

/** Pixels of slack, so sub-pixel scroll positions do not leave a fade on at the very end. */
const SLACK = 1;

/**
 * A horizontally scrolling region with an edge fade on each side that has more
 * content past it, so wide content reads as scrollable rather than clipped.
 *
 * Focusable by default, with a label, because a scroll container a keyboard
 * cannot reach is a dead end. Pass `focusable={false}` when everything inside
 * is already reachable (the layer tabs), where a second stop would be noise.
 *
 * `className` styles the outer box, `scrollClassName` the scrolling element.
 * The outer box is a column, so a parent that caps its height gets vertical
 * scrolling inside the region too (the ward comparison relies on this).
 */
export default function ScrollX({
  label,
  focusable = true,
  fade = "from-background",
  className = "",
  scrollClassName = "",
  children,
}: {
  /** Names the region for assistive tech. Needed whenever `focusable` is true. */
  label?: string;
  focusable?: boolean;
  /** Tailwind `from-*` colour matching the surface behind the content. */
  fade?: string;
  className?: string;
  scrollClassName?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft > SLACK;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - SLACK;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  // The observer's first callback is the initial measurement. jsdom has no
  // ResizeObserver unless a test stubs one, hence the guard.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  const fadeBase = `pointer-events-none absolute inset-y-0 w-6 from-30 to-transparent ${fade}`;

  return (
    <div className={`relative flex min-h-0 min-w-0 flex-col ${className}`}>
      <div
        ref={ref}
        onScroll={measure}
        {...(focusable ? { tabIndex: 0, role: "region", "aria-label": label } : {})}
        className={`min-h-0 flex-1 overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${scrollClassName}`}
      >
        {children}
      </div>
      {edges.start && (
        <span aria-hidden data-scroll-fade="start" className={`${fadeBase} left-0 bg-gradient-to-r`} />
      )}
      {edges.end && (
        <span aria-hidden data-scroll-fade="end" className={`${fadeBase} right-0 bg-gradient-to-l`} />
      )}
    </div>
  );
}
