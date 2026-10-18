# A transparent, open-data heat vulnerability index for Mumbai's 24 wards

Anay Dhawan, independent researcher

Technical report for the Urban Climate Intelligence Platform (UCIP)

*Draft status, removed before submission: written for issues #66 and #90 and not yet submitted. What remains to be decided is listed in `docs/preprint/SUBMISSION.md`. Every figure below was read from this repository's committed pipeline output (`data/hvi_pca_log.json`, `data/sensitivity.json`, `data/hvi_uncertainty.json`, `data/weighting_comparison.json`, `data/lst_validation.json`, `data/nbs_recommendations.json`, `data/cells_ndvi_change.geojson`), from the run recorded in `data/pipeline_run_log.json` (finished 2026-10-17), and not re-derived. Two exceptions are labelled where they occur: the 500 m comparison in section 6c and the account of the removed elderly indicator in section 10, both computed on the earlier seven-indicator index. The dataset is archived at doi:10.5281/zenodo.22923919.*

---

## Abstract

Heat risk is uneven within a city, and so is the ability to cope with it. This report describes the Heat Vulnerability Index (HVI) that UCIP computes for the 24 Brihanmumbai Municipal Corporation (BMC) wards of Mumbai. The index combines five indicators on a 1 km grid, chosen because any city can build them from free, open, global data that is easy to re-pull: dry-season land surface temperature, vegetation, population density, distance to a hospital, and impervious surface. Weights come from the first principal component of the standardised indicators. A rule-based engine turns each cell's scores into a cooling recommendation, and an ecological filter withholds tree planting where the land cover makes it inappropriate.

