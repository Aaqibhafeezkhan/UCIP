# UCIP methodology

The written companion to the [methodology page](https://uciplatform.vercel.app/methodology), which computes its figures from the pipeline's output files. The numbers below are from the run recorded in `data/pipeline_run_log.json` (finished 2026-10-17, dry-season window 2025-11-01 to 2026-02-28). The full technical account is [`HVI-methodology-report.md`](HVI-methodology-report.md).

## 1. Scope

- A citable, versioned heat vulnerability index for Mumbai's wards. It is not a forecast and not a warning service.
- 24 BMC wards, from the Datameet boundary file. BMC has since opened K North (split from K/E) and reportedly split P North; no open boundary file for the new wards exists yet.
- Computed on a 1 km grid (541 cells with residents) and averaged up to wards. A 500 m run is reproducible and was used as a check (4c).
- The pipeline reads its city from `config/cities/<slug>.json`. Pune is configured as a test case and has not been run end to end.

## 2. Prior art

Five comparable efforts are surveyed in [`prior-art.md`](prior-art.md): the Mumbai Climate Action Plan 2022, the RAND/Azhar India HVI, IIT Bombay's Mumbai surface heat island work, the C40 Urban Cooling Toolbox and the Ahmedabad Heat Action Plan. Among those five, UCIP is the one that combines a ward-level index weighted from the city's own data, a factor-by-factor breakdown, an intervention engine with an ecological filter, and published uncertainty.

## 3. Indicators

Five, all from free, open, global data that is easy to re-pull (decision 2026-10-17, see 10e):

| Indicator | Direction | Source |
|---|---|---|
| Land surface temperature (`LST_C`) | + | Landsat 8/9 Collection 2, dry-season median |
| Green cover (`NDVI`) | - | Landsat 8/9 Collection 2, dry-season median |
| Population density (`pop_density_km2`) | + | WorldPop 2020, 100 m |
| Hospital distance (`hospital_dist_m`) | + | OpenStreetMap |
| Impervious share (`impervious_pct`) | + | ESA WorldCover 2021, 10 m |

Each is standardised to a z-score and oriented so that higher means more vulnerable. The set is defined once, in `pipeline/_indicators.py`.

Two Mumbai inputs are published as context and not scored: the slum share (Datameet slum-cluster polygons) and the under-7 share (Census 2011 ward tables). There is no elderly indicator (10a).

## 4. The index

- **Weights.** The absolute loadings of the first principal component of the standardised cells, renormalised to sum to one, following Reid et al. 2009. On this run PC1 explains 73.1% of the variance and the weights are close to even: impervious 22.1%, population density 21.0%, LST 20.3%, hospital distance 18.4%, NDVI 18.2%.
- **Fallback.** If PC1 explains less than 30%, the pipeline uses equal weights (1/n each) and records that in `hvi_pca_log.json`. It did not fire.
- **Score.** Weighted sum, rescaled to 0-100, averaged over each ward's cells, ranked 1 (most vulnerable) to 24.
- **Explainability.** Each contribution is weight times z-score, so a score splits exactly into its five drivers. There is no post-hoc attribution because there is no black box.
- **An open question.** Hospital distance loads negatively on PC1 (-0.41) while the other four load positively: in Mumbai the hot, dense, paved cells sit close to hospitals. The index keeps the literature's direction (farther from care is more vulnerable) and takes the weight from the size of the loading. That is a judgement and is flagged for outside review.

## 4b. Ward-level figures in the ward view

- HVI, rank and the five contributions come straight from `wards_hvi.geojson` (stage 05); the ward view never recomputes them.
- The raw indicator figures are the unweighted mean of the ward's member cells (stage 10, `ward_profiles.json`). A ward with 2 cells and one with 61 are both simple means, so small wards are noisier.
- "Hotter than X%" is the ward's HVI percentile among the 24, derived from rank.
- "Biggest driver" is the largest positive contribution, the same numbers as the bar breakdown.
- Neighbours are wards whose polygons touch on the BMC boundary file.
- NDVI is reported as an index, never as a canopy percentage.

## 4c. How precise is a ward's score

`pipeline/uncertainty.py`, output `data/hvi_uncertainty.json`.

A single HVI to one decimal and a rank out of 24 imply a precision the method does not have. So the 541 cells are resampled with replacement 1,000 times and the whole chain is rerun on each resample (z-scores, PCA, weights, per-cell index, rescale, ward rollup, rank), giving a 95% interval per ward. Holding the z-scores and rescale fixed and varying only the weights would understate the uncertainty while looking rigorous.

| | |
|---|---|
| Median rank interval | **6 places** |
| Widest | 17 places (ward B, ranked 4th, interval 1st to 18th) |
| Wards whose rank is certain | **0 of 24** |

Read the ranking as bands. "C is among the most vulnerable wards" survives (1st to 2nd), and so does "T and R/C are among the least" (both 21st to 24th). The difference between 9th and 11th does not: M/W (4th to 13th) and G/S (7th to 13th) overlap almost entirely. Two mid-table wards should be treated as tied.

This covers sampling uncertainty in the cells only. It does not cover measurement error, the choice of indicators, or the decision to weight by PCA at all, which section 5 tests separately.

### Checked against a different grid

Rebuilding the dataset at 500 m (1,975 cells instead of 541) changes the unit of analysis rather than resampling it. On the seven-indicator index of 2026-09-24, every ward's 500 m rank fell inside its own 1 km bootstrap interval, 24 of 24, while 13 wards changed rank. That comparison has not been re-run on the five-indicator index. Reproduce it with `python pipeline/run_pipeline.py --cell-size 500` (see [`adding-a-city.md`](adding-a-city.md) for the cost).

## 4d. How much imagery is behind each cell

Every 1 km cell carries `lst_clear_obs`, the mean number of cloud-free Landsat observations behind its LST, and an `lst_obs_sparse` flag below 3. On this run the range is 8.9 to 12.0 observations (median 12.0), and no cell is flagged. A flagged cell is kept, not dropped, so the grid size stays stable for the downstream stages and the quality gate.

## 5. Sensitivity and validity

**Weight perturbation** (stage 08, `sensitivity.json`). Each weight moved by +/-20% in turn, ten runs. Mean Kendall tau against the baseline ranking 0.985 (lowest 0.971), mean top-5 overlap 4.8 of 5. The top five changed in two runs (population density +20%, impervious -20%), each by one ward. The order near the top is not fixed; membership mostly is.

**PCA weights against equal weights** (`compare_weightings.py`, `weighting_comparison.json`):

| Measure | Result |
|---|---|
| Kendall tau | 0.986 |
| Spearman rho | 0.998 |
| Wards with an identical rank | 20 of 24 |
| Largest move | 1 place (G/N) |
| Top-5 overlap | 5 of 5 (PCA: C, L, G/N, B, E; equal: C, L, B, G/N, E) |

With five indicators the PCA weights are nearly even, so the weighting scheme barely changes the answer. Dropping the lowest-weighted indicator (NDVI) and refitting both schemes gives tau 0.978 and the same top five. Under the seven-indicator index the two schemes disagreed far more (tau 0.754), almost all of it from the under-7 share.

**Ground check** (stage 13, `lst_validation.json`). Satellite land surface temperature against the Santacruz and Colaba NOAA stations: pooled within-station r = 0.716. LST runs well above air temperature, more so at inland Santacruz, which is expected physics. The check uses an earlier dry season than the index, because station data is published with a lag.

## 6. Intervention engine

- Rule-based. Each fired rule carries a rationale and a citation. Where a rule rests on our own judgement rather than a paper, the citation says so.
- Plantability filter: native trees only where restoration is suitable (Bastin et al. 2019) and never on native grassland or savanna (Veldman et al. 2019), wetland, mangrove, water or heavily sealed cells.
- On this run: 62 ward-level rows, at least one for every ward. Rain gardens 24, cool roofs with cooling centres 20, pocket parks 18. Trees 0 (10d).

## 7. Green-cover change

NDVI for the current dry season against 2016-17, per cell, classified as gained, stable or lost with a +/-0.05 band (a judgement, not a figure from a paper).

## 8. Simulator

Illustrative. Published coefficients turn more tree canopy (Ziter et al. 2019), higher roof albedo (Santamouris 2014) and pocket parks (Bowler et al. 2010) into degrees of daytime cooling. It does not recompute the HVI. The pocket-park scaling is our own assumption.

## 9. Budget scenario

Stage 15 allocates one worked budget (Rs 5 crore) to cool roofs, the only intervention with a sourced Indian programme cost (NRDC, Ahmedabad Cool Roofs Pilot). Fractional knapsack by benefit per rupee. The default objective weights person-degrees of cooling by ward HVI; on this run it funds the wards ranked 6, 7 and 9. Unweighted person-degrees would fund the wards ranked 17, 19, 22 and 24, which is why the objective is stated in the output. The albedo gain and roof share are assumptions.

## 10. Limitations

- Land surface temperature is not air temperature, and it is daytime only. Night heat is what harms people most.
- Informal housing and age are not scored (10e), so wards with large informal populations may rank lower than their real vulnerability.
- Hospital distance runs against the other indicators on PC1 (section 4).
- Population is a WorldPop 2020 model, not a census count.
- The boundary file has 24 wards; BMC's newer wards are not reflected.
- Cooling coefficients come from other cities and are not calibrated for Mumbai.
- The simulator is a first-order estimate, not a climate model.
- The plantability layer works on whole 1 km cells.

The sections below are a dated record of corrections. Figures in them describe the index as it was on that date.

### 10a. 2026-09-24: `elderly_pct` was removed

The index no longer has an elderly indicator. It had one, taken from WorldPop, and it did not measure age. Issue #167 asked what to do about it and the answer was to remove it, because no accurate ward-level 60+ source exists and a number that reads as demographic and is not one is worse than no number.

The evidence was produced by `pipeline/elderly_evaluation.py`, deleted with the indicator. It is in the git history before 2026-09-24.

**What it was.** WorldPop's India age-sex product is a 100 m raster, which implies a measured surface at that resolution. It applies district age structure to a population raster instead. Across Mumbai's 541 cells it took 26 distinct values, but 80% of cells shared one and two values covered 95.6% of cells. The two values split the city along the revenue district boundary: all nine Mumbai City wards carried 5.586 and all fifteen Mumbai Suburban wards 4.757.

**It was not inert.** Standardisation turned a 0.83-point district gap into a large z-score. The indicator took 13.6% of total absolute contribution, and dropping it moved 13 of the 24 wards by up to 4 places.

**It drove a recommendation, and that rule went too.** The cooling-centre rule fired where `elderly_pct` and `hospital_dist_m` were both at or above their 75th percentile. "High elderly share" meant which district a cell was in. The rule and the Knowlton et al. 2014 citation that existed only for it were removed. The cool-roof recommendation still names cooling centres; that is a different rule.

**Why it was not replaced.** OpenCity's ward-wise Census release carries the age band 0 to 6 and no 60+ column. An elderly indicator can come back if a ward-level 60+ source turns up.

**What removal changed then.** Thirteen wards changed rank, by at most 4 places; the top five went from C, G/N, L, E, B to L, C, G/N, H/E, E. Six zero-population cells that had been leaving the index by accident are now excluded explicitly by stage 04, so the count stays 541.

### 10b. 2026-09-24: the plantability filter was failing open

Published plantability was wrong for half its output between the first release and 2026-09-24, and the correction removed 176 of 337 plantable cells.

Earth Engine's mode reducer returns a float, so a built-up cell arrived as 50.00000000000015 or 49.99999999999996, never 50, and `worldcover_class in {50, 80, 90, 95}` was False for both. 301 of 541 cells carried such a value.

| Land cover | Cells published as plantable | Should have been |
|---|---|---|
| Built-up (50) | 127 | refused |
| **Mangrove (95)** | **30** | **refused** |
| Open water (80) | 17 | refused |
| Native grassland (30) | 1 | refused |
| **Total** | **175 of 337** | **0** |

Recommending tree planting on mangrove is not a rounding error: a mangrove is already doing the cooling and flood-buffering work. Class codes are now normalised to integers where they leave Earth Engine and again inside `is_plantable`, and an unrecognised code is refused. After the fix 161 of 541 cells are plantable, none with a disqualifying class.

### 10c. 2026-09-24 to 2026-10-17: `child_pct`, real Census data that moved little

`pipeline/build_census_table.py`, table `data/census2011_ward_age_mumbai.csv`.

The under-7 share was the one age signal available at ward resolution. 97 Census wards roll up into the 24 BMC wards, and the build refuses to write a table unless the two source files agree on every Census ward's population and the total equals the Census figure for Greater Mumbai, 12,442,373. It does, exactly.

While scored, it carried a PCA weight of 0.027 and little of the ranking, because it was nearly uncorrelated with the other indicators. Under equal weights it carried 1/7, which made it almost the whole disagreement between the two schemes (tau 0.754). It was taken out of the index on 2026-10-17 (10e) and is kept as a context column.

### 10d. 2026-09-24: with the filter corrected, tree planting fires nowhere

After the 10b correction the tree-planting recommendation fires for no cell in Mumbai. On the current run 81 cells are both hot (HVI at or above the 75th percentile) and bare (NDVI at or below the 25th). All 81 are built-up (WorldCover class 50), with a median impervious share of 78.4% against a plantable ceiling of 68.4%.

Each cell takes the most common WorldCover class inside it, and a mostly built-up cell can still hold green pockets. This is a statement about whole 1 km cells, not about whether Mumbai has anywhere to plant a tree.

### 10e. 2026-10-17: only open, easy-to-track indicators are scored

The index now scores only indicators any city can build from free, open, global data that is easy to re-pull: LST and NDVI (Landsat 8/9), population density (WorldPop), hospital distance (OpenStreetMap) and impervious share (ESA WorldCover). Two inputs were taken out:

- **Slum share.** Datameet's slum-cluster polygons are a one-off digitisation of Mumbai that is not updated, and most cities have nothing like it.
- **Under-7 share.** Census 2011 ward tables, fifteen years old, wired in for Mumbai only.

Both stay in the published cells as context. Their contributions were removed from the API (see [`api.md`](api.md)).

**What changed.** PC1's explained variance rose from 56.5% to 73.1%, and the weights became nearly even (18% to 22% each). Ten of the 24 wards changed rank, by at most 3 places. H/E moved from 4th to 7th, B from 6th to 4th, F/S from 8th to 6th, and C and L swapped first and second. The top five went from L, C, G/N, H/E, E to C, L, G/N, B, E. PCA and equal weights now agree almost exactly (tau 0.986, from 0.754), and the median rank interval narrowed from 7 places to 6.

**What it costs.** The index no longer measures informal housing or age directly. Wards whose vulnerability comes mainly from informal settlement are likely under-ranked: S has the third-highest mapped slum share of the 24 and ranks 18th. The trade is coverage and maintainability for one Mumbai-only social signal, made so the method can run and stay current anywhere.
