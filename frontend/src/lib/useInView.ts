"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Whether any part of the element is on screen. True until the browser says
 * otherwise, and always true where IntersectionObserver does not exist, so a
 * browser without it keeps whatever the element did before.
 */
export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const latest = entries[entries.length - 1];
      if (latest) setInView(latest.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}
