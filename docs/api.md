# UCIP API

Read-only HTTP access to Mumbai ward-level heat vulnerability data and the cited
nature-based cooling recommendations derived from it.

**Base URL:** `https://uciplatform.vercel.app/api/v1`
**Spec:** [`/api/v1/openapi.json`](https://uciplatform.vercel.app/api/v1/openapi.json) (OpenAPI 3.1)

No authentication and no key. Open CORS, so browser code can call it directly.
When the deployment's rate-limit store is configured, there is a per-IP ceiling
of 120 requests a minute, well above anything normal use produces; see
[Rate limiting](#rate-limiting). Everything served here is
already public: the same numbers sit in the committed GeoJSON snapshots in this
repository and on the dashboard.

Want all of it? Use [`/export`](#get-exportdatasetformat), one request for the
whole dataset as GeoJSON or CSV. What `v1` guarantees, and what would require a
`v2`, is written down under [Versioning](#versioning).

## Two things to know before you start

**Ward codes contain slashes.** Mumbai's BMC wards include split wards like
`F/N`, `G/S` and `R/C`. In a path segment they must be URL-encoded:

```
/api/v1/wards/F%2FN
```

**Every response says where it came from.** Each carries a `source` field of
`database` or `snapshot`. The API reads Supabase when it is available and falls
back to the committed static snapshots when it is not, rather than returning a
500. Snapshot data is at most one refresh behind. This is the same demo-safe
principle the dashboard was built on, and it is why the site survived the
Supabase project being deleted in September 2026.

## Endpoints

### `GET /meta`

What this deployment is serving: coverage, row counts, the weighting method
actually used (PCA, or the published-literature fallback if the PCA was
rejected), licence terms and links. It also reports `generated_at` (when the
pipeline last refreshed the data) and `composite_window` (the dry-season Landsat
window the figures were computed from); both are null until a refresh run has
committed its run log.

### `GET /wards`

All 24 wards, ranked most vulnerable first.

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | 1-24 | 24 | |
| `geometry` | boolean | false | Include ward polygons. Roughly 1 MB; off by default. |

```bash
curl 'https://uciplatform.vercel.app/api/v1/wards?limit=3'
```

Each ward carries `contrib`, the per-factor contribution to its score (weight
times z-score), with one key per scored indicator: `LST_C`, `NDVI`,
`pop_density_km2`, `hospital_dist_m` and `impervious_pct`. This is the explainability layer: the index is a transparent
linear combination, so a ward's score decomposes exactly into its drivers. There
is no post-hoc attribution because there is no black box.

### `GET /wards/{wardId}`

One ward with its ranked recommendations, each carrying the rationale that fired
the rule and its citation. A split ward code can be sent encoded (`F%2FN`) or as
a slug with a hyphen (`F-N`).

```bash
curl 'https://uciplatform.vercel.app/api/v1/wards/F%2FN'
```

`400` for a malformed code, `404` for a well-formed code that does not exist.

### `GET /lookup?lat=&lon=`

The ward containing a coordinate, with its top recommendation. This is the
endpoint for "what is the heat risk where I am", without needing to know a ward
code first.

```bash
curl 'https://uciplatform.vercel.app/api/v1/lookup?lat=19.076&lon=72.877'
```

`404` when the point falls outside all 24 wards, which currently means anywhere
outside Mumbai.

### `GET /recommendations?ward=&limit=`

Recommendations across all wards, or one ward, ordered by priority.

### `GET /cells?ward=&bbox=&limit=&geometry=`

The 1 km analysis grid: the per-cell measurements the ward scores are built
from. Use this to check the working rather than trusting the ward rollup.

`bbox` is `minLon,minLat,maxLon,maxLat` and returns cells overlapping the box.

```bash
curl 'https://uciplatform.vercel.app/api/v1/cells?bbox=72.80,19.00,72.95,19.15'
```

### `GET /export?dataset=&format=`

The whole dataset in one cached call. **This is the preferred route for bulk
access**, rather than paging the endpoints above.

| Parameter | Values | Default |
|---|---|---|
| `dataset` | `cells` (541 grid cells), `wards` (24 BMC wards) | `cells` |
| `format` | `geojson`, `csv` | `geojson` |

```
/api/v1/export?dataset=cells&format=csv
```

CSV rows lead with the identifier and the feature centre as plain `lon` and
`lat` columns, so the data plots in pandas or R without a geometry library. For
cells that centre is exact to well under a metre, since the cells are squares;
for wards it is a rough label point, not a centroid.

Served from the published snapshots rather than the database, on purpose. A bulk
export is by definition the complete published dataset, which is exactly what
the snapshots are, and routing the heaviest response in the API around the
free-tier database keeps it available for everything else.

Column meanings, units, valid ranges and known limitations are in
[`DATA-DICTIONARY.md`](DATA-DICTIONARY.md).

## Caching

Responses are edge-cached for an hour with a day of stale-while-revalidate. The
underlying data changes once a dry season at most (see
[`pipeline/README.md`](../pipeline/README.md) on refresh cadence), so this keeps
the free-tier database out of the request path for nearly all traffic.

Please do not poll. If you want the whole dataset, use
[`/export`](#get-exportdatasetformat), which is one request instead of many.

## Versioning

`v1` is in the path, and this is what it promises.

**These can change without a new version.** Build against the API expecting
them:

- New endpoints.
- New fields on an existing response. Read by name and ignore what you do not
  recognise.
- New values in a `dataset`, `format` or similar parameter.
- Data values changing on a refresh. A scheduled refresh runs twice a week;
  within a dry season the numbers rarely move, and a ward's score moving is the
  API working, not breaking. Every response
  carries the refresh date via [`/meta`](#get-meta).
- Cache durations, error message wording, and the order of items in a list
  where no order is documented.

**These need `v2`.** They will not happen inside `v1`:

- Removing or renaming a field.
- Changing a field's type, or its units. `hospital_dist_m` will not quietly
  become kilometres.
- Changing what a field means while keeping its name.
- Removing an endpoint or a parameter, or making an optional parameter
  required.
- Changing the shape of an error response.

**Deprecation.** If `v2` arrives, `v1` keeps serving for at least six months
from the day `v2` ships, and during that window `v1` responses carry a
`Deprecation` header with the removal date. A version is never withdrawn
without that notice.

**Where changes are announced.** In the changelog below, in
[`CHANGELOG.md`](../CHANGELOG.md), and in the GitHub release notes for the
version that carries them.

### API changelog

Changes to this API, newest first. Data refreshes are not listed here; they are
visible through [`/meta`](#get-meta).

| Date | Change |
|---|---|
| 2026-10-29 | `/wards`, `/wards/{wardId}` and `/lookup` gain optional `rank_ci_low`, `rank_ci_high`, `hvi_ci_low` and `hvi_ci_high`, the 95% bootstrap interval from `hvi_uncertainty.json`. Additive. The fields are omitted for a ward the file has no entry for. They cover sampling uncertainty in the grid cells only. |
| 2026-10-27 | `/cells` takes an `offset` param and now returns a `total` field alongside `count`, so a client can page through the full grid instead of relying on the default limit covering it. Additive, but the default `limit` moved from 541 (the current cell count) to 1000 (the endpoint's ceiling), so an unpaged request against a larger future grid returns more rows than before. |
| 2026-10-27 | `/wards`, `/cells` and `/recommendations` return `400` when `limit` is not a positive integer. Omitted limits still use their defaults, and values above each endpoint's maximum are clamped. |
| 2026-10-17 | **Removed the `child_pct` and `slum_pct` keys from every `contrib` object**, and `contrib_child_pct` and `contrib_slum_pct` from the ward export, because the index no longer scores those two indicators. The raw values stay as context: `slum_pct` on `/cells` and `/export`, `child_pct` on `/export`. A field removal, so the reason is in [the note below](#the-2026-10-17-change-to-the-scored-indicators). |
| 2026-10-17 | `/wards/{wardId}`, `/cells?ward=` and `/recommendations?ward=` accept the slug form of a split ward code (`F-N` for `F/N`). Additive. A malformed percent-encoded code now returns `400` like any other invalid code, where it used to return `500`. |
| 2026-10-17 | `/meta`'s `method.weighting` text for the fallback case now says "equal weights", which is what the fallback uses. Wording only. |
| 2026-09-24 | **Removed `elderly_pct`** from `/cells` and `/export`, `contrib_elderly_pct` from the ward export, and the `elderly_pct` key from every `contrib` object. This is a field removal, which the policy above reserves for `v2`, so the reason is in [the note below](#the-2026-09-24-removal-of-elderly_pct). |
| 2026-09-24 | `contrib` on `/wards`, `/wards/{wardId}` and `/lookup` gains a `child_pct` key, and the `contrib_child_pct` column joins the ward export. Additive. The ward scores, ranks and recommendations also changed, because the index now has an eighth indicator and the plantability filter was corrected. Both are data changes and not contract changes. See methodology.md 10b to 10d. |
| 2026-09-24 | `/export` and `/cells` now return the documented field names in every case. See the note below. |
| 2026-09-24 | `/wards` now returns `dominant_factor`, `dominant_share` and `single_factor_dominated` on the database path as well as the snapshot path. Additive: those fields were previously present or absent depending on which backend answered. |
| 2026-09-23 | Added per-IP [rate limiting](#rate-limiting) at 120 requests a minute. Normal use is well under it. |
| 2026-09-23 | Added [`/export`](#get-exportdatasetformat) for bulk access as GeoJSON or CSV. Additive, no existing response changed. |
| 2026-09-23 | Documented this versioning policy. No behaviour change. |
| 2026-09-18 | `v1` published with `/meta`, `/wards`, `/wards/{wardId}`, `/lookup`, `/recommendations`, `/cells` and `/openapi.json`. |

#### The 2026-09-24 removal of `elderly_pct`

`elderly_pct` is gone from `/cells`, `/export` and the `contrib` objects, which
the versioning policy says needs `v2`. It is removed anyway, and the reasons are
these:

- **The values did not mean what the name said.** They came from WorldPop's
  India age-sex product, which applies district age structure to a population
  raster. Across Mumbai the field took two meaningful values, one per revenue
  district. Keeping it under a deprecation window would mean publishing a
  number known to be a district label under a demographic name for another six
  months.
- **No accurate replacement exists.** The open Census tables have no ward-level
  60+ column, so the field could not be corrected, only dropped.
- **It fed a ward score.** Every score and rank it contributed to has been
  recomputed without it. Leaving the field in place while scores no longer used
  it would be worse than removing it.

The API was six days old, and the only consumers we know of are this
repository's own generated clients. If you read the field, remove it. At the time
seven indicators remained; since 2026-10-17 the index scores five (see the next
note). The full account is in methodology.md 10a.

#### The 2026-10-17 change to the scored indicators

The index now scores only indicators that any city can build from free, open,
global data that is easy to re-pull: land surface temperature and NDVI
(Landsat 8/9), population density (WorldPop), hospital distance (OpenStreetMap)
and impervious share (ESA WorldCover). The slum share (one-off Datameet
polygons) and the under-7 share (Census 2011 ward tables) were taken out,
because neither exists for most cities or gets updated.

This removes keys from `contrib`, which the policy reserves for `v2`. They are
removed anyway:

- **A contribution for an unscored indicator would be wrong either way.** A
  non-zero value would describe an index that no longer exists, and zero would
  claim the indicator was measured and found to have no effect.
- **The raw values are kept.** `slum_pct` stays on `/cells` and `/export`, and
  `child_pct` on `/export`, so nothing a client could read from them is lost.
- **Every ward score and rank was recomputed.** Ten of the 24 wards moved, by at
  most three places. Those are data changes, which the policy allows.

If you read `contrib.slum_pct` or `contrib.child_pct`, stop: `contrib` now has
five keys.

#### The 2026-09-24 field-name correction

`/export` returned `HVI`, `LST_C`, `NDVI` and `NDVI_prev`, the pipeline's own
spelling, where every other endpoint returns `hvi`, `lst_c`, `ndvi` and
`ndvi_prev`. `/cells` returned one or the other depending on whether the
database or the static snapshot answered the request. They are now the
documented lowercase names everywhere.

The versioning policy above reserves renaming a field for `v2`, so this needs
justifying rather than slipping through:

- **Those names were never documented.** The OpenAPI spec described the
  parameters of these endpoints and left their response bodies as prose, so
  neither spelling was ever part of the published contract. The spec now
  carries complete response schemas, which is what made the divergence visible.
- **`/cells` had no stable answer to rename.** It returned `hvi` when the
  database was reachable and `HVI` when it was not, along with a different set
  of keys. No client could have depended on either, and code that appeared to
  work would have broken the first time the database went down.
- **`/export` was one day old**, shipped 2026-09-23.

A deprecation window would have meant serving both spellings side by side, and
the main consumer of `/export` is a CSV opened in pandas or R, where duplicate
columns under two names is a worse outcome than a single clean rename on a
day-old endpoint.

If you pulled the export between 2026-09-23 and 2026-09-24, lowercase the four
column names and nothing else changes.

## Rate limiting

120 requests a minute per client, when the deployment has its rate-limit store
(Upstash) configured; without it every request is allowed. Cache headers do most
of the work: responses
are edge-cached for an hour, so repeated requests for the same thing never
reach the limiter. It exists for traffic that defeats caching, such as walking
every ward in a loop.

Exceeding it returns `429` with `Retry-After` and `X-RateLimit-Limit` /
`X-RateLimit-Remaining`. If you want the whole dataset, one call to
[`/export`](#get-exportdatasetformat) costs one request against the limit
rather than 24 or 541.

IPv6 clients are counted on their `/64` prefix rather than their exact address,
since an ISP hands a whole `/64` to one line.

If the limiter's backing store is unreachable, requests are allowed through. A
read-only public API going down because the thing protecting it is down would
be the worse failure.

## Limits and honesty

- **Mumbai only.** The pipeline reads its city from a config, and Pune is
  configured as a test case, but no second city has been run end to end.
- **A point in time.** Scores come from a single dry-season composite. A
  year-by-year temperature and NDVI series per ward is published separately in
  `ward_timeseries.json`; it is not a trend in the index.
- **Proxies are proxies.** `hospital_dist_m` is straight-line rather than travel
  distance, and `slum_pct` (context, not scored) is mapped cluster boundaries,
  not a census count. Both are documented on the
  [methodology page](https://uciplatform.vercel.app/methodology).
- **Checked against two stations only.** Land surface temperature is not air
  temperature. Against the Santacruz and Colaba weather stations the satellite
  layer tracks day-to-day variation (pooled r = 0.716), on an earlier dry season
  than the index because station data is published with a lag.
- **`v1` is young.** The stability promise is real and written down under
  [Versioning](#versioning), but it has not been tested by a second version yet.

## Licence

Code is Apache 2.0. The data carries the terms of its sources (Landsat, WorldPop,
ESA WorldCover, OpenStreetMap, Datameet, the Census of India via OpenCity, NOAA
GSOD); see
[`/legal`](https://uciplatform.vercel.app/legal). If you use this in published
work, cite the repository.
