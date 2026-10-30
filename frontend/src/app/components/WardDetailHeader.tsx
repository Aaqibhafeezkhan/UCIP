"use client";

import { Check, Code2, Printer, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { hviColor } from "@/lib/hvi";
import { FACTOR_LABELS, INDICATOR_KEYS, type WardProps } from "@/lib/wardTypes";
import { intervalWidth, rankRangeLabel, type WardInterval } from "@/lib/rankUncertainty";
import { wardSlug } from "@/lib/wardSlug";

/**
 * The identity strip at the top of a ward surface: rank badge, ward code, HVI,
 * and the priority line, with a close control on the right.
 *
 * Shared so the sidebar detail view and the fullscreen/mobile dialog present a
 * selected ward identically; only their containers differ.
 */
export default function WardDetailHeader({
  ward,
  totalWards,
  onClose,
  titleId,
  interval,
}: {
  ward: WardProps;
  totalWards: number;
  onClose: () => void;
  /** Set when the header's title doubles as a dialog's accessible name. */
  titleId?: string;
  /** The ward's 95% rank interval, when the uncertainty file has one (issue #169). */
  interval?: WardInterval;
}) {
  const [copied, setCopied] = useState(false);

  async function copyEmbed() {
    const src = `${window.location.origin}/embed/ward/${wardSlug(ward.ward_id)}`;
    try {
      await navigator.clipboard.writeText(`<iframe src="${src}" title="UCIP Ward ${ward.ward_id}" width="100%" height="250" loading="lazy"></iframe>`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The URL remains directly accessible when clipboard permission is denied.
    }
  }

  return (
    <div className="shrink-0 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge
          className="h-7 w-7 shrink-0 justify-center rounded-full p-0 text-xs font-semibold text-black/80"
          style={{ background: hviColor(ward.HVI) }}
        >
          {ward.rank}
        </Badge>
        <span id={titleId} className="text-base font-semibold text-foreground">
          Ward {ward.ward_id}
        </span>
        {ward.HVI !== null && (
          <span className="ml-auto font-mono text-sm text-muted-foreground">
            HVI {ward.HVI.toFixed(1)}
          </span>
        )}
        <button
          onClick={copyEmbed}
          aria-label={`Copy embed code for ward ${ward.ward_id}`}
          title="Copy embed code"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground print:hidden"
        >
          {copied ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
        </button>
        <button
          onClick={() => window.print()}
          aria-label={`Print ward ${ward.ward_id} brief`}
          title="Print ward brief"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground print:hidden"
        >
          <Printer className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          aria-label="Close ward details"
          className="-mr-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring print:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Priority {ward.rank} of {totalWards} &middot; {ward.n_cells ?? "n/a"} grid cells
      </p>
      {interval && (
        <p className="mt-1 text-xs text-muted-foreground">
          Rank is uncertain: likely {rankRangeLabel(interval)} (95% range, {intervalWidth(interval)} places
          wide). Based on sampling of grid cells only.
        </p>
      )}
      {ward.single_factor_dominated && ward.dominant_factor && (
        <p className="mt-1 text-xs text-muted-foreground">
          Mostly driven by one measure:{" "}
          {FACTOR_LABELS[ward.dominant_factor as (typeof INDICATOR_KEYS)[number]] ?? ward.dominant_factor}
          {typeof ward.dominant_share === "number"
            ? ` (${Math.round(ward.dominant_share * 100)}% of the score's movement)`
            : ""}
          .
        </p>
      )}
    </div>
  );
}
