"use client";

import { useEffect, useRef, useState } from "react";

/** How long a silent observer gets before the content is shown anyway. */
const FAILSAFE_MS = 1500;

/**
 * Scroll-in reveal. IntersectionObserver flips an opacity/translate transition
 * once the element enters view. The global `prefers-reduced-motion` rule in
 * globals.css neutralizes the transition duration, so reduced-motion users get
 * the same content with no movement.
 *
 * Fires on any overlap (`threshold: 0`) rather than a fraction of the element:
 * 15 percent of a section that is taller than the phone screen stays hidden
 * long after its top has scrolled into view. The bottom margin keeps the
 * reveal from happening off the edge of the screen. Without an observer, or
 * with one that never reports, the content is simply shown; so is it without
 * JavaScript (a noscript rule in the root layout) and in print (globals.css).
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const show = () => {
      if (!cancelled) setShown(true);
    };
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(show);
      return () => {
        cancelled = true;
      };
    }
    // An observer reports once as soon as it starts watching, so silence past
    // the grace period means it is not working, and the content is shown rather
    // than left invisible. A working observer is left to reveal on scroll.
    let reported = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        reported = true;
        if (entry.isIntersecting) {
          show();
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    const failsafe = window.setTimeout(() => {
      if (!reported) show();
    }, FAILSAFE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={shown ? "shown" : "hidden"}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
