"""Source-level guards for the #171 failure chain.

Stages 03 and 04 import geopandas and earthengine-api, which CI does not
install, so their main() cannot run in a test. These checks read the source
instead. They pin two properties that went missing together in September 2026:

1. Stage 03 names its reduceRegions output explicitly. Earth Engine names the
   output after the band only for multi-band images; for one band it uses the
   reducer name ("sum"). When the elderly band was removed (#167) the lookup of
   "total_pop" silently returned None for every cell.
2. Stages 03 and 04 refuse to write their output when coverage collapses, so a
   bad run fails at its cause and leaves the last good file in place.
"""

from __future__ import annotations

from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent.parent


def source(name: str) -> str:
    return (PIPELINE_DIR / name).read_text(encoding="utf-8")


def test_stage03_reducer_names_its_output():
    src = source("03_vectors.py")
    assert 'setOutputs(["total_pop"])' in src


def test_stage03_fails_before_writing_on_low_population_coverage():
    src = source("03_vectors.py")
    guard = src.index("if matched < MIN_POP_COVERAGE")
    write = src.index("grid_gdf.to_file(OUT_PATH")
    assert guard < write
    assert "return 1" in src[guard:write]


def test_stage04_fails_before_writing_on_cell_loss():
    src = source("04_zonal.py")
    guard = src.index("if len(tidy) < MIN_KEPT_SHARE * before")
    write = src.index("tidy.to_file(OUT_PATH")
    assert guard < write
    assert "return 1" in src[guard:write]
