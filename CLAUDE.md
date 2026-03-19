# State of Britain — Project Guide

## What this is
A data-driven dashboard visualising the state of the UK across pillars: Foundations, Growth Engine, State Performance, and Policy Challenges. Built with React + Recharts, served as a static site.

## Editorial tone
All text on the site must be neutral, precise, and trust the reader. The tone test: "Would a senior civil servant presenting to a cross-party select committee say this?" If not, rewrite it.

**Do:**
- State facts and let scale speak for itself — the reader sees the story without being told
- Use measured, everyday language suitable for a briefing note
- Present trade-offs symmetrically — both the gain and the cost
- Attribute contested claims ("Critics argue...", "The government's position is...")
- Where data is estimated or contested, say so
- Expand acronyms on first use (except widely known ones like MoD, NHS, GDP)

**Don't:**
- Editorialise: avoid "failed", "crisis", "broken", "myth", "stark", "dramatic", "collapsed", "soaring", "plummeted", "squeeze"
- Use rhetorical framing that implies an answer ("Why can't the UK...?")
- Add editorial weight to metrics ("36,816 — and rising")
- Second-guess political motivations
- Use em dashes — use commas instead

MetricCard `change` text should be factual context (year, source period), not editorial commentary ("and declining", "shrinking").

Section notes (`SECTION_NOTE`) should provide factual context in 2-3 sentences. State what the data shows, what geography/time period it covers, and any important caveats. Do not characterise trends as good or bad.

Pages have freedom in how they structure sections, which charts to use, how many metrics to show, and how to tell the story of the data. The standardised components (ChartCard, MetricCard, etc.) and editorial tone are the constraints; the layout and narrative follow the logic of the data itself.

## Data schema
All data files in `public/data/*.json` use the **sob-dataset-v1** schema. Read `data/SCHEMA.md` for the full specification before adding or modifying datasets. Key rules:
- Every file must have `"$schema": "sob-dataset-v1"` and required fields: `id`, `pillar`, `topic`, `generated`, `sources`
- Series live under `series.{seriesId}.data` — the compatibility shim (`src/hooks/useDataset.js`) unwraps these to top-level keys for components
- Nested domains use dot-notation keys (e.g. `broadband.fttp`) which the shim reconstructs as nested objects
- Snapshot values are bare scalars (not structured `{value, year}` objects)
- Methodology breaks should be declared in `series.{id}.methodologyBreaks`
- Run `node scripts/validate-data.js` before committing data changes

## Chart components
All charts must use the shared `ChartCard` component (`src/components/ChartCard.jsx`). Never define local ChartCard functions in page components. Key rules:
- **`title`** (required): Title Case heading (Playfair Display bold)
- **`subtitle`** (required): geography, units, date range (DM Mono)
- **`source`** (required): every chart must cite its data source. For v1 datasets, use `sourceFrom(raw, "seriesId")` from `src/hooks/useDataset.js` — this auto-renders the citation from the data file's embedded `sources[]` metadata. For non-v1 data or manual overrides, use `source={<>SOURCE: <a href="...">Source Name</a></>}`. All data should come from official government or equivalent authoritative sources.
- **`legend`** (optional): array of `{ key, label, color }` for colour-swatch legend rendered inside the card
- **`height`** (optional): wraps children in `ResponsiveContainer`. Use when there is a single Recharts element. Omit when chart card has multiple children (e.g. inline legend + chart).
- **`views`/`viewLabels`/`activeView`/`onViewChange`** (optional): for multi-view toggle charts

## Chart axis rules
- **Y-axis must start at zero** unless the data range is a small fraction of the absolute values and the trend would be invisible (e.g. life expectancy varying 78-83). When in doubt, start at zero.
- **X-axis must have proportional spacing.** When using numeric years as the X axis and the data has uneven intervals (e.g. 1970, 1980, 1990, 2000, 2005, 2010, 2023), use `<XAxis type="number" domain={["dataMin", "dataMax"]}/>` so that gaps are rendered proportionally. Never use categorical X axes for numeric time data with uneven spacing — this misleads the reader about rates of change.
- Charts should not be placed side by side (except in Public Spending where this is an intentional design choice). Stack charts vertically.

## Methodology breaks
When a data series has a methodology change, recording practice change, or data disruption (e.g. COVID), it must be marked visually on the chart with a vertical reference line. Two approaches:

1. **Via data schema** (preferred for v1 datasets): declare breaks in `series.{id}.methodologyBreaks` in the data file, then render with `<MethodologyBreak breaks={getBreaks(raw, "seriesId")} />` inside the Recharts chart.

2. **Via inline ReferenceLine** (for non-v1 data or one-off breaks): add a Recharts `<ReferenceLine>` directly. Use `position: "insideTopRight"` for the label to avoid clipping:
```jsx
<ReferenceLine x="2016-17" stroke={P.grey} strokeDasharray="4 4"
  label={{ value: "Methodology change", fontSize: 10, fill: P.grey,
           position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
```

Always mark methodology changes — they are essential context for interpreting the data correctly.

Other standard components:
- `Legend` (`src/components/Legend.jsx`) — shared colour-swatch legend, also usable via ChartCard's `legend` prop
- `MetricCard` — headline stat cards with colour accent
- `CustomTooltip` — dark navy Recharts tooltip
- `AnalysisBox` — context summary at page bottom
- Style constants in `src/theme/chartStyles.js`: `SECTION_HEADING`, `SECTION_NOTE`, `AXIS_TICK_MONO`, `yAxisLabel()`, `GRID_PROPS`

## Adding a new dataset
1. Write fetch script → `scripts/fetch-{id}.js` outputting v1 JSON to `public/data/{id}.json`
2. Validate: `node scripts/validate-data.js {id}`
3. Sync to API: `node scripts/sync-api-data.js`
4. Add enrichment entry in `data/enrichment.yaml` — include concise, AI-queryable summaries for the dataset and each series (these feed the catalog used by the chat product to identify relevant data)
5. Regenerate catalog: `node scripts/generate-catalog.js`
6. Build or extend pillar component using `fetchDataset()` or `useJsonDataset()` from `src/hooks/useDataset.js`
7. Register in `src/pillars/config.js` and `src/App.jsx`

## Key directories
- `public/data/` — v1 JSON data files (served to browser)
- `public/api/data/` — replicated data for public API (synced via `sync-api-data.js`)
- `data/` — schemas, catalog, enrichment (server-side only, NOT in public/)
- `scripts/` — fetch, migration, validation, catalog generation, API sync
- `src/pillars/` — page components organised by pillar
- `src/hooks/useDataset.js` — data fetching with v1 auto-detection, `sourceFrom()`, `getBreaks()`
- `src/components/ChartCard.jsx` — standard chart card wrapper
- `src/components/Legend.jsx` — shared legend component
- `src/components/MethodologyBreak.jsx` — renders methodology break reference lines
- `src/theme/` — palette, chart styles

## Commands
- `npm run dev` — local dev server
- `npx vite build` — production build
- `node scripts/validate-data.js` — validate all data files
- `node scripts/generate-catalog.js` — regenerate data/catalog.json
- `node scripts/sync-api-data.js` — sync public/data/ → public/api/data/ (run after any data update)
