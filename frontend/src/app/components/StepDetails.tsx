"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useMediaQuery } from "@/lib/useMediaQuery";

/** Whether the URL hash names `el`'s step (its parent card) or something inside it. */
function hashTargets(el: HTMLElement): boolean {
  if (!window.location.hash) return false;
  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  return !!target && !!el.parentElement?.contains(target);
}

/**
 * A methodology step that folds away on phones and stays open from `md` up.
 *
 * It is one native `<details>` rather than two copies of the content. Server
 * rendered open, so without JavaScript (and in print) every step reads in full;
 * once mounted, a phone closes it unless the URL points at it or inside it. From
 * `md` up it is held open and its summary stops acting like a button.
 */
export default function StepDetails({
  summary,
  children,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const wide = useMediaQuery("(min-width: 768px)");
  const settled = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (wide) el.open = true;
    else if (!settled.current) el.open = hashTargets(el);
    settled.current = true;
  }, [wide]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A chip or link to this step must not land on a closed one.
    const onHash = () => {
      if (hashTargets(el)) el.open = true;
    };
    // Every step prints open, whatever state the reader left it in.
    let wasOpen = el.open;
    const beforePrint = () => {
      wasOpen = el.open;
      el.open = true;
    };
    const afterPrint = () => {
      el.open = wasOpen;
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  return (
    <details
      ref={ref}
      open
      // Closing it from the keyboard on a wide screen would leave a step shut
      // with no visible way back.
      onToggle={() => {
        if (wide && ref.current) ref.current.open = true;
      }}
      className="group"
    >
      <summary
        tabIndex={wide ? -1 : undefined}
        className="flex cursor-pointer list-none items-start justify-between gap-3 max-md:min-h-11 md:pointer-events-none md:cursor-auto [&::-webkit-details-marker]:hidden"
      >
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown
          className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 md:hidden"
          aria-hidden
        />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
