# UCIP references

The papers and datasets behind each choice in the index, the plantability filter and the cooling estimates. The frontend's list (`frontend/src/lib/citations.ts`) is the copy shown on the methodology page; this file adds the reasoning. DOIs were checked to resolve on 2026-07-12 and 2026-07-21.

Some choices rest on no paper. They are listed at the end so they are not mistaken for cited ones.

## Papers

| Use | Paper | DOI | What it justifies |
|---|---|---|---|
| Index weighting | Reid et al. 2009, *Environ. Health Perspect.* 117(11):1730-1736 | 10.1289/ehp.0900683 | The method: standardise the indicators and weight by principal components. The weights themselves come from Mumbai's own cells. |
| India precedent | Azhar et al. 2017, *IJERPH* 14(4):357 (RAND India HVI) | 10.3390/ijerph14040357 | A district-level heat vulnerability index for India; UCIP works at ward level |
| Where trees can go | Bastin et al. 2019, *Science* 365(6448):76-79 | 10.1126/science.aax0848 | Tree restoration potential, used as the starting point for plantability |
| Where trees should not go | Veldman et al. 2019, *Science* 366(6463):eaay7976 | 10.1126/science.aay7976 | The estimate is several times too large, and grasslands and savannas should not be afforested. This is what the plantability filter enforces. |
| Carbon caveat | Friedlingstein et al. 2019, *Science* 366(6463):eaay8060 | 10.1126/science.aay8060 | Trees are not a substitute for cutting emissions |
| Regrowth caveat | Lewis et al. 2019, *Science* 366(6463):eaaz0388 | 10.1126/science.aaz0388 | Regrowth mostly replaces carbon that was already lost |
| Tree canopy cooling | Ziter et al. 2019, *PNAS* 116(15):7575-7580 | 10.1073/pnas.1817561116 | Canopy cover to daytime cooling, for the simulator |
| Cool-roof cooling | Li, Bou-Zeid and Oppenheimer 2014, *Environ. Res. Lett.* 9(5):055002 | 10.1088/1748-9326/9/5/055002 | Surface heat falls roughly linearly as the cool-roof share rises |
| Albedo coefficient | Santamouris 2014, *Solar Energy* 103:682-703 | 10.1016/j.solener.2012.07.003 | About 0.6 to 2.3 K of peak cooling per +0.1 albedo |
| Park cooling | Bowler et al. 2010, *Landscape and Urban Planning* 97:147-155 | 10.1016/j.landurbplan.2010.05.006 | Parks average about 0.94 C cooler than their surroundings by day |

## Cooling coefficients in the simulator

All of these come from studies in other cities and are not calibrated for Mumbai.

- **Tree canopy (Ziter et al. 2019).** Cooling is nonlinear. Below about 40% canopy within 60 to 90 m there is little daytime change; from 40% to 80% there is about 1 C. The index does not use this threshold; the simulator does.
- **Albedo (Santamouris 2014).** 0.57 to 2.3 K of peak cooling per +0.1 albedo across the cities reviewed. The simulator uses the conservative end.
- **Cool-roof share (Li et al. 2014).** Supports a linear cool-roof term.
- **Pocket parks (Bowler et al. 2010).** The paper reports a park-versus-surroundings difference, not ward-wide coverage. Scaling it linearly by the share of a ward turned into park is our own assumption.

## Datasets

| Variable | Dataset | Licence | Scored? |
|---|---|---|---|
| Land surface temperature | Landsat 8/9 Collection 2 Level 2, USGS, via Earth Engine | public domain | yes |
| NDVI | Landsat 8/9 Collection 2 Level 2, current and 2016-17 dry seasons | public domain | yes |
| Population density | WorldPop 100 m, 2020 (the latest India image) | CC BY 4.0 | yes |
| Hospital distance | OpenStreetMap `amenity=hospital`, via Overpass | ODbL | yes |
| Impervious share | ESA WorldCover v200 (2021), 10 m | CC BY 4.0 | yes |
| Slum share | Datameet `slumClusters.geojson`, mapped cluster boundaries | ODbL | no, context only |
| Under-7 share | Census of India 2011 ward tables, via OpenCity | GODL-India | no, context only |
| Ward boundaries | Datameet Municipal Spatial Data, `BMC_Wards.geojson`, 24 wards | ODbL | n/a |
| Ground check | NOAA Global Summary of the Day, Santacruz and Colaba | public domain | n/a |

The slum and under-7 shares were scored until 2026-10-17. They were taken out because neither exists for most cities or gets updated.

## Choices with no paper behind them

- The 30% floor on PC1 explained variance below which equal weights are used.
- The 0.5 share at which one factor is said to dominate a ward.
- The +/-0.05 NDVI band that separates "stable" from gained or lost green cover.
- The rain-garden rule's 500 m distance to open water, a proxy with no hydrology layer behind it.
- The p25 and p75 cut-offs in the intervention rules and the plantability filter.
- The pocket-park rule, which follows the C40 Urban Cooling Toolbox, a practice guide with no DOI.
