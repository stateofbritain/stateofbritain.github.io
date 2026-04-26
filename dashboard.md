# State of Britain — Command Dashboard

Internal design reference for the Dashboard tab. The detail in this file
is the contract for adding new metrics; visual decisions ratified here
should not be re-litigated tile-by-tile.

## Purpose

A single place where any reader (voter, journalist, future minister)
can see at a glance whether Britain is improving on the things that
matter. The frame is "make this number better": each tile encodes a
direction and current movement so a reader can scan a sub-tab and read
the state of an area in three seconds.

The dashboard prefers the **fastest available proxy** over the
authoritative-but-lagged headline. Quarterly housebuilding statistics
that report 18 months late lose to monthly EPC lodgements. Annual
food-self-sufficiency is paired with monthly import-share where
possible. Daily NESO data beats annual energy reviews.

Long-run series, methodology, and full charts continue to live under
the **Data** tab. Adversarial policy analysis lives under the **Policy**
tab. The Dashboard is for the read-the-state-now job.

## Information architecture

Three top-level tabs:

- **Dashboard** at `/` and `/dashboard`. Overview + four sub-tabs.
- **Data** at `/data/{pillar}/{topic}/{subtopic}`. Existing long-run pillar pages.
- **Policy** at `/policy/{topic}`. Existing adversarial analysis pages.

Dashboard sub-tabs:

| Sub-tab | URL | What it covers |
|---|---|---|
| Overview | `/dashboard` | Compressed view of all four areas, MiniTile grid |
| Service Delivery | `/dashboard/service-delivery` | How well the state runs the services it provides |
| Sovereign Capability | `/dashboard/sovereign-capability` | What Britain can produce, defend, supply on its own |
| Construction | `/dashboard/construction` | What the country is physically building |
| Quality of Life | `/dashboard/quality-of-life` | What daily life in Britain looks like |

## Pages

### Overview (`/dashboard`)

Heading + period toggle inline, then four sections each with a heading
that drills into the relevant sub-tab and a tight grid of MiniTiles.

The Overview is the **compressed view**. MiniTiles show metric name and
delta only. No values, no sparklines, no source. The whole page should
be readable in three seconds.

### Sub-tabs

Each sub-tab is a heading + blurb + grid of full `<Tile />` components.
Tiles show value, unit, delta with period, sparkline with 2y range
labels, source, and freshness. Clicking a tile opens a modal with the
10-year long-run chart.

## Components

All in `src/components/Tile.jsx` and `src/pillars/Dashboard.jsx`.

### `<Tile />` (default export)

Full metric tile for sub-tab grids.

Props:

| Prop | Type | Notes |
|---|---|---|
| `title` | string | Short label, sentence case |
| `value` | number | Current snapshot |
| `unit` | string | Suffix like "treatments", "%", "/ month" |
| `format` | "number" \| "percent" \| "currency" \| "raw" | Default "number" |
| `delta` | `{ percent?, value?, period }` | Movement vs. prior period |
| `direction` | "up-good" \| "up-bad" \| "neutral" | Semantic of an upward delta |
| `sparkline` | `number[]` | ~24 monthly or 8 quarterly points |
| `sparklineRange` | `{ start, end }` | Axis labels for the sparkline |
| `source` | string | Citation, e.g. "NHS England, RTT" |
| `asOf` | string | Freshness, suppressed if `sparklineRange.end` is set |
| `longSeries` | `number[]` | ~10 yearly points for the modal chart |
| `longSeriesStartYear` | number | First year of `longSeries` |
| `href` | string | If provided (and no `longSeries`), click navigates here |
| `accent` | string | Override for the trend-derived left border colour |
| `size` | "standard" \| "hero" | Hero variant doubles value font and sparkline height |

Click behaviour:

- If `longSeries` is provided → click expands the tile inline. The
  tile's grid item spans the full row (`grid-column: 1 / -1`) and the
  long-run chart appears below the regular content. Click outside,
  click the same tile again, or press Esc to contract. Surrounding
  tiles backfill the empty cells via `grid-auto-flow: row dense` on
  the parent grid.
- Else if `href` is provided → click navigates via SPA pushState.
- Else → not clickable.

### `<MiniTile />` (named export)

Compressed tile for the Overview grid.

