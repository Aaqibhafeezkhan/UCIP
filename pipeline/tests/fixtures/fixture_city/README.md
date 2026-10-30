# Fixture city

A three-ward, fifteen-cell city for running pipeline stages 01, 04, 05 and 06
end to end in CI without Earth Engine, OpenStreetMap or a network (issue #207).

- `city.json` is its config.
- `wards.json` holds the ward rectangles in EPSG:32643 metres, placed so that
  the six cells of ward A in the south-west are exact 1 km squares with exactly
  the same area, which is the situation that made `grid_id` unstable (#217),
  while the ward borders (x = 3300 m, y = 1700 m from the south-west corner)
  cut through cells so the largest-fragment rule is exercised too. The extents
  are deliberately not whole kilometres: a ward edge that lands exactly on a
  fishnet line, after a round trip through degrees, leaves sliver cells.
- `indicators.json` holds hand-picked values for the cells, keyed by `grid_id`,
  standing in for what stages 02 and 03 would pull. Ward C is built to be the
  most vulnerable (hot, dense, bare, far from a hospital) and ward B the least.
- `landcover.json` holds the per-cell WorldCover pixel counts that stage 06
  would get from Earth Engine, including a built-up cell, a tree-cover cell
  and a near-tie.

Cell ids come from stage 01 in fishnet order (x then y, south-west first), so
`cell_0000` to `cell_0002` run up the westernmost column. Wards: A is cells 0, 1, 3, 4, 6, 7; C is 2, 5, 8; B is 9 to 14.
