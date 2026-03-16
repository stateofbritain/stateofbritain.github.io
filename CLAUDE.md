# State of Britain — Project Guide

## What this is
A data-driven dashboard visualising the state of the UK across pillars: Foundations, Growth Engine, State Performance, and Policy Challenges. Built with React + Recharts, served as a static site.

## Data schema
All data files in `public/data/*.json` use the **sob-dataset-v1** schema. Read `data/SCHEMA.md` for the full specification before adding or modifying datasets. Key rules:
- Every file must have `"$schema": "sob-dataset-v1"` and required fields: `id`, `pillar`, `topic`, `generated`, `sources`
- Series live under `series.{seriesId}.data` — the compatibility shim (`src/hooks/useDataset.js`) unwraps these to top-level keys for components
- Nested domains use dot-notation keys (e.g. `broadband.fttp`) which the shim reconstructs as nested objects
- Snapshot values are bare scalars (not structured `{value, year}` objects)
- Run `node scripts/validate-data.js` before committing data changes

## Adding a new dataset
1. Write fetch script → `scripts/fetch-{id}.js` outputting v1 JSON to `public/data/{id}.json`
2. Validate: `node scripts/validate-data.js {id}`
3. Add enrichment entry in `data/enrichment.yaml`
4. Regenerate catalog: `node scripts/generate-catalog.js`
5. Build or extend pillar component using `fetchDataset()` or `useJsonDataset()` from `src/hooks/useDataset.js`
6. Register in `src/pillars/config.js` and `src/App.jsx`

## Key directories
- `public/data/` — v1 JSON data files (served to browser)
- `data/` — schemas, catalog, enrichment (server-side only, NOT in public/)
- `scripts/` — fetch, migration, validation, catalog generation
- `src/pillars/` — page components organised by pillar
- `src/hooks/useDataset.js` — data fetching with v1 auto-detection
- `src/components/MethodologyBreak.jsx` — renders methodology break reference lines
- `src/theme/` — palette, chart styles

## Commands
- `npm run dev` — local dev server
- `npx vite build` — production build
- `node scripts/validate-data.js` — validate all data files
- `node scripts/generate-catalog.js` — regenerate data/catalog.json
