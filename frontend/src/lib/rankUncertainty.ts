/**
 * Bootstrap rank intervals, shared by the API, the dashboard and the MCP
 * server's contract (issues #169 and #192).
 *
 * `hvi_uncertainty.json` (pipeline/uncertainty.py) gives every ward a 95% rank
 * interval from a 1000-replicate bootstrap over the grid cells. A bare "6th of
 * 24" says more than the data supports, so every surface that shows a rank can
 * show its interval from here. The interval covers sampling uncertainty in the
 * cells only; the file's `does_not_capture` says what it leaves out.
 *
 * The file is written by a script outside run_pipeline.py, so it can lag the
 * ward scores. Every consumer treats its absence, or a ward missing from it, as
 * "no interval available" and shows nothing rather than a guess.
 */

export const UNCERTAINTY_URL = "/hvi_uncertainty.json";

export type WardInterval = {
  rank_ci_low: number;
  rank_ci_high: number;
  hvi_ci_low: number | null;
  hvi_ci_high: number | null;
};

export type UncertaintyFile = {
  confidence?: number;
  does_not_capture?: string;
  summary?: { median_rank_interval_width?: number; widest_rank_interval?: number };
  per_ward?: {
    ward_id: string;
    hvi_ci_low?: number | null;
    hvi_ci_high?: number | null;
    rank_ci_low?: number | null;
    rank_ci_high?: number | null;
  }[];
};

/** Intervals keyed by ward id. Wards without a complete rank interval are left out. */
export function indexIntervals(file: UncertaintyFile | null | undefined): Map<string, WardInterval> {
  const out = new Map<string, WardInterval>();
  for (const w of file?.per_ward ?? []) {
    if (typeof w.rank_ci_low !== "number" || typeof w.rank_ci_high !== "number") continue;
    out.set(w.ward_id, {
      rank_ci_low: w.rank_ci_low,
      rank_ci_high: w.rank_ci_high,
      hvi_ci_low: w.hvi_ci_low ?? null,
      hvi_ci_high: w.hvi_ci_high ?? null,
    });
  }
  return out;
}

const ORDINAL_RULES = new Intl.PluralRules("en", { type: "ordinal" });
const ORDINAL_SUFFIX: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

export function ordinal(n: number): string {
  return `${n}${ORDINAL_SUFFIX[ORDINAL_RULES.select(n)]}`;
}

/** "1st to 20th", or just "3rd" when the interval is a single place. */
export function rankRangeLabel(interval: Pick<WardInterval, "rank_ci_low" | "rank_ci_high">): string {
  const { rank_ci_low: low, rank_ci_high: high } = interval;
  return low === high ? ordinal(low) : `${ordinal(low)} to ${ordinal(high)}`;
}

/** How many places the interval spans, counting both ends (3rd to 5th is 3). */
export function intervalWidth(interval: Pick<WardInterval, "rank_ci_low" | "rank_ci_high">): number {
  return interval.rank_ci_high - interval.rank_ci_low + 1;
}

/** True when the two wards' rank intervals share at least one place. */
export function intervalsOverlap(
  a: Pick<WardInterval, "rank_ci_low" | "rank_ci_high">,
  b: Pick<WardInterval, "rank_ci_low" | "rank_ci_high">
): boolean {
  return a.rank_ci_low <= b.rank_ci_high && b.rank_ci_low <= a.rank_ci_high;
}