Props:

| Prop | Type | Notes |
|---|---|---|
| `title` | string | |
| `delta` | `{ percent?, value? }` | No period; shown at the bottom of the box |
| `direction` | "up-good" \| "up-bad" \| "neutral" | |
| `href` | string | Click target |
| `accent` | string | Override; default is trend-derived fill |

The MiniTile is **fully filled** with the trend colour. Title is
Playfair Display 14px in off-white (`P.bgCard`). Delta is mono 16px in
off-white. The wall-of-colour effect is intentional — the Overview is
designed to be a single visual that signals state.

### `<ExpandedDetail />`

Internal helper in Tile.jsx. Renders the Recharts `LineChart` with the
long-run series. Lives inside the Tile when `expanded === true`.

The parent grid must have `gridAutoFlow: "row dense"` (set on
`TileGrid` in Dashboard.jsx) so that surrounding tiles backfill empty
cells in the row containing the expanded tile. Without `dense`, the
empty cells would remain blank.

## Visual conventions

### Trend colouring

Computed from `delta` and `direction`:

```
direction "up-good" + positive delta → teal (P.teal)    "good"
direction "up-good" + negative delta → red  (P.red)     "bad"
direction "up-bad"  + positive delta → red  (P.red)     "bad"
direction "up-bad"  + negative delta → teal (P.teal)    "good"
direction "neutral" or no delta      → grey (P.grey)    "neutral"
```

Applied to:
- Tile left border (3px)
- Tile sparkline line + area fill
- Tile delta arrow + percent text
- MiniTile background fill
- MiniTile delta text inherits off-white from the tile fill

### Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Tile title | DM Mono | 11px uppercase, 0.12em tracking | 400 |
| Tile value | Playfair Display | 26px (38px hero) | 600 |
| Tile delta | DM Mono | 11px | 500 |
| Tile sparkline-range labels | DM Mono | 10px | 400 |
| Tile source / asOf | DM Mono | 10px | 400 |
| MiniTile title | Playfair Display | 14px | 500 |
| MiniTile delta | DM Mono | 16px | 600 |
| Section heading | Playfair Display | 18px | 600 |
| Period toggle | DM Mono | 11px uppercase | 500 |
| Page heading | Playfair Display | clamp(24px, 4vw, 34px) | 600 |

Title tone (both Tile and MiniTile): sentence case. No emotive verbs.
"Soaring", "plummeting", "crisis", "broken" do not appear in tile
titles. Title says what is measured, not how to feel about it.

### Hover

All clickable cards (Tile when `longSeries`/`href` is set, MiniTile
when `href` is set, NavCard, SectionHeader) lift on hover via
`transform: scale(1.03)` plus an enlarged box-shadow. No `translateY`,
no border-colour change. Transition `0.15s` for both transform and
shadow.

### Sparkline

- 24 monthly points = 2 years of context (preferred)
- 8 quarterly points = 2 years (for quarterly-cadence metrics)
- Annual cadence: bespoke range, often 8–12 yearly points covering 8–12 years
- Range labels under the sparkline: `{ start, end }` strings like "Apr 2024 → Apr 2026" or "Q2 2024 → Q1 2026"
- The end-date label suppresses the `asOf` field so freshness is not duplicated

### Expanded long-run chart

- Inline expansion: the clicked tile spans the full row, chart appears
  below regular tile content (above source citation)
- 10 yearly points covering ~10 years (typically 2017–2026 at present)
- Recharts `LineChart` with `CartesianGrid` (horizontal only), `XAxis`, `YAxis`
- Y-axis tick formatter uses the same `formatNumber` helper as Tile
  (so 7.4M renders as "7.4m" on the axis)
- Tooltip in dark navy, off-white text
- Line stroke matches the tile's accent (trend) colour
- Click on the chart area itself does not contract the tile; click on
  the tile's compact area does (acts as a toggle)

## Period toggle (Overview only)

Three-button group: `MoM / 3M / 1Y`. Stateful within the Overview
component. Each MiniTile data entry carries a `deltas` object with
three keys (`mom`, `q`, `y`) and the active toggle picks which one is
shown.

Cadence interpretation:

- **MoM** — month-over-month. For metrics not on a monthly cadence,
  show the closest equivalent (latest data point vs the prior one).
