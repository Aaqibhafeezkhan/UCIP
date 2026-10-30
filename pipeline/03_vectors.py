"""Stage 03 — Add the population and access layers to the grid.

What it does:
    Adds the three human-exposure indicators the satellite layers cannot see, one
    value per cell:
      - pop_density_km2, from WorldPop's 100 m population raster via Earth Engine.
      - slum_pct, the share of each cell covered by mapped Datameet slum-cluster
        polygons. These are real observed boundaries, which is why they were
        chosen over the modelled GHS-SMOD proxy originally planned.
      - hospital_dist_m, straight-line distance from the cell centroid to the
        nearest OpenStreetMap hospital, pulled with osmnx.

    There is no elderly share. WorldPop's India age-sex product applies district
    age structure to a population raster, so across the Mumbai grid it carried
    two meaningful values, one per revenue district. That is a district dummy,
    not a ward measurement, and it was removed rather than published (issue
    #167). The one age indicator that survives is the Census 2011 0-6 share,
    joined per ward in stage 04.

Inputs:
    ../data/grid_1km_gee.geojson    the grid from stage 02
    ../data/bmc_wards.geojson       ward boundaries
    ../data/slumClusters.geojson    mapped slum-cluster polygons (Datameet)
    Google Earth Engine             WorldPop population raster (needs auth)
    OpenStreetMap                   hospital locations, via osmnx (network call)

Outputs:
    ../data/grid_1km_vectors.geojson    the grid plus pop_density_km2,
                                        slum_pct, hospital_dist_m

Notes:
    WORLDPOP_YEAR is pinned rather than left on .first(). An unpinned call would
    silently re-target a different vintage the moment WorldPop publishes a newer
    India image, changing published figures with no code change to notice.

    hospital_dist_m is Euclidean, not network distance. A river or a rail line
    between a cell and its nearest hospital is not accounted for; stated as a
    limitation in the methodology rather than modelled.

See docs/methodology.md sections 3 and 10.

Run:
    .venv\\Scripts\\activate
    python 03_vectors.py
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import geopandas as gpd

# ee and osmnx are imported where they are used, not here, so the local geometry
# work below (compute_slum_pct, compute_hospital_distance) can be imported and
# tested without Earth Engine or osmnx installed (issue #207).
import _provenance
from _gee_auth import init_ee, resolve_project
from _city import load_city

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_CITY = load_city()
WARDS_PATH = _CITY.boundaries_path
# From the city config's "slums" block (issue #201). None for a city with no
# mapped layer, which is the normal case for any city but Mumbai; see the "Known
# limits" section of docs/adding-a-city.md.
SLUMS_PATH = _CITY.slums_path
# Derived from the config for the same reason as stage 02. This stage already
# read _CITY for its boundaries and projection while writing to the default
# city's hardcoded paths, so a Pune run pulled Pune's wards and then wrote the
# result over Mumbai's grid.
GRID_PATH = _CITY.grid_path("_gee")
OUT_PATH = _CITY.grid_path("_vectors")

GEE_PROJECT = resolve_project()
UTM_CRS = _CITY.projected_crs
WGS84 = "EPSG:4326"

# Most recent year WorldPop's population collection publishes for India (verified live
# 2026-07-21: only one India image exists, system:index "IND_2020"). Pinned explicitly
# rather than left on .first() — an unpinned call would silently re-target a different
# vintage the moment WorldPop adds a newer India image, with no code change to notice.
WORLDPOP_YEAR = "2020"

# Share of grid cells that must receive a WorldPop value for the stage to pass.
MIN_POP_COVERAGE = 0.9

# Public Overpass instances, tried in order. The main one returns 502 under load
# often enough to have failed a scheduled refresh on its own (2026-10-17).
OVERPASS_URLS = [
    "https://overpass-api.de/api",
    "https://overpass.kumi.systems/api",
    "https://overpass-api.de/api",
]
OVERPASS_RETRY_WAIT_S = 20


def load_grid_fc(path: Path) -> ee.FeatureCollection:
    import ee

    with open(path, encoding="utf-8") as f:
        gj = json.load(f)
    features = [ee.Feature(ee.Geometry(f["geometry"]), {"grid_id": f["properties"]["grid_id"]}) for f in gj["features"]]
    return ee.FeatureCollection(features)


def pull_worldpop(grid_fc: ee.FeatureCollection) -> dict:
    """Total population per cell, via GEE reduceRegions(sum)."""
    import ee

    img = (
        ee.ImageCollection("WorldPop/GP/100m/pop_age_sex")
        .filterBounds(grid_fc)
        .filter(ee.Filter.eq("system:index", f"IND_{WORLDPOP_YEAR}"))
        .first()
    )
    band_names = img.bandNames().getInfo()

    total_pop = img.select(band_names).reduce(ee.Reducer.sum()).rename("total_pop")
    # setOutputs is not optional. reduceRegions names its output after the band
    # only when the image has more than one band; with a single band it uses the
    # reducer's own name, "sum". Removing the elderly band (#167) left one band,
    # every lookup of "total_pop" below came back None, and the scheduled
    # refresh dropped all 547 cells (#171).
    zonal = total_pop.reduceRegions(
        collection=grid_fc,
        reducer=ee.Reducer.sum().setOutputs(["total_pop"]),
        scale=100,
    )
    result = zonal.getInfo()

    out = {}
    for feat in result["features"]:
        p = feat["properties"]
        out[p["grid_id"]] = {"total_pop": p.get("total_pop")}
    return out


def compute_slum_pct(
    grid_gdf: gpd.GeoDataFrame,
    slums_path: Path | None = SLUMS_PATH,
    utm_crs: str = UTM_CRS,
) -> dict:
    """Percent of each cell covered by mapped slum clusters.

    With no layer, every cell is None, not 0.0 (issue #201). "0% slum cover" and
    "no slum data for this city" are different statements, and a zero here was
    published through /cells and /export as a measurement that the quality gate
    could not tell from a real one. The column is context only, so scores are
    unaffected either way.
    """
    if slums_path is None:
        print("[WARN] no slum layer configured for this city; slum_pct will be null for all cells.")
        return {gid: None for gid in grid_gdf["grid_id"]}
    if not Path(slums_path).exists():
        # Configured but absent is a broken checkout, not a city without a layer.
        # Writing null here would pass the gate (the column is optional) and
        # publish "no data" for a city that has data.
        raise FileNotFoundError(
            f"the city config declares a slum layer at {slums_path}, but the file is missing"
        )

    slums = gpd.read_file(slums_path)
    if slums.crs is None:
        slums = slums.set_crs(WGS84)
    slums_utm = slums.to_crs(utm_crs)
    slums_utm["geometry"] = slums_utm.geometry.buffer(0)  # fix invalid ring topology
    slums_utm = slums_utm[slums_utm.geometry.is_valid & ~slums_utm.geometry.is_empty]

    grid_utm = grid_gdf[["grid_id", "geometry"]].to_crs(utm_crs).copy()
    grid_utm["cell_area"] = grid_utm.geometry.area

    inter = gpd.overlay(grid_utm, slums_utm[["geometry"]], how="intersection")
    inter["piece_area"] = inter.geometry.area
    slum_area_by_id = inter.groupby("grid_id")["piece_area"].sum()

    grid_utm["slum_area"] = grid_utm["grid_id"].map(slum_area_by_id).fillna(0.0)
    grid_utm["slum_pct"] = (grid_utm["slum_area"] / grid_utm["cell_area"] * 100).clip(upper=100)
    return dict(zip(grid_utm["grid_id"], grid_utm["slum_pct"]))


def fetch_hospitals(ward_union_wgs84):
    """OSM hospitals inside the polygon, retrying across Overpass instances.

    None when every endpoint failed. Split out so tests can stub the one network
    call and exercise the distance arithmetic around it.
    """
    import osmnx as ox

    for attempt, url in enumerate(OVERPASS_URLS, start=1):
        ox.settings.overpass_url = url
        try:
            return ox.features_from_polygon(ward_union_wgs84, tags={"amenity": "hospital"})
        except Exception as exc:
            print(f"[WARN] OSM hospital query {attempt}/{len(OVERPASS_URLS)} failed at {url} ({exc})")
            if attempt < len(OVERPASS_URLS):
                time.sleep(OVERPASS_RETRY_WAIT_S)
    return None


def compute_hospital_distance(
    grid_gdf: gpd.GeoDataFrame, wards_path: Path, utm_crs: str = UTM_CRS
) -> dict:
    wards = gpd.read_file(wards_path)
    if wards.crs is None:
        wards = wards.set_crs(WGS84)
    ward_union_wgs84 = wards.union_all()

    hospitals = fetch_hospitals(ward_union_wgs84)
    if hospitals is None:
        print("[WARN] every Overpass endpoint failed; hospital_dist will be null for all cells.")
        return {gid: None for gid in grid_gdf["grid_id"]}

    if hospitals.empty:
        print("[WARN] no OSM hospitals returned; hospital_dist will be null for all cells.")
        return {gid: None for gid in grid_gdf["grid_id"]}

    hospitals_utm = hospitals.set_crs(WGS84, allow_override=True).to_crs(utm_crs)
    hospitals_utm = hospitals_utm.set_geometry(hospitals_utm.geometry.centroid)
    hosp_union = hospitals_utm.geometry.union_all()
    print(f"[ok] {len(hospitals_utm)} OSM hospitals found")

    grid_utm = grid_gdf.to_crs(utm_crs)
    centroids = grid_utm.geometry.centroid
    dists = centroids.distance(hosp_union)
    return dict(zip(grid_gdf["grid_id"], dists))


def main() -> int:
    if not GRID_PATH.exists():
        print(f"[FAIL] {GRID_PATH} not found — run 02_gee_layers.py first.")
        return 1

    grid_gdf = gpd.read_file(GRID_PATH)
    print(f"[ok] loaded {len(grid_gdf)} grid cells")

    init_ee(GEE_PROJECT)
    print(f"[ok] Earth Engine initialized (project={GEE_PROJECT})")
    grid_fc = load_grid_fc(GRID_PATH)

    print("[..] pulling WorldPop total population per cell")
    pop_by_id = pull_worldpop(grid_fc)

    print("[..] computing slum_pct from mapped slum-cluster polygons")
    slum_by_id = compute_slum_pct(grid_gdf)
    # Why the column may be null, kept with the run so a null slum_pct is
    # explained rather than guessed at (issue #201).
    _provenance.record(
        "03",
        slum_layer=SLUMS_PATH.name if SLUMS_PATH is not None else None,
        slum_pct_unavailable_reason=(
            None if SLUMS_PATH is not None
            else "no slum layer configured for this city; slum_pct is null, not 0"
        ),
    )

    print("[..] querying OSM hospitals + computing per-cell distance")
    hosp_by_id = compute_hospital_distance(grid_gdf, WARDS_PATH)

    area_km2_by_id = dict(zip(grid_gdf["grid_id"], grid_gdf.to_crs(UTM_CRS).geometry.area / 1_000_000))

    pop_density, matched = [], 0
    for gid in grid_gdf["grid_id"]:
        pop = pop_by_id.get(gid, {})
        total_pop, area_km2 = pop.get("total_pop"), area_km2_by_id.get(gid)
        pop_density.append(total_pop / area_km2 if total_pop is not None and area_km2 else None)
        if total_pop is not None:
            matched += 1

    grid_gdf["pop_density_km2"] = pop_density
    grid_gdf["slum_pct"] = grid_gdf["grid_id"].map(slum_by_id)
    grid_gdf["hospital_dist_m"] = grid_gdf["grid_id"].map(hosp_by_id)

    # Population is a required indicator, so missing coverage is a failure, not a
    # warning, and it is caught before the output is written. A warning here let
    # #171 run on: stage 04 then dropped every cell and PCA crashed two stages
    # later, far from the cause.
    if matched < MIN_POP_COVERAGE * len(grid_gdf):
        print(f"[FAIL] only {matched}/{len(grid_gdf)} cells got WorldPop data "
              f"(need {MIN_POP_COVERAGE:.0%}); not writing {OUT_PATH.name}")
        return 1
    # Hospital distance is required too. A null for every cell means the OSM
    # query failed, not that Mumbai has no hospitals.
    hosp_matched = int(grid_gdf["hospital_dist_m"].notna().sum())
    if hosp_matched < MIN_POP_COVERAGE * len(grid_gdf):
        print(f"[FAIL] only {hosp_matched}/{len(grid_gdf)} cells got a hospital distance; "
              f"not writing {OUT_PATH.name}")
        return 1

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    grid_gdf.to_file(OUT_PATH, driver="GeoJSON")
    print(f"[ok] wrote {len(grid_gdf)} cells ({matched} with pop data) -> {OUT_PATH}")

    # ------------------------------------------------------- sanity checks --
    ok = True
    slum_known = grid_gdf["slum_pct"].dropna()
    mean_slum = f"{slum_known.mean():.2f}" if len(slum_known) else "n/a (no layer)"
    print(f"\nmean slum_pct={mean_slum}, "
          f"hospital_dist non-null={grid_gdf['hospital_dist_m'].notna().sum()}/{len(grid_gdf)}")
    print("GO" if ok else "CHECK WARNINGS")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
