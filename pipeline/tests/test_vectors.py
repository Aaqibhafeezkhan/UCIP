"""Stage 03's local geometry work (issue #207, and #201 for slum_pct).

The Earth Engine and OSM calls are not exercised: those need credentials and a
network. What is tested is everything stage 03 does with files and geometry on
this machine, which is where the slum_pct fallback lives.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

gpd = pytest.importorskip("geopandas", reason="geopandas is not installed")
from shapely.geometry import box  # noqa: E402

PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR))


@pytest.fixture(scope="module")
def vectors():
    spec = importlib.util.spec_from_file_location("stage03_vectors", PIPELINE_DIR / "03_vectors.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


UTM = "EPSG:32643"


def grid():
    """Two 1 km cells side by side in Mumbai, in WGS84."""
    cells = gpd.GeoDataFrame(
        {"grid_id": ["cell_0000", "cell_0001"]},
        geometry=[box(500000, 2100000, 501000, 2101000), box(501000, 2100000, 502000, 2101000)],
        crs=UTM,
    )
    return cells.to_crs("EPSG:4326")


def test_no_slum_layer_gives_none_for_every_cell_not_zero(vectors, tmp_path):
    out = vectors.compute_slum_pct(grid(), slums_path=tmp_path / "absent.geojson", utm_crs=UTM)
    assert out == {"cell_0000": None, "cell_0001": None}


def test_a_city_with_no_configured_layer_gives_none(vectors):
    out = vectors.compute_slum_pct(grid(), slums_path=None, utm_crs=UTM)
    assert set(out.values()) == {None}


def test_mapped_clusters_give_the_covered_share(vectors, tmp_path):
    # Covers the left half of cell_0000 and nothing of cell_0001.
    slums = gpd.GeoDataFrame(
        geometry=[box(500000, 2100000, 500500, 2101000)], crs=UTM
    ).to_crs("EPSG:4326")
    path = tmp_path / "slums.geojson"
    slums.to_file(path, driver="GeoJSON")

    out = vectors.compute_slum_pct(grid(), slums_path=path, utm_crs=UTM)
    assert out["cell_0000"] == pytest.approx(50.0, abs=0.1)
    assert out["cell_0001"] == pytest.approx(0.0, abs=0.1)


def test_hospital_distance_uses_the_nearest_hospital(vectors, monkeypatch, tmp_path):
    wards = gpd.GeoDataFrame(
        {"name": ["A"]}, geometry=[box(500000, 2100000, 502000, 2101000)], crs=UTM
    ).to_crs("EPSG:4326")
    wards_path = tmp_path / "wards.geojson"
    wards.to_file(wards_path, driver="GeoJSON")

    hospital = gpd.GeoDataFrame(geometry=[box(499900, 2100450, 500100, 2100550)], crs=UTM).to_crs("EPSG:4326")
    monkeypatch.setattr(vectors, "fetch_hospitals", lambda polygon: hospital)

    out = vectors.compute_hospital_distance(grid(), wards_path, utm_crs=UTM)
    # cell_0000's centroid is 500 m east of the hospital's centre, cell_0001's 1500 m.
    assert out["cell_0000"] == pytest.approx(500.0, abs=5)
    assert out["cell_0001"] == pytest.approx(1500.0, abs=5)


def test_a_failed_osm_query_gives_none_for_every_cell(vectors, monkeypatch, tmp_path):
    wards = gpd.GeoDataFrame(
        {"name": ["A"]}, geometry=[box(500000, 2100000, 502000, 2101000)], crs=UTM
    ).to_crs("EPSG:4326")
    wards_path = tmp_path / "wards.geojson"
    wards.to_file(wards_path, driver="GeoJSON")
    monkeypatch.setattr(vectors, "fetch_hospitals", lambda polygon: None)

    out = vectors.compute_hospital_distance(grid(), wards_path, utm_crs=UTM)
    assert set(out.values()) == {None}
