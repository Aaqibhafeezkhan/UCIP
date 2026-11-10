"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useMediaQuery } from "@/lib/useMediaQuery";

const WIDE_QUERY = "(min-width: 768px)";

/** Whether the element with this id is the step's card or inside it. */
function insideStep(el: HTMLElement, id: string): boolean {
  const target = document.getElementById(id);
  return !!target && !!el.parentElement?.contains(target);
}

/** An id from a hash or an in-page href. A malformed escape such as "#100%"
 *  makes decodeURIComponent throw, so it falls back to the raw text. */
function decodeId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** The current URL hash as an element id, or null when there is none. */
function hashId(): string | null {
  return window.location.hash ? decodeId(window.location.hash.slice(1)) : null;
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
  const wide = useMediaQuery(WIDE_QUERY);
  const settled = useRef(false);

  // Before paint, so a phone never shows the step open for a frame. Closing it
  // moves everything below it up, so when the page opened on an anchor that
  // anchor is scrolled to again; browsers without scroll anchoring (iOS Safari)
  // would otherwise be left mispositioned by the height of the folded step.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `wide` is still false while hydrating, whatever the screen, so ask the screen.
    if (wide || window.matchMedia(WIDE_QUERY).matches) {
      el.open = true;
    } else if (!settled.current) {
      const id = hashId();
      const keep = id !== null && insideStep(el, id);
      const closing = el.open && !keep;
      el.open = keep;
      if (closing && id) document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
    }
    settled.current = true;
  }, [wide]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A chip or link to this step must not land on a closed one. The click is
    // handled as well as the hash change: following a link to the hash the URL
    // already has changes nothing, so no hashchange fires.
    const open = (id: string | null) => {
      if (id && insideStep(el, id)) el.open = true;
    };
    const onHash = () => open(hashId());
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      const href = link?.getAttribute("href");
      if (href && href.length > 1) open(decodeId(href.slice(1)));
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
    document.addEventListener("click", onClick);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
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
