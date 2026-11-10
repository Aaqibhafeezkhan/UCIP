"use client";

import { useMediaQuery } from "@/lib/useMediaQuery";

/**
 * The name card over a hovered or tapped ward in the hero. A touch screen has no
 * hover, so there the hint says "Tap". The card only exists once a ward is
 * hovered, which is always after mount, so the media query being false on the
 * server never shows up as a hydration mismatch.
 */
export default function HeroCityTooltip({
  wardId,
  areas,
  x,
  y,
}: {
  wardId: string;
  areas: string[];
  x: number;
  y: number;
}) {
  const touch = useMediaQuery("(hover: none)");

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 max-w-[17rem] -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-background/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
      style={{ left: x, top: y - 12 }}
    >
      <p className="text-xs font-semibold text-foreground">Ward {wardId}</p>
      <p className="text-[11px] text-brand-teal max-md:text-xs">
        {`${touch ? "Tap" : "Click"} to open in dashboard`}
      </p>
      {areas.length > 0 && (
        <p className="mt-0.5 max-w-[15rem] text-[11px] leading-snug max-md:text-xs text-muted-foreground">
          {areas.join(", ")}
        </p>
      )}
    </div>
  );
}
