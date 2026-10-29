-- Record how decisive each cell's land-cover class is (issue #168).
--
-- worldcover_class is the most common ESA WorldCover class among a cell's
-- pixels. For a cell split nearly evenly between two classes that call is
-- close, and plantable (which drives the planting recommendation) follows it.
-- worldcover_share is the fraction of the cell's pixels carrying the class, and
-- worldcover_mixed says whether that is below the mixed-cell threshold, so a
-- near-tie is published as one instead of as a fact.
--
-- Nullable on purpose: rows loaded before the pipeline produced the share have
-- none, and inventing one would be worse than saying nothing. The loader probes
-- for these columns and skips them until this migration has been applied.
--
-- Run this before the frontend deploy that selects them. Until then the API's
-- database path would fail on the missing columns and serve the snapshot
-- instead, which is correct but logged as a fault.

begin;

alter table grid_cells
    add column if not exists worldcover_share numeric,
    add column if not exists worldcover_mixed boolean;

alter table grid_cells drop constraint if exists chk_grid_cells_worldcover_share_range;
alter table grid_cells add constraint chk_grid_cells_worldcover_share_range
    check (worldcover_share is null or (worldcover_share >= 0 and worldcover_share <= 1));

commit;
