"""Stages 01, 04, 05 and 06 end to end on a tiny fixture city (issue #207).

Until now CI installed no geopandas, so the stages that decide the published
numbers ran only in the live refresh against Earth Engine, and a regression
showed up as a failed Tuesday run rather than a failed pull request. The #171
failure (a column that came back None, so stage 04 dropped every cell and PCA
crashed two stages later) was in code CI did not execute.

Here the stages run for real on three wards and fifteen cells in a temp
directory. What stands in for the outside world sits at the function boundary:
the values stages 02 and 03 would pull are written straight into the grid, and
06's Earth Engine call is replaced by a table of pixel counts. No credentials,
no network.

Skipped without geopandas, like test_boundaries.py.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

gpd = pytest.importorskip("geopandas", reason="geopandas is not installed in CI")
pytest.importorskip("sklearn", reason="scikit-learn is not installed in CI")
pytest.importorskip("shapely", reason="shapely is not installed in CI")
from shapely.geometry import box  # noqa: E402

PIPELINE_DIR = Path(__file__).resolve().parent.parent
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "fixture_city"
sys.path.insert(0, str(PIPELINE_DIR))

import _city  # noqa: E402
import _provenance  # noqa: E402

UTM = "EPSG:32643"
N_CELLS = 15


def load_stage(filename: str):
    """A fresh copy of a stage module, so its module-level config is re-read."""
    spec = importlib.util.spec_from_file_location(
        "stage_" + filename.replace(".py", ""), PIPELINE_DIR / filename
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_json(name: str):
    return json.loads((FIXTURE / name).read_text(encoding="utf-8"))


@pytest.fixture
def city(tmp_path, monkeypatch):
    """The fixture city, with config and data redirected into a temp directory."""
    config_dir, data_dir = tmp_path / "config" / "cities", tmp_path / "data"
    config_dir.mkdir(parents=True)
    data_dir.mkdir()
    (config_dir / "fixture.json").write_text((FIXTURE / "city.json").read_text(encoding="utf-8"))

    wards = read_json("wards.json")
    frame = gpd.GeoDataFrame(
        {"name": list(wards), "gid": range(1, len(wards) + 1)},
        geometry=[box(*b) for b in wards.values()],
        crs=UTM,
    ).to_crs("EPSG:4326")
    frame.to_file(data_dir / "fixture_wards.geojson", driver="GeoJSON")

    monkeypatch.setattr(_city, "CONFIG_DIR", config_dir)
    monkeypatch.setattr(_city, "DATA_DIR", data_dir)
    monkeypatch.setattr(_provenance, "PROVENANCE_DIR", tmp_path / "provenance")
    monkeypatch.setenv("UCIP_CITY", "fixture")
    monkeypatch.delenv("UCIP_CELL_SIZE_M", raising=False)
    monkeypatch.setattr(sys, "argv", ["stage"])
    return _city.load_city("fixture")


def run_grid(city):
    """Stage 01, for real."""
    stage = load_stage("01_grid.py")
    assert stage.main() in (0, 2)
    return gpd.read_file(city.grid_path())


def write_vectors(city, grid, overrides=None):
    """What stages 02 and 03 would have produced: the grid plus indicator values."""
    values = read_json("indicators.json")
    grid = grid.copy()
    for column in ("LST_C", "NDVI", "NDVI_prev", "pop_density_km2", "slum_pct",
                   "hospital_dist_m", "impervious_pct"):
        grid[column] = grid["grid_id"].map(lambda g, c=column: values[g][c])
    for column, value in (overrides or {}).items():
        grid[column] = value
    grid.to_file(city.grid_path("_vectors"), driver="GeoJSON")
    return grid


def run_through_05(city):
    grid = run_grid(city)
    write_vectors(city, grid)
    assert load_stage("04_zonal.py").main() in (0, 2)  # 2: a real run has 24 wards, not 3
    assert load_stage("05_hvi.py").main() in (0, 2)  # 2: only 3 of the 24 wards a real run has
    return grid


# --- stage 01 ---

def test_stage_01_builds_the_expected_grid(city):
    grid = run_grid(city)
    assert len(grid) == N_CELLS
    assert set(grid["ward_id"]) == {"A", "B", "C"}
    assert grid["ward_id"].value_counts().to_dict() == {"A": 6, "B": 6, "C": 3}
    assert list(grid["grid_id"]) == [f"cell_{i:04d}" for i in range(N_CELLS)]


def test_stage_01_ids_survive_shuffled_ward_rows(city):
    """Six cells here are full 1 km squares, so their areas tie (the #217 setup)."""
    first = run_grid(city)
    wards_path = city.boundaries_path
    wards = gpd.read_file(wards_path).iloc[::-1].reset_index(drop=True)
    wards.to_file(wards_path, driver="GeoJSON")
    second = run_grid(city)

    def by_location(frame):
        return {(round(g.centroid.x, 4), round(g.centroid.y, 4)): i
                for g, i in zip(frame.geometry, frame["grid_id"])}

    assert by_location(first) == by_location(second)


# --- stage 04 ---

def test_stage_04_keeps_every_populated_cell(city):
    write_vectors(city, run_grid(city))
    assert load_stage("04_zonal.py").main() in (0, 2)  # 2: a real run has 24 wards, not 3
    cells = gpd.read_file(city.out("cells.geojson"))
    assert len(cells) == N_CELLS
    assert cells["pop_density_km2"].notna().all()


def test_stage_04_refuses_a_run_where_population_came_back_none(city):
    """The #171 failure: every cell's population None, so every cell dropped.

    It must fail here, at its cause, and leave any previous cells.geojson alone
    rather than write an empty file for stage 05 to crash on.
    """
    write_vectors(city, run_grid(city), overrides={"pop_density_km2": None})
    stage = load_stage("04_zonal.py")
    assert stage.main() == 1
    assert not city.out("cells.geojson").exists()


def test_stage_04_excludes_unpopulated_cells_on_purpose(city):
    grid = write_vectors(city, run_grid(city))
    grid.loc[grid["grid_id"] == "cell_0014", "pop_density_km2"] = 0.0
    grid.to_file(city.grid_path("_vectors"), driver="GeoJSON")
    assert load_stage("04_zonal.py").main() in (0, 2)  # 2: a real run has 24 wards, not 3
    cells = gpd.read_file(city.out("cells.geojson"))
    assert len(cells) == N_CELLS - 1
    assert "cell_0014" not in set(cells["grid_id"])


# --- stage 05 ---

def test_stage_05_ranks_the_wards_as_the_fixture_is_built(city):
    run_through_05(city)
    wards = gpd.read_file(city.out("wards_hvi.geojson")).set_index("ward_id")
    assert wards.loc["C", "rank"] == 1
    assert wards.loc["A", "rank"] == 2
    assert wards.loc["B", "rank"] == 3
    assert wards.loc["C", "HVI"] > wards.loc["A", "HVI"] > wards.loc["B", "HVI"]
    assert wards["n_cells"].to_dict() == {"A": 6, "B": 6, "C": 3}


def test_stage_05_scores_stay_on_the_0_to_100_scale(city):
    run_through_05(city)
    cells = gpd.read_file(city.out("cells_hvi.geojson"))
    assert cells["HVI"].min() == pytest.approx(0.0, abs=1e-6)
    assert cells["HVI"].max() == pytest.approx(100.0, abs=1e-6)
    method = json.loads(city.out("hvi_pca_log.json").read_text(encoding="utf-8"))
    assert sum(method["weights"].values()) == pytest.approx(1.0)


def test_stage_05_carries_the_dominance_fields(city):
    run_through_05(city)
    wards = gpd.read_file(city.out("wards_hvi.geojson"))
    assert {"dominant_factor", "dominant_share", "single_factor_dominated"} <= set(wards.columns)


# --- stage 06 ---

def run_stage_06(city, histograms=None):
    stage = load_stage("06_nbs.py")
    table = histograms if histograms is not None else read_json("landcover.json")
    stage.pull_landcover_and_flood_proxy = lambda gdf: (
        {g: table.get(g) for g in gdf["grid_id"]},
        {g: 250.0 for g in gdf["grid_id"]},
    )
    assert stage.main() in (0, 2)
    return gpd.read_file(city.out("cells_nbs.geojson")).set_index("grid_id")


def test_stage_06_plantable_follows_the_land_cover(city):
    run_through_05(city)
    cells = run_stage_06(city)
    assert bool(cells.loc["cell_0001", "plantable"]) is True    # 80% tree cover, low impervious
    assert bool(cells.loc["cell_0000", "plantable"]) is False   # 88% built-up
    assert cells.loc["cell_0000", "worldcover_class"] == 50
    assert cells.loc["cell_0001", "worldcover_class"] == 10


def test_stage_06_records_the_share_and_flags_mixed_cells(city):
    run_through_05(city)
    cells = run_stage_06(city)
    a_cells = [g for g in cells.index if cells.loc[g, "ward_id"] == "A"]

    near_tie, three_way = cells.loc[a_cells[2]], cells.loc[a_cells[3]]
    assert near_tie["worldcover_class"] == 50 and near_tie["worldcover_share"] == pytest.approx(0.51)
    assert bool(near_tie["worldcover_mixed"]) is False   # a bare majority, just
    assert three_way["worldcover_class"] == 10 and three_way["worldcover_share"] == pytest.approx(0.4)
    assert bool(three_way["worldcover_mixed"]) is True
    # Flagged, not reclassified: the near-tie cell is still refused as built-up.
    assert bool(near_tie["plantable"]) is False


def test_stage_06_gives_the_same_answer_whatever_order_the_counts_arrive_in(city):
    run_through_05(city)
    table = read_json("landcover.json")
    first = run_stage_06(city, table)
    reordered = {g: dict(reversed(list(h.items()))) for g, h in table.items()}
    second = run_stage_06(city, reordered)
    assert first["worldcover_class"].tolist() == second["worldcover_class"].tolist()
    assert first["plantable"].tolist() == second["plantable"].tolist()


def test_stage_06_treats_a_cell_with_no_land_cover_as_not_plantable(city):
    run_through_05(city)
    table = read_json("landcover.json")
    table["cell_0001"] = None
    cells = run_stage_06(city, table)
    assert bool(cells.loc["cell_0001", "plantable"]) is False
    assert cells["worldcover_share"].isna().loc["cell_0001"]


def test_stage_06_does_not_publish_for_a_city_that_is_not_the_published_one(city):
    run_through_05(city)
    run_stage_06(city)
    # publish() is what would copy into frontend/public; for this city it must refuse.
    assert not city.publishes_to_frontend
