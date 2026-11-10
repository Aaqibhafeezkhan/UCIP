# Contributing to UCIP

Thanks for looking at improving **UCIP**. By participating you agree to the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Quick setup

Frontend (Next.js):

```bash
git clone https://github.com/AnayDhawan/ucip.git
cd ucip/frontend
npm install
cp ../.env.example .env.local   # fill in Supabase keys if you need live data
npm run dev
```

Pipeline (Python, only needed if you're touching the data layer):

```bash
cd pipeline
python -m venv .venv
.venv\Scripts\activate      # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
earthengine authenticate     # needs your own Google Earth Engine account
```

The pipeline scripts (`00`-`15`) require a Google Earth Engine project and Supabase
credentials to run end-to-end; the committed GeoJSON snapshots in `data/` let the frontend
run without either. Run the full chain in order with `python pipeline/run_pipeline.py`
rather than invoking each script by hand; see [pipeline/README.md](pipeline/README.md)
for usage, the twice-weekly refresh schedule, and the post-refresh change-diff tool.

## How to contribute

### Reporting bugs

Open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml).
Include steps to reproduce, expected vs actual behavior, and browser/OS.

### Requesting features

Open an issue using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml).

### Submitting a PR

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`.
2. Make your change.
3. Verify inside `frontend/`: `npm run lint && npm test && npm run build` must pass
   clean. Pipeline changes also need `python -m pytest` inside `pipeline/`. CI runs both.
   CI also fails on stale generated files, so depending on what you changed:
   - API routes or `frontend/src/lib/openapiSpec.ts`: run `npm run generate` in
     `clients/typescript` and `python scripts/generate.py` in `clients/python`, and commit the
     diffs (`clients/openapi.json`, `src/types.gen.ts`, `src/ucip/models.py`).
   - `config/cities/*.json`: run `python pipeline/sync_city_config.py` and
     `python pipeline/validate_cities.py --allow-missing-data` from the repo root.
   - `mcp-server/`: run `npm ci && npx tsc -p tsconfig.json --noEmit && npm test` there.
4. Open a PR against `main` using the template.

## Data and methodology changes

UCIP's whole pitch is that every number is computed and every claim is cited. If your PR
changes an HVI weight, an NBS rule, or a data source:

- Update `docs/methodology.md` and `docs/references.md` in the same PR, not a follow-up.
- Cite the paper or dataset (DOI where one exists) in `frontend/src/lib/citations.ts`.
- Don't hardcode a data vintage silently; see `pipeline/03_vectors.py`'s `WORLDPOP_YEAR`
  pin for the pattern (explicit, disclosed, not just "whatever the API returns first").

## Code style

- TypeScript/React: follow the existing ESLint config (`npm run lint`), Tailwind v4
  CSS-first tokens in `globals.css`; don't hand-roll new color values.
- Python: match the existing numbered-script style in `pipeline/` (`01_grid.py`,
  `02_gee_layers.py`, ...); each script does one pipeline stage and is runnable standalone.
- No em dashes in prose (docs, commit messages, UI copy).

## PR guidelines

- One PR per change. Keep scope tight.
- PR description explains *why*, not just *what*.
- Map/legend colors (`WardChoropleth.tsx`'s HVI/plantability/NDVI-change palettes) are
  semantic and DO NOT get restyled for aesthetics; see `DESIGN.md`.
- AI-assisted code is welcome, provided you've reviewed and tested the output.

## Releasing

A release is cut by pushing a `v`-prefixed tag, which runs
`.github/workflows/release.yml`. Before tagging `vX.Y.Z`, change these in one PR:

- `CHANGELOG.md`: move the `## [Unreleased]` entries under `## [X.Y.Z] - YYYY-MM-DD`,
  and leave a fresh, empty `## [Unreleased]` heading above it, since the PR template
  tells contributors to write under that heading. The release notes are read from
  the `## [X.Y.Z]` entry, and the workflow fails without it.
- `CITATION.cff`: set `version` and `date-released`. The workflow checks `version`
  against the tag. Leave the top-level `doi:` alone: it is the concept DOI, which
  always resolves to the latest version, so it never changes.
- `frontend/package.json` and `frontend/package-lock.json`: set `version` to match.
  `npm version X.Y.Z --no-git-tag-version` inside `frontend/` updates both.

Merge that PR to `main` once CI is green. Then tag from the merge commit and push
the tag, only after the merge:

```bash
git checkout main && git pull
git tag vX.Y.Z
git push origin vX.Y.Z
```

The tag runs `release.yml`, which builds the frontend (`npm ci` and `npm run build`
only, no tests, so CI on the release PR is the gate), builds the release notes from
the matching `CHANGELOG.md` heading, checks that `CITATION.cff` matches the tag,
rebuilds the dataset and creates the GitHub release with the dataset files
attached. Zenodo mints the version DOI from that release.

If the workflow fails, fix the cause in a new commit that reaches `main`, then
delete the tag (`git tag -d vX.Y.Z` and `git push origin :refs/tags/vX.Y.Z`),
re-create it on the new commit and push it again.

Once Zenodo mints the version DOI, a follow-up PR adds it as a new entry under
`identifiers:` in `CITATION.cff`, with `type: doi`, the DOI as `value` and
`description: vX.Y.Z`. Do not overwrite the top-level `doi:`.

These have versions of their own and do not change at a release:

- The API spec's `info.version` in `frontend/src/lib/openapiSpec.ts` (and so
  `clients/openapi.json`). It versions the `v1` API contract, not the site or the
  dataset; see [docs/api.md](docs/api.md#versioning). Changing it means regenerating
  both clients.
- `clients/typescript`, `clients/python` and `mcp-server`. Each follows its own
  semver and moves when its own code changes. The TypeScript client is published by
  pushing a `ts-client-vX.Y.Z` tag, where `X.Y.Z` matches `version` in
  `clients/typescript/package.json` and the tagged commit is already on `main`
  (see `.github/workflows/publish-ts-client.yml`). The Python client's version lives
  in two places that must change together: `clients/python/pyproject.toml` and
  `clients/python/src/ucip/__init__.py`.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add sensitivity-analysis chart to methodology page
fix: correct ward area lookup for split wards
docs: update citation DOI for cool-roof coefficient
```

Types: `feat | fix | docs | style | refactor | perf | test | ci | chore`
