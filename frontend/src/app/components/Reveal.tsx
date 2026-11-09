"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-in reveal. IntersectionObserver flips an opacity/translate transition
 * once the element enters view. The global `prefers-reduced-motion` rule in
 * globals.css neutralizes the transition duration, so reduced-motion users get
 * the same content with no movement.
 *
 * Fires on any overlap (`threshold: 0`) rather than a fraction of the element:
 * 15 percent of a section that is taller than the phone screen stays hidden
 * long after its top has scrolled into view. The bottom margin keeps the
 * reveal from happening off the edge of the screen. Without an observer the
 * content is simply shown, and print shows it too (see globals.css).
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
    if (typeof IntersectionObserver === "undefined") {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setShown(true);
      });
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