Most of the report is about how far the ranking can be trusted. We test it four ways: perturbing the weights, bootstrapping the cells, comparing principal-component weights with equal weights, and rebuilding the dataset on a 500 m grid. The median ward's 95% rank interval spans 6 of 24 places, and no ward's rank is certain. With five indicators the principal-component weights are nearly even, and equal weighting reproduces the ranking almost exactly (Kendall's tau 0.986, the same top five).

We also report three decisions about our own work. An elderly share taken from WorldPop carried district-level information under a ward-level label and was removed. Two Mumbai-only inputs, informal-settlement coverage and the share of young children, were taken out of the index because they cannot be found for most cities or kept current; the cost is that the index no longer measures informal housing or age. And with the ecological filter working as intended, the tree-planting recommendation fires for no cell in Mumbai, because every cell that is both hot and bare is built-up land.

## 1. Introduction

Heat is a public-health hazard in cities, and adaptation planning needs to know where to act. A single citywide temperature says nothing about which neighbourhoods to look at first or what kind of intervention suits them. UCIP tries to answer at the level a municipal planner works: which of the 24 wards are most exposed, why, and what could cool them, with the uncertainty stated.

The index and the recommendation engine are built so that they can be checked. Weights are derived from the data by a published method instead of being set by judgement, every score breaks down into per-indicator contributions, and the sections below say where the results are weak. The in-app methodology page (`/methodology`) and `docs/methodology.md` describe the same work in outline. This report is the version that can be read and cited without the product.

## 2. Prior art

UCIP was designed after comparing five existing efforts: the Mumbai Climate Action Plan (MCAP 2022), the district-level India HVI of Azhar et al. (2017), IIT Bombay's work on Mumbai's surface urban heat island, the C40 Urban Cooling Toolbox, and the Ahmedabad Heat Action Plan. Against those five it differs in three ways. The index weights come from the city's own data. A rule-based engine attaches a recommendation to each score. And an ecological filter can reject afforestation on ecological grounds (section 7).

## 3. Study area and data

Mumbai is analysed on a 1 km grid and rolled up to the 24 BMC wards of the Datameet boundary file. BMC has since opened a K North ward (split from K/E) and reportedly split P North; no open boundary file for the new wards exists, so the analysis stays on 24. `pipeline/01_grid.py` clips a fishnet to the ward boundaries in a metric projection (EPSG:32643, UTM zone 43N) and assigns each cell to the ward that holds its largest fragment, which gives 547 cells. Stage 04 (`pipeline/04_zonal.py`) removes cells that cannot be scored: any cell missing a scored indicator, and any cell with zero WorldPop population, which has no residents to be vulnerable. At 1 km that removes 6 of the 547. All six have zero population, and four have negative NDVI, which fits open water or bare coast. The remaining 541 cells are the basis for every later stage.

| Layer | Source | Licence | Note |
|---|---|---|---|
| Land surface temperature (LST) | Landsat 8/9 Collection 2 Level-2, `ST_B10`, via Google Earth Engine | public domain | Dry-season median composite, cloud and shadow masked with `QA_PIXEL` |
| NDVI (current and baseline) | Landsat 8/9 Collection 2 Level-2, `SR_B4` and `SR_B5` | public domain | Two dry-season composites about nine years apart, for the green-cover-change layer (section 8) |
| Population density | WorldPop 100 m, pinned to the `IND_2020` image | CC BY 4.0 | Modelled. 2020 is the latest year WorldPop publishes for India in this collection, and the pin is explicit in `pipeline/03_vectors.py` |
| Hospital access | OpenStreetMap `amenity=hospital`, via `osmnx` and Overpass | ODbL | Straight-line distance from each cell to the nearest hospital centroid |
| Impervious surface, land-cover class | ESA WorldCover v200 (2021) | CC BY 4.0 | Also the input to the plantability filter (section 7) |
| Ward boundaries | Datameet BMC ward boundaries | ODbL | 24 features |
| Context only: slum-cluster coverage | Datameet `slumClusters.geojson` | ODbL | Published per cell, not scored (section 4) |
| Context only: share aged 0 to 6 | Census of India 2011 Primary Census Abstract, Census-ward level, via OpenCity | public | Published per cell, not scored (section 4) |

## 4. Indicators and direction

Five indicators feed the index. Each has a direction: +1 when a higher raw value means more vulnerability, and -1 when it means less, in which case the value is inverted before scoring. NDVI is the only -1.

| Indicator | Direction | Unit | Observed range (541 cells) |
|---|---|---|---|
| `LST_C` (land surface temperature) | + | degrees C, land surface and not air | 26.24 to 39.95 |
| `NDVI` (vegetation index) | - | unitless index, not a canopy percentage | -0.07 to 0.71 |
| `pop_density_km2` (population density) | + | people per km2 | 16 to 115,272 |
| `hospital_dist_m` (distance to nearest hospital) | + | metres | 3.86 to 6199.03 |
| `impervious_pct` (impervious surface share) | + | % (0-100) | 0.00 to 96.79 |

The selection rule, adopted on 2026-10-17, is that a scored indicator must come from free, open, global data that any city can obtain and re-pull on a schedule. Two inputs used earlier fail it. The slum-cluster coverage comes from a one-off digitisation of Mumbai that is not updated, and comparable layers do not exist for most cities. The share of children aged 0 to 6 comes from 2011 Census ward tables, fifteen years old and wired in for Mumbai only. Both are still published per cell as context. The cost of the rule is real: the index no longer measures informal housing or age directly, and wards whose vulnerability comes mainly from informal settlement are likely under-ranked. Earlier builds also had an elderly share, which section 10 explains.

## 5. Computing the HVI

**Standardisation.** Each indicator is z-standardised across all cells (`pipeline/05_hvi.py`). For an indicator column $x$, $z = (x - \bar{x}) / \sigma_x$, using the population standard deviation (`ddof=0`). The result is multiplied by the indicator's direction sign, so a higher signed z-score always means more vulnerable.

**Weights (PCA, Reid et al. 2009).** A principal component analysis is fitted to the signed z-score columns. The explained-variance ratio of the first component is compared with a floor of 0.30. If it is at or above the floor, the component's loadings give the weights. The component is first oriented so that a higher score means more vulnerable, by correlating its scores with the signed `LST_C` z-score and flipping the sign if the correlation is negative. The weight for indicator $i$ is its absolute loading divided by the sum of absolute loadings:

$$w_i = \frac{|\ell_i|}{\sum_{j=1}^{p} |\ell_j|}$$

where $\ell_i$ is the oriented PC1 loading and $p$ is the number of indicators. If PC1 falls below the floor, the pipeline falls back to equal weights, $1/p$ each, which is the component-level default in Reid et al. (2009), and logs that the fallback fired.

**Values in the committed run.** PC1 explains 73.1% of the variance, above the floor, so the fallback did not fire.

| Indicator | PC1 loading | Weight |
|---|---:|---:|
| `LST_C` | 0.454 | 0.203 |
| `NDVI` | 0.406 | 0.182 |
| `pop_density_km2` | 0.468 | 0.210 |
| `hospital_dist_m` | -0.410 | 0.184 |
| `impervious_pct` | 0.492 | 0.221 |

The weights are close to even. One loading has the opposite sign: hospital distance loads at -0.410 while the other four load positively. In Mumbai the hot, dense, paved cells sit close to hospitals, so the main axis of variation runs toward shorter hospital distance. The index keeps the literature's direction for this indicator (farther from care means more vulnerable) and takes its weight from the size of the loading. That is a judgement. The alternative, letting PC1's sign decide, would make proximity to a hospital count as vulnerability, which no source we know of supports. We flag it as the method's main open question.

The weights are recomputed from the current data on every pipeline run. What is fixed, and cited, is the procedure.

**Score.** For each cell, `HVI_raw` is the weighted sum of signed z-scores, $\sum_i w_i z_i$, and `HVI` is `HVI_raw` rescaled linearly to 0-100 across all cells in the run. A ward's HVI is the unweighted mean of its cells' scores, and its rank is `HVI` sorted in descending order, so rank 1 is the most vulnerable. In the committed run the five highest-ranked wards are C, L, G/N, B and E, with HVI of 82.6, 72.0, 71.2, 70.6 and 69.5. The largest single contribution comes from `impervious_pct` for C, G/N and E (0.356, 0.264 and 0.283), from `LST_C` for L (0.253), and from `NDVI` for B (0.258).

**Explanation.** Each cell's contribution from each indicator (weight times signed z-score) is stored with its score and shown as a ranked bar chart in the product. The index is a weighted linear sum, so this breakdown is the complete explanation of any score, with no black-box model and no need for a post-hoc method such as SHAP. No ward has a single indicator carrying half or more of its total absolute contribution.

## 6. Sensitivity to the weights

`pipeline/08_sensitivity.py` perturbs each of the five weights by +20% and by -20% in turn, renormalises the others so the weights still sum to 1, and recomputes the ranking. That gives 10 runs, each compared with the unperturbed ranking by Kendall's tau over all 24 wards and by top-5 overlap.

Mean tau across the 10 runs is 0.985 (lowest 0.971), and mean top-5 overlap is 4.8 of 5. In 8 of the 10 runs the top five is exactly the baseline set (C, L, G/N, B, E). In the other two, raising the population-density weight or lowering the impervious weight, F/S replaces E. Wards C, L, G/N and B are in the top five in every run, and C is first in all 10.

The run output records only the top five for each perturbation, so this section says nothing about how ranks below fifth move. Section 6a covers the whole table.

## 6a. How precise is a ward's rank? A bootstrap

The perturbation study varies the weights and holds the sample fixed. It does not ask whether a different sample would change the result, and that matters just as much, since the PCA weights are themselves estimated from 541 cells.

`pipeline/uncertainty.py` resamples the cells with replacement 1,000 times (seed 20260923) and reruns the whole chain on each replicate: z-scores, PCA, weights, per-cell index, 0-100 rescale, ward roll-up and rank. Holding the z-scores and the rescale fixed and varying only the weights would understate the uncertainty while looking rigorous. The intervals are 95% percentile intervals.

The median ward's rank interval spans 6 of 24 places. The widest belongs to ward B, ranked 4th, whose interval runs from 1st to 18th, 17 places. No ward's rank is certain.

Some statements survive this and some do not. Ward C's interval is 1st to 2nd, so C being among the most vulnerable holds. T and R/C, ranked 24th and 23rd, both have intervals of 21st to 24th, so being among the least vulnerable holds too. The 9th-ranked ward (M/W, 4th to 13th) and the 11th (G/S, 7th to 13th) overlap almost completely, and two mid-table wards should be treated as tied.

We report this because publishing a rank as a bare integer invites readers to assume a precision the method does not have.

## 6b. Does the choice of weights change the answer?

`pipeline/compare_weightings.py` computes the ranking under the PCA weights and under equal weights on the same data. Kendall's tau between the two is 0.986 and Spearman's rho is 0.998. Twenty of the 24 wards get the same rank, and no ward moves more than one place (G/N and B swap 3rd and 4th; R/S and M/E swap 16th and 17th). The top fives are identical as sets (PCA order C, L, G/N, B, E; equal-weight order C, L, B, G/N, E). Dropping the lowest-weighted indicator, NDVI, and refitting both schemes gives tau 0.978 and again the same top five.

This is a large change from the seven-indicator index, where the two schemes agreed at tau 0.754 and shared three of five top wards. Nearly all of that disagreement came from the child share, which PCA weighted at 2.7% and equal weighting at 14.3%. With the five open-data indicators, PCA gives each between 18% and 22%, close to the 20% of equal weighting, so the choice of scheme barely matters. A high correlation does not show that PCA weighting is correct; it shows that, for this indicator set, the result does not depend on that choice.

## 6c. Does the grid resolution change the answer?

*Computed on the seven-indicator index of 2026-09-24 and not yet re-run on the five-indicator index.*

Rebuilding the dataset at 500 m changes the unit of analysis rather than resampling it: 1,975 published cells instead of 541, about 82 per ward instead of 23, with every stage rerun. On the seven-indicator index, thirteen of the 24 wards changed rank between resolutions, yet every ward's 500 m rank fell inside its own 95% bootstrap interval from the 1 km data, 24 out of 24. The two methods disagreed about the order and agreed about which parts of the order carry information: a rank near the top or bottom is a finding, and a rank in the middle depends on where the grid lines fell.

1 km remains the published resolution. The 500 m dataset is reproduced with `python pipeline/run_pipeline.py --cell-size 500`, writes to its own directory, and is not published.

## 6d. Validation against station observations

`pipeline/13_validate_lst.py` compares the satellite composite with NOAA GSOD station air temperature at Santacruz and Colaba. Per-overpass Landsat 8/9 `ST_B10` LST, cloud masked, is averaged within 500 m of each station and matched to the station's mean for that day. Station data is published with a lag, so the check uses the 2024-25 dry season (November to February), one season earlier than the index.

The pooled within-station Pearson r is 0.716 over 23 matched station-days, computed on anomalies about each station's own mean. The LST-minus-air offset ranges from 3.43 to 13.94 degrees C across stations.

Land surface temperature is the radiometric temperature of the ground, and station temperature is shaded air at about 1.5 m, so a large positive offset is expected. The correlation asks whether the composite follows real day-to-day thermal variation, and at 0.716 it does, with the caution that 23 station-days is a small sample and two stations are few. The spread of the offset also means no single correction turns this layer into air temperature, which is why the index treats LST as a relative indicator.

## 7. Recommendations and the ecological plantability filter

Given a cell's HVI and its indicators, `pipeline/06_nbs.py` fires one or more rule-based recommendations, each with a plain-language rationale and a citation. "High" and "low" mean the 75th and 25th percentile of that indicator across the current run's cells. Those cut-offs are our judgement.

| Condition | Recommendation | Citation |
|---|---|---|
| HVI at or above p75, NDVI at or below p25, cell plantable | Native tree planting and green corridors | Bastin et al. 2019 |
| HVI at or above p75, NDVI at or below p25, cell not plantable | Cool roofs, reflective pavements and cooling centres | Veldman et al. 2019 |
| `impervious_pct` at or above p75 and within 500 m of mapped water or wetland | Rain gardens and water-sensitive urban design | No paper: our own proxy, with no hydrology layer |
| `pop_density_km2` at or above p75 and NDVI at or below p25 | Pocket parks | C40 Urban Cooling Toolbox (practice guide) |

A cell can receive the tree-planting recommendation only if it is not water, wetland, mangrove or built-up (WorldCover classes 50, 80, 90 and 95), is not native grassland (class 30, following Veldman et al. 2019), and has impervious cover below the 75th percentile. A cell that clears the vulnerability bar but fails the ecological check gets the non-tree recommendation instead.

In the committed run 161 of 541 cells (30%) are plantable. The engine fires 62 ward-level recommendation rows: 24 rain-garden, 20 cool-roof and 18 pocket-park. Every ward receives at least one. **The tree-planting recommendation fires nowhere.** Eighty-one cells are both hot (HVI at or above p75) and bare (NDVI at or below p25), and all 81 are built-up land with a median impervious share of 78.4% against a plantable ceiling of 68.4%. Each cell takes the most common WorldCover class within it, and a mostly built-up cell can still contain green pockets, so this says that no whole 1 km cell is a planting site. It does not say that Mumbai has nowhere to plant a tree.

An earlier build of this filter compared floating-point class codes with integers. Earth Engine's mode reducer returns a float, so a built-up cell could arrive as 50.00000000000015 and fail an equality test against 50. That let 175 of the 337 cells then marked plantable through: 127 built-up, 30 mangrove, 17 open water and 1 native grassland. It was corrected on 2026-09-24. Dataset releases up to and including 1.0.2 predate the correction and carry the error.

## 8. Green-cover change

`pipeline/09_ndvi_change.py` classifies each cell's NDVI change between the current dry-season composite and the 2016-17 baseline as gained (above +0.05), lost (below -0.05) or stable. The threshold is a documented choice and not a value from a paper. Across the 541 cells, 445 are stable, 84 gained and 12 lost.

## 9. Simulator coefficients

A separate part of the product (`/simulate`, `frontend/src/lib/coefficients.ts`) estimates the cooling effect of a hypothetical intervention, using coefficients from the literature and not fitted to Mumbai. Canopy cooling follows Ziter et al. (2019): negligible below about 40% canopy cover, rising to about 1.0 degree C of daytime cooling at 80%, and capped beyond the paper's range. Cool-roof cooling uses 0.6 degrees C per +0.1 albedo as the headline figure, with the 0.57 to 2.3 range from Santamouris (2014) exposed as uncertainty, and Li, Bou-Zeid and Oppenheimer (2014) cited in support of treating the relationship as linear. Pocket-park cooling scales a 0.94 degree C park-cool-island ceiling (Bowler et al. 2010) linearly by the share of ward area converted to park, which is our own simplifying assumption. The three terms are added independently.

The simulator is not part of the HVI.

## 10. Limitations

**Land surface temperature is not air temperature, and it is daytime only.** `LST_C` measures the surface by day. Night-time heat, which does the most harm to health, is not in the index.

**Informal housing and age are not scored.** See section 4. Wards whose vulnerability comes mainly from informal settlement are likely under-ranked: S has the third-highest mapped slum share of the 24 (10.5% of its area) and ranks 18th.

**Hospital distance runs against the main axis.** See section 5.

**The cooling coefficients come from other cities.** They come from studies in eastern North America, city-scale reviews and a Baltimore-Washington simulation, and nobody has validated them in Mumbai.

**The boundary file is out of date.** It has 24 wards; BMC's newer wards are not reflected.

**There is no elderly indicator, and the reason matters.** *(Figures in this paragraph and the next three are from the seven-indicator index in use before 2026-09-24.)* Earlier builds had one. It came from WorldPop's India age-sex product, a 100 m raster, which applies district age structure to a population raster. Across the 541 cells, 80% shared one value and two values covered 95.6%, splitting the city exactly along the revenue district line: all nine Mumbai City wards read 5.586 and all fifteen Mumbai Suburban wards read 4.757.

The layer was not inert. Standardising turned a 0.83-point gap between two districts into a large z-score; the indicator took 13.6% of total absolute contribution, and dropping it moved 13 of the 24 wards by up to 4 places. The same layer fed a cooling-centre rule that fired wherever the elderly share was in its top quartile, which in practice meant which district a cell was in.

We removed the indicator and the rule, and did not relabel them. The fix would be ward-level Census age structure at 60 and over, and the ward-level Primary Census Abstract has the 0 to 6 band only. The evaluation behind this, `pipeline/elderly_evaluation.py` and its output, was deleted with the indicator and is in the repository history before 2026-09-24.

The index has no measure of the elderly, a group at particular risk in heat, and since 2026-10-17 no measure of age at all. It should not be presented as capturing age vulnerability.

**Tree planting never fires.** Section 7 explains why. It is a result about the 1 km grid and the modal land-cover class, not about individual sites.

**The ranking is imprecise.** Section 6a puts the median ward's 95% rank interval at 6 places and finds no certain rank. Any use of the ranking that turns on a difference of a few places is not supported.

**Weights depend on the snapshot.** The PCA weights are recomputed from the current cells. The sensitivity and weighting results suggest the ranking does not depend much on them, but they are not fixed across every possible rerun.

**Satellite coverage varies by cell.** Cells are flagged when their dry-season composite rests on fewer than three clear Landsat observations. On the current grid the count runs from 8.9 to 12.0 per cell, so no cell is flagged.

**Coarse land cover.** WorldCover is 10 m data aggregated to 1 km cells by modal class, and flood exposure is a single proxy, distance to mapped water or wetland, not a hydrology layer.

## 11. Reproducibility

Every figure in this report came from a file the repository's own pipeline produced, listed in the status note at the top. The pipeline runs end to end with `python pipeline/run_pipeline.py --include-annual` (see `pipeline/README.md`) and regenerates all of them from the same sources and procedure. The evaluations are each a script in `pipeline/`: `uncertainty.py`, `compare_weightings.py`, `08_sensitivity.py` and `13_validate_lst.py`. The 500 m comparison in section 6c is reproduced with `--cell-size 500`, which writes to its own directory and never overwrites the published 1 km outputs.

The dataset is archived on Zenodo with the concept DOI 10.5281/zenodo.22923919, which resolves to the latest release. Releases up to 1.0.2 predate the plantability correction and the five-indicator index, so cite a later one.

## 12. References

| Use | Citation | DOI |
|---|---|---|
| HVI weighting method | Reid et al. 2009, *Environ. Health Perspect.* 117(11):1730-1736 | 10.1289/ehp.0900683 |
| India-wide district HVI | Azhar et al. 2017 (RAND India HVI), *IJERPH* 14(4):357 | 10.3390/ijerph14040357 |
| Tree restoration potential | Bastin et al. 2019, *Science* 365(6448):76-79 | 10.1126/science.aax0848 |
| Critique of afforestation everywhere (plantability filter) | Veldman et al. 2019, *Science* 366(6463):eaay7976 | 10.1126/science.aay7976 |
| Carbon-cycle critique, companion | Friedlingstein et al. 2019, *Science* 366(6463):eaay8060 | 10.1126/science.aay8060 |
| Regrowth critique, companion | Lewis et al. 2019, *Science* 366(6463):eaaz0388 | 10.1126/science.aaz0388 |
| Canopy and LST reduction | Ziter et al. 2019, *PNAS* 116(15):7575-7580 | 10.1073/pnas.1817561116 |
| City-scale cool-roof simulation | Li, Bou-Zeid and Oppenheimer 2014, *Environ. Res. Lett.* 9(5):055002 | 10.1088/1748-9326/9/5/055002 |
| Albedo and peak temperature | Santamouris 2014, *Solar Energy* 103:682-703 | 10.1016/j.solener.2012.07.003 |
| Pocket-park cooling | Bowler et al. 2010, *Landscape and Urban Planning* 97:147-155 | 10.1016/j.landurbplan.2010.05.006 |

The DOIs were checked against publisher resolvers as recorded in `docs/references.md`, and this report does not check them again.
