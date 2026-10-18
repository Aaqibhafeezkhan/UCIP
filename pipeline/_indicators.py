"""The Heat Vulnerability Index indicator set, in one place (issue #95).

The direction table used to be copied into five files (05_hvi, 08_sensitivity,
uncertainty, compare_weightings), each with its own idea of
what the indicators were. That is tolerable while the list never changes
and a trap the moment it does: adding an indicator meant finding every copy, and
missing one would not raise an error. It would compute a ranking from a
different index than the one the others were describing.

Direction is +1 when a higher value adds to vulnerability and -1 when it
protects. NDVI is the only protective one.

The scored set is limited, on purpose, to indicators any city can build from
free, open, global data that is easy to find and to re-pull (decision
2026-10-17):

    LST_C, NDVI       Landsat 8/9 Collection 2, public domain, every 16 days
    pop_density_km2   WorldPop 100 m, CC BY 4.0
    hospital_dist_m   OpenStreetMap, ODbL, edited continuously
    impervious_pct    ESA WorldCover 10 m, CC BY 4.0

Two Mumbai inputs used to be scored and are not any more, because neither is
easy to find for another city or to keep current: the slum share (one-off
Datameet polygons, never updated) and the under-7 share (Census 2011 ward
tables, fifteen years old). They are kept as CONTEXT: carried through to the
published cells so the API keeps its shape and a reader can still see them,
but never standardised, weighted or summed into the index.

OPTIONAL indicators need an input a city may not have. The set is empty today;
the tier stays so a city can add a scored local indicator without editing every
stage, and `present()` is how every stage finds out which indicators a given
run actually has.
"""

from __future__ import annotations

from typing import Iterable

# Order is the canonical display order, and it is the order the frontend lists
# the factors in. It is not the order PCA sees them in, which does not matter.
DIRECTIONS: dict[str, int] = {
    "LST_C": 1,
    "NDVI": -1,
    "pop_density_km2": 1,
    "hospital_dist_m": 1,
    "impervious_pct": 1,
}

OPTIONAL: tuple[str, ...] = ()

# Carried for display and the API, never scored. See the module docstring.
CONTEXT: tuple[str, ...] = ("child_pct", "slum_pct")

REQUIRED: list[str] = [c for c in DIRECTIONS if c not in OPTIONAL]


def present(columns: Iterable[str]) -> list[str]:
    """The indicators a dataset actually carries, in canonical order.

    Required indicators are expected to be there; stage 04 enforces that. This
    exists so that the optional ones are picked up when present and skipped
    when not, by one rule rather than one guess per stage.
    """
    available = set(columns)
    return [c for c in DIRECTIONS if c in available]
