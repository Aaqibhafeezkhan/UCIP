"""Stage 01's cell numbering (issue #217).

Skipped without geopandas, like test_boundaries.py. The failure being pinned:
189 of Mumbai's cells are full 1 km squares with exactly equal areas, and ids
taken from an area sort gave tied rows an order that depended on the platform.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

gpd = pytest.importorskip("geopandas", reason="geopandas is not installed in CI")
from shapely.geometry import box  # noqa: E402

PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR))

UTM = "EPSG:32643"


@pytest.fixture(scope="module")
def grid_stage():
    spec = importlib.util.spec_from_file_location("stage01_grid", PIPELINE_DIR / "01_grid.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fragments():
    """Six fragments: five tied full squares and a ward-border cell split in two."""
    rows = []
    for idx in range(5):
        rows.append({"cell_idx": idx, "ward_id": "A", "ward_gid": 1,
                     "geometry": box(500000 + idx * 1000, 2100000, 501000 + idx * 1000, 2101000)})
    # cell 5 is split by a ward border into a larger and a smaller fragment.
    rows.append({"cell_idx": 5, "ward_id": "A", "ward_gid": 1, "geometry": box(505000, 2100000, 505700, 2101000)})
    rows.append({"cell_idx": 5, "ward_id": "B", "ward_gid": 2, "geometry": box(505700, 2100000, 506000, 2101000)})
    frame = gpd.GeoDataFrame(rows, geometry="geometry", crs=UTM)
    frame["area_m2"] = frame.geometry.area
    return frame


def ids_by_location(frame):
    return {(round(g.centroid.x), round(g.centroid.y)): gid for g, gid in zip(frame.geometry, frame["grid_id"])}


def test_tied_areas_get_the_same_ids_whatever_order_they_arrive_in(grid_stage):
    base = fragments()
    forward = grid_stage.assign_grid_ids(base.copy())
    reverse = grid_stage.assign_grid_ids(base.iloc[::-1].reset_index(drop=True))
    shuffled = grid_stage.assign_grid_ids(base.sample(frac=1, random_state=7).reset_index(drop=True))
    assert ids_by_location(forward) == ids_by_location(reverse) == ids_by_location(shuffled)


def test_ids_follow_fishnet_order_and_are_contiguous(grid_stage):
    out = grid_stage.assign_grid_ids(fragments().iloc[::-1].reset_index(drop=True))
    assert list(out["grid_id"]) == [f"cell_{i:04d}" for i in range(6)]
    assert list(out["cell_idx"]) == sorted(out["cell_idx"])


def test_the_larger_fragment_of_a_split_cell_wins(grid_stage):
    out = grid_stage.assign_grid_ids(fragments())
    split = out[out["cell_idx"] == 5].iloc[0]
    assert split["ward_id"] == "A"
    assert len(out) == 6
