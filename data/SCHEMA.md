# State of Britain — Dataset Schema v1

Every JSON file in `public/data/` must conform to this schema.
Machine-readable version: [`data/schema/dataset-v1.json`](schema/dataset-v1.json).

---

## Top-level structure

```jsonc
{
  "$schema": "sob-dataset-v1",          // required, always this exact string
  "id": "family",                       // required, matches filename without .json
  "pillar": "foundations",              // required, one of: foundations | growth | state | challenges
  "topic": "family",                    // required, topic slug
  "generated": "2026-03-06",           // required, ISO date of last generation

  "sources": [ ... ],                   // required, at least one
  "snapshot": { ... },                  // optional, headline metrics
  "series": { ... }                     // optional, named data series
}
```

No other top-level keys are allowed.

---

## Sources

Every data point must be traceable to a source. Each source needs a unique `id` used by series and snapshot entries.

```jsonc
"sources": [
  {
    "id": "ons-births-2024",                    // required, short slug
    "name": "ONS Births in England and Wales",  // required, human-readable
    "url": "https://...",                        // optional
    "publisher": "ONS",                          // optional
    "note": "Table 1, live births only"          // optional, methodology notes
  }
]
```

---

## Snapshot

Headline metrics for MetricCard components. Values are **bare scalars** — the same key/value pairs the component reads directly.

```jsonc
"snapshot": {
  "tfr": 1.41,
  "tfrYear": 2024,
  "perPupilLatest": 6310,
  "perPupilYear": "2023-24",
  "perPupilPeak": 6720,
  "perPupilPeakYear": "2009-10",
  "perPupilChange": -6.1,
  "teacherCount": 468,
  "teacherCountUnit": "k"
}
```

**Naming convention**: use the pattern `{metric}`, `{metric}Year`, `{metric}Peak`, `{metric}PeakYear`, `{metric}Change`, `{metric}Unit` — but the base doesn't have to be the exact main key name. The v0 naming was irregular (e.g. `perPupilLatest` with `perPupilYear`), and components depend on these exact names, so snapshot values are preserved verbatim through the compatibility shim.

---

## Series

Each entry in `series` wraps a data array with metadata. The key is the `seriesId`.

```jsonc
"series": {
  "tfrByOrder": {
    "sourceId": "ons-births-2024",   // required, references a sources[].id
    "timeField": "year",             // required, which field is the x-axis
    "methodologyBreaks": [ ... ],    // optional, see below
    "data": [                        // required, array of objects (the chart data)
      { "year": 1960, "tfrTotal": 2.72, "tfr1": 0.93 },
      { "year": 1965, "tfrTotal": 2.86, "tfr1": 0.97 }
    ]
  }
}
```

### Dot-notation keys for nested domains

When a dataset covers multiple sub-domains (e.g. infrastructure covers broadband, rail, roads), use dot-notation series keys. The compatibility shim reconstructs nested objects automatically:

```jsonc
"series": {
  "broadband.fttp": { "sourceId": "ofcom", "timeField": "year", "data": [ ... ] },
  "broadband.gigabit": { "sourceId": "ofcom", "timeField": "year", "data": [ ... ] },
  "rail.punctuality": { "sourceId": "orr", "timeField": "year", "data": [ ... ] }
}
```

Components access these as `data.broadband.fttp`, `data.rail.punctuality`, etc.

### Mixed nested objects

When a sub-domain contains both data arrays and non-array metadata (strings, lookup objects), store the entire sub-domain as a single series with `data` set to the full object:

```jsonc
"series": {
  "departments": {
    "sourceId": "hmt-pesa",
    "timeField": "year",
    "data": {
      "fys": ["2020-21", "2021-22", ...],
      "latestFy": "2024-25",
      "items": [ { "name": "Health", "values": { ... } }, ... ],
      "deptTotal": { "2020-21": 385.2, ... }
    }
  }
}
```

The shim places this at `data.departments`, preserving the full nested structure.

---

## Methodology breaks

Declare methodology changes or data disruptions on a series so charts can render them automatically via the `<MethodologyBreak>` component.

