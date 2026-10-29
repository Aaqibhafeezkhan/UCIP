import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { FeatureCollection, Geometry } from "geojson";
import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACTIVE_CITY } from "@/lib/city";
import { formatCompositeWindow, formatRunDate, type RunLog } from "@/lib/runLog";
import { hviColor } from "@/lib/hvi";
import type { WardProps } from "@/lib/wardTypes";
import { wardIdFromSlug, wardSlug } from "@/lib/wardSlug";

const wards = JSON.parse(
  readFileSync(join(process.cwd(), "public", "wards_hvi.geojson"), "utf8")
) as FeatureCollection<Geometry, WardProps>;

type WardUncertainty = {
  ward_id: string;
  rank_ci_low: number | null;
  rank_ci_high: number | null;
};

type UncertaintyData = {
  confidence?: number;
  per_ward?: WardUncertainty[];
};

function readOptionalJson<T>(filename: string): T | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "public", filename), "utf8")) as T;
  } catch {
    return null;
  }
}

const uncertainty = readOptionalJson<UncertaintyData>("hvi_uncertainty.json");
const runLog = readOptionalJson<RunLog>("pipeline_run_log.json");

// Slugs, not raw codes: a code with a slash (F/N) cannot be one path segment,
// and building params from raw codes made many cards unreachable.
export function generateStaticParams() {
  return wards.features.map(({ properties }) => ({ wardId: wardSlug(properties.ward_id) }));
}

export const dynamicParams = false;

// Twenty-four near-identical iframe fragments should not compete with the real
// pages in search results, so the cards are kept out of the index.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ wardId: string }>;
}): Promise<Metadata> {
  const { wardId } = await params;
  const id = wardIdFromSlug(wardId);
  return {
    title: `Ward ${id} heat vulnerability | UCIP`,
    description: `Heat vulnerability score and rank for ${ACTIVE_CITY.name} ward ${id}.`,
    robots: { index: false, follow: false },
  };
}

export default async function WardEmbed({ params }: { params: Promise<{ wardId: string }> }) {
  const { wardId } = await params;
  const id = wardIdFromSlug(wardId);
  const ward = wards.features.find(({ properties }) => properties.ward_id === id);
  if (!ward) notFound();
  const { HVI, rank, n_cells, ward_id } = ward.properties;

  const wardUncertainty = uncertainty?.per_ward?.find((item) => item.ward_id === ward_id);
  const rankRange =
    wardUncertainty?.rank_ci_low != null && wardUncertainty.rank_ci_high != null
      ? ` (95% range ${wardUncertainty.rank_ci_low} to ${wardUncertainty.rank_ci_high})`
      : "";
  const compositeWindow = formatCompositeWindow(runLog?.composite_window);
  const refreshedDate = formatRunDate(runLog?.finished_at);
  const dataContext = [
    compositeWindow ? `Data from ${compositeWindow}` : null,
    refreshedDate ? `refreshed ${refreshedDate}` : null,
  ].filter(Boolean);

  return (
    <main className="embed-card">
      <p className="embed-kicker">UCIP · {ACTIVE_CITY.name} heat vulnerability</p>
      <div className="embed-title-row">
        <h1>Ward {ward_id}</h1>
        <span className="embed-score" style={{ background: hviColor(HVI) }}>{HVI?.toFixed(1) ?? "n/a"}</span>
      </div>
      <p>
        Priority {rank ?? "n/a"} of {wards.features.length}{rankRange} · {n_cells ?? "n/a"} grid cells
      </p>
      {dataContext.length > 0 && <p>{dataContext.join(", ")}</p>}
      <Link href={`/dashboard?ward=${encodeURIComponent(ward_id)}`} target="_blank" rel="noopener noreferrer">
        Open full ward brief →
      </Link>
    </main>
  );
}