- **3M** — 3-month change. For monthly data, t vs t-3. For quarterly
  data, equivalent to QoQ.
- **1Y** — year-over-year. Always supported.

When the toggle flips, trend colour can flip with it (a metric trending
up MoM but down 1Y will read teal under MoM and red under 1Y for an
up-good direction). This is the point of the toggle — short-term and
long-run momentum can disagree, and seeing both matters.

## Data shape

### Sub-tab tile (full)

```js
{
  title: "NHS RTT waiting list",
  value: 7400000,
  unit: "treatments",
  format: "number",
  delta: { percent: -1.2, period: "vs prior month" },
  direction: "up-bad",
  sparkline: [/* 24 monthly points */],
  sparklineRange: { start: "Apr 2024", end: "Apr 2026" },
  source: "NHS England, RTT",
  asOf: "May 2026",
  longSeries: [/* 10 yearly points 2017-2026 */],
  longSeriesStartYear: 2017,
}
```

### Overview MiniTile entry

```js
{
  title: "NHS RTT waiting list",
  direction: "up-bad",
  deltas: {
    mom: { percent: -1.2 },
    q:   { percent: -3.5 },
    y:   { percent: -6.4 },
  },
}
```

The MiniTile entry is a **summary view** of the underlying tile — same
title and direction, three windowed deltas instead of one. In the
current placeholder phase the two are hand-kept-in-sync; in Phase 3
both views read from one shared metric registry.

## Categories — what belongs where

### Service Delivery

> How well the state runs the services it provides.

The state's promised throughput. Has the bus arrived, is the patient
seen, has the case been decided, is the school open. Outcomes the
state directly produces.

Candidate metrics: NHS RTT waiting list, A&E 4-hour standard, GP
appointments same-day, ambulance response times, police 999 answer
time, asylum decisions backlog, courts backlog, school attendance,
prison capacity, council tax collection rates.

### Sovereign Capability

> What Britain can produce, defend, and supply on its own.

The country's standalone capacity. If trade or alliances seize up, what
do we have. Energy, defence, food, pharma, critical minerals, supply
chain resilience.

Candidate metrics: renewable share of generation, gas storage,
electricity import dependency, regular forces personnel, defence
equipment readiness, food self-sufficiency, pharmaceutical manufacturing
output, critical mineral import concentration, semiconductor
fabrication capacity.

### Construction

> What the country is physically building.

The capital stock that compounds: housing, transport, energy
infrastructure, communications. The rate at which Britain adds
durable assets.

Candidate metrics: housing starts and completions, brick deliveries
(leading indicator for housing), planning approvals, NSIP consents,
Network Rail track miles renewed, road resurfacing, power generation
capacity additions, broadband fibre rollout.

### Quality of Life

> What daily life in Britain looks like.

The lived state. Income, prices, time, health, safety, community.

Candidate metrics: real wages, CPIH, house price to earnings ratio,
crimes per 1,000, life expectancy at birth, hours commuted, mental
health prescriptions, child poverty rate, household formation rate.

## Period and cadence — fastest available proxy

The "real-time" floor for the dashboard is **monthly**. Slower metrics
(quarterly, annual) are admissible only when paired with a faster
proxy that points at the same underlying phenomenon.

Examples of headline + proxy pairings:

| Headline (slow) | Faster proxy |
|---|---|
| Annual housing completions | Monthly brick deliveries (DBT) |
| Quarterly retail sales | Weekly card spending (BoE Bankstats) |
| Annual food self-sufficiency | Monthly import-share by category (HMRC) |
| Quarterly RTT waiting list | Weekly diagnostic activity (NHS England) |
| Annual energy mix | Daily generation by source (NESO) |

If a candidate metric has no faster proxy and is reported quarterly or
slower, it can sit on the dashboard but with the caveat that the
2-year sparkline will look sparse and the MoM toggle will be
approximate.

## Tile selection criteria

When proposing a new metric for a sub-tab, check it against:

1. **Outcome over input.** "Did the thing happen" beats "did we spend
   money." NHS list size is an outcome; NHS budget is an input.