```jsonc
"methodologyBreaks": [
  {
    "at": 2017,                                    // required, x-axis value
    "label": "New 9-1 grading",                    // required, short chart annotation
    "description": "GCSE grading changed from...", // optional, full explanation
    "severity": "major"                            // "major" (red) or "minor" (grey), default "minor"
  }
]
```

Known breaks already declared:
- `education.json` / gcseResults: 2017 grading change, 2020-21 COVID assessments
- `nhs.json` / rtt, ae: 2020-03 COVID impact
- `infrastructure.json` / rail.journeys: 2020 COVID collapse
- `immigration.json` / netMigration: 2012 admin data methodology switch

---

## Pillars

| Pillar | Slug | Datasets |
|---|---|---|
| Foundations | `foundations` | family, energy, water, environment, workforce, nhs |
| Growth Engine | `growth` | education, industrial, infrastructure, investment, productivity, research, startups |
| State Performance | `state` | cpih, defence, immigration, justice, spending |
| Policy Challenges | `challenges` | (asylum-framework — not yet v1) |

---

## Adding a new dataset

### 1. Write the fetch script

Create `scripts/fetch-{id}.js`. Output v1 JSON to `public/data/{id}.json`:

```js
const output = {
  $schema: "sob-dataset-v1",
  id: "housing",
  pillar: "foundations",
  topic: "housing",
  generated: new Date().toISOString().slice(0, 10),
  sources: [{ id: "ons-housing", name: "ONS Housing Statistics", url: "..." }],
  snapshot: { medianPrice: 285000, medianPriceYear: 2024 },
  series: {
    prices: {
      sourceId: "ons-housing",
      timeField: "year",
      data: [{ year: 2000, median: 120000 }, ...]
    }
  }
};
```

### 2. Validate

```sh
node scripts/validate-data.js housing
```

### 3. Add catalog enrichment

Add an entry to `data/enrichment.yaml`:

```yaml
housing:
  title: "Housing"
  geography: "England & Wales"
  summary: "House prices, affordability ratios, social housing stock..."
  tags: [housing, prices, affordability, social housing]
  series:
    prices:
      title: "Median House Prices"
      summary: "Median house price rose from £120k in 2000 to £285k in 2024."
      unit: "£"
```

### 4. Regenerate catalog

```sh
node scripts/generate-catalog.js
```

### 5. Build the component

Create or extend a pillar component. Use `fetchDataset` or `useJsonDataset`:

```jsx
import { fetchDataset } from "../../hooks/useDataset";

// Option A: drop-in fetch replacement
useEffect(() => {
  fetchDataset("housing.json").then(setData).catch(...).finally(...);
}, []);

// Option B: hook (cleaner)
import { useJsonDataset } from "../../hooks/useDataset";
const { data, loading, error, raw } = useJsonDataset("housing.json");
```

For methodology breaks:
```jsx
import MethodologyBreak, { getMethodologyBreaks } from "../../components/MethodologyBreak";
import { getBreaks } from "../../hooks/useDataset";

// Inside a Recharts chart:
<MethodologyBreak breaks={getBreaks(raw, "prices")} />
```

### 6. Register the component

Add to `src/pillars/config.js` topics and `src/App.jsx` component map.

---

## Validation

Run before committing any data changes:

```sh
node scripts/validate-data.js          # all files
node scripts/validate-data.js family   # single file
```

Checks: required fields, pillar enum, source ID references, series structure, methodology break format, no unexpected top-level keys.

---

## File locations

| What | Path | In browser bundle? |
|---|---|---|
| Data files | `public/data/{id}.json` | Yes (served as static JSON) |
| v0 backups | `public/data/{id}.v0.json` | Yes (can be deleted after confidence) |
| JSON Schema | `data/schema/dataset-v1.json` | No |
| Catalog Schema | `data/schema/catalog-v1.json` | No |
| Catalog | `data/catalog.json` | No |
| Enrichment | `data/enrichment.yaml` | No |
| Migration script | `scripts/migrate-v0-to-v1.js` | No |
| Validation | `scripts/validate-data.js` | No |
| Catalog generator | `scripts/generate-catalog.js` | No |
| Compat shim | `src/hooks/useDataset.js` | Yes |
| Break component | `src/components/MethodologyBreak.jsx` | Yes |
