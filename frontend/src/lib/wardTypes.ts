/**
 * Ward record shapes, in one place.
 *
 * Previously duplicated (and already drifting) between WardChoropleth.tsx and
 * WardPanel.tsx: one carried the contrib_* fields, the other did not, and their
 * two NbsRec types disagreed about `cell_count`. The ward dialog is the third
 * consumer, so they live here now.
 */

/** A feature property bag from `public/wards_hvi.geojson`, written by pipeline/05_hvi.py. */
export type WardProps = {
  ward_id: string;
  ward_gid: number;
  HVI: number | null;
  rank: number | null;
  n_cells: number | null;
  contrib_LST_C: number | null;
  contrib_NDVI: number | null;
  contrib_pop_density_km2: number | null;
  contrib_hospital_dist_m: number | null;
  contrib_impervious_pct: number | null;
  /** Indicator with the largest absolute contribution to this ward's score. */
  dominant_factor?: string | null;
  /** Its share of total absolute contribution, 0 to 1. An even spread across the five is 0.2. */
  dominant_share?: number | null;
  /** True when one indicator accounts for half or more of the movement in the score. */
  single_factor_dominated?: boolean | null;
  [key: string]: unknown;
};

/** A row of `public/nbs_recommendations.json`, written by pipeline/06_nbs.py. */
export type NbsRec = {
  ward_id: string;
  intervention: string;
  rationale: string;
  citation: string;
  priority: number;
  cell_count: number;
};

/** A 1 km grid cell on the plantability layer (`public/cells_nbs.geojson`). */
export type CellNbsProps = {
  grid_id: number;
  ward_id: string;
  HVI: number | null;
  plantable: boolean | number | null;
  worldcover_class: number | null;
  /** Fraction of the cell's pixels in worldcover_class, 0 to 1 (issue #168). */
  worldcover_share?: number | null;
  worldcover_mixed?: boolean | null;
  [key: string]: unknown;
};

/** A 1 km grid cell on the green-cover-change layer (`public/cells_ndvi_change.geojson`). */
export type CellNdviProps = {
  grid_id: number;
  ward_id: string;
  NDVI: number | null;
  NDVI_prev: number | null;
  ndvi_delta: number | null;
  change_class: "gained" | "stable" | "lost" | "unknown" | null;
  [key: string]: unknown;
};

/**
 * The five scored HVI indicators, in the canonical order of
 * pipeline/_indicators.py. All five come from free, open, global data that is
 * easy to re-pull: Landsat 8/9 (LST, NDVI), WorldPop, OpenStreetMap and ESA
 * WorldCover.
 *
 * The slum share and the Census 2011 under-7 share are no longer scored
 * (2026-10-17). They are still published per cell as context.
 */
export const INDICATOR_KEYS = [
  "LST_C",
  "NDVI",
  "pop_density_km2",
  "hospital_dist_m",
  "impervious_pct",
] as const;

export type IndicatorKey = (typeof INDICATOR_KEYS)[number];

/** Plain-language labels for the factors, shared by the bars and the table. */
export const FACTOR_LABELS: Record<IndicatorKey, string> = {
  LST_C: "Land surface temp",
  NDVI: "Green cover (NDVI)",
  pop_density_km2: "Population density",
  hospital_dist_m: "Hospital distance",
  impervious_pct: "Impervious / built-up",
};

/** Contribution values (weight x z-score) mostly fall in [-0.3, 0.3]. */
export const CONTRIB_BAR_MAX = 0.3;