2. **Outcome over means.** Pick the result, not the mechanism. Energy:
   what people pay (£/kWh), how clean it is (gCO₂/kWh), how secure it
   is (import concentration). Not "renewable share" — that prescribes
   the means. Whether to get clean energy from renewables, nuclear,
   CCS, or fusion is ideological; CO₂ intensity is the outcome both
   sides can accept. Same logic everywhere: pick metrics that are
   defensible regardless of which mechanism produces them.
3. **Actionable.** The metric should respond to specific government
   decisions on a multi-year time horizon. Decadal demographic drifts
   are out unless paired with a policy lever.
4. **Available.** Public data, ideally from official sources (ONS,
   NHS, DLUHC, MoD, NESO, DEFRA, BoE, MHCLG, HMRC). Document the API
   endpoint or download URL alongside the metric.
5. **Sufficiently frequent.** Monthly minimum unless paired with a
   proxy.
6. **Specific.** "GDP growth" too generic; "manufacturing output
   index" or "construction output index" preferred.
7. **Honest direction.** Each metric has one clear `up-good`,
   `up-bad`, or `neutral` semantic. If the direction depends on the
   reader's politics, the metric is wrong for the dashboard. (House
   prices, for example, are `up-bad` in the affordability framing
   used here; if you cannot accept that framing, the metric is not
   for this dashboard.)
8. **Free of editorial framing.** The metric description names what
   is measured, not its political valence.

## How to add a new metric

1. Pick the sub-tab. Use the category descriptions above. If a metric
   straddles two sub-tabs, pick the one whose framing is more useful
   to a reader scanning that area.
2. Confirm cadence and source. Record both. If cadence is slower than
   monthly, identify a faster proxy or accept the caveat.
3. Decide direction (`up-good` / `up-bad` / `neutral`).
4. Build the placeholder data:
   - `value`, `unit`, `format`, `source`, `asOf`
   - `delta` (latest period, with `period` string)
   - `sparkline` of 24 monthly or 8 quarterly points
   - `sparklineRange` matching the cadence
   - `longSeries` of 10 yearly points
   - `longSeriesStartYear`
5. Add the corresponding entry to `OVERVIEW_*` for the relevant
   sub-tab. Three deltas required: `mom`, `q`, `y`.
6. Wire to real data fetching. Reuse existing fetch scripts if a
   `/data/...` page already pulls the source. Add a new fetch script
   under `scripts/fetch-{id}.js` if not.
7. If a `/data/...` page exists for the long-run series, point a Tile
   `href` to it, but `longSeries` takes precedence and opens the
   modal instead. Use href only on metrics where the modal would add
   no value.

## Implementation notes

- **Recharts** is already a dependency and is used for the modal
  long-run chart. The 2y sparkline is a hand-rolled SVG (`Sparkline`
  in Tile.jsx) for weight reasons — pulling Recharts into every tile
  sparkline is overkill.
- **Trend colour helpers** (`trendColor`, `deltaColor`, `deltaArrow`,
  `formatDelta`, `formatValue`, `formatNumber`) are local to Tile.jsx.
  If the dashboard grows enough to need them outside Tile.jsx, extract
  to `src/components/tileHelpers.js` rather than re-implementing.
- **Period toggle** state lives in the Overview component
  (`useState("mom")`). If we ever want the toggle's state shared across
  sub-tabs (e.g. so flipping to 1Y on the Overview also re-windows the
  full Tiles in sub-tabs), lift the state to `Dashboard` and pass down.
- **Editorial tone** for new tile titles follows CLAUDE.md. Cross-party
  select committee test applies. No em dashes in titles. Sentence case.

## Open work (Phase 3+)

- Replace placeholder series with real fetches.
- Build a metric registry (`src/dashboard/metrics.js`) so Overview
  MiniTiles and sub-tab Tiles read from one source.
- Freshness-coloured dots on tiles (green if updated this week,
  amber if monthly, grey if quarterly+).
- Per-sub-tab hero tile (`size="hero"`) for the headline metric in
  each area.
- Cross-tab period toggle (lift state if useful).
- Mobile polish: the Overview MiniTile grid drops to 2 columns on
  narrow viewports; check that titles still wrap cleanly with the
  Playfair label.
- Data freshness pipeline: scheduled GitHub Actions for fetches at
  the cadence each metric supports (daily for NESO, weekly for BoE,
  monthly for NHS / DLUHC, etc.).
