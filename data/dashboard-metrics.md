# Dashboard Metrics — API Catalogue

Master reference for every metric on the Command Dashboard. Drives both
the per-metric fetch scripts in `scripts/fetch-{id}.js` and the GitHub
Action that runs them on cadence.

For each metric this records: stable ID, dashboard placement, direction
semantic, source, endpoint URL, format, auth, cadence, lag, parsing
notes, caveats, and the existing `/data/...` page (if any) that the
tile's `href` should link to.

Selection principle: outcomes over means (see `dashboard.md` rule #2).
"Renewable share" was rejected as ideologically loaded; CO₂ intensity is
the outcome equivalent.

---

## Service Delivery

### sd-nhs-rtt-waiting-list

- **Sub-tab:** Service Delivery
- **Direction:** up-bad
- **Source:** NHS England — Referral to Treatment Statistics
- **Endpoint:** `https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2025-26/` (parent page; locate latest XLS link with regex)
- **Format:** XLSX (worksheet "Incomplete Commissioner")
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+6 weeks
- **Latest URL pattern:** `https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/{YYYY}/{MM}/RTT-Overview-Timeseries-Including-Estimates-for-Missing-Trusts-{Mon}{YY}-XLS-{KB}-{HASH}.xlsx`
- **Parse:** "Incomplete Commissioner" sheet, total incomplete pathways column. Time-series identifier is `MMM-YY`.
- **Existing /data:** `/data/foundations/healthcare/waiting` — extend.
- **Status:** Existing data file likely covers this; verify in `public/data/`. Phase 3a candidate.
- **Caveats:** Methodology break Feb 2025 (community pathway reclassification).

### sd-school-pupil-absence

- **Sub-tab:** Service Delivery
- **Direction:** up-bad
- **Source:** DfE — Pupil Attendance in Schools
- **Endpoint:** `https://explore-education-statistics.service.gov.uk/find-statistics/pupil-attendance-in-schools/2026-week-{N}` (week N increments)
- **Format:** CSV inside ZIP (Download all data) — also accessible via Explore Education Statistics API
- **API Alternative:** `https://explore-education-statistics.service.gov.uk/data-catalogue/`
- **Auth:** None
- **Cadence:** Weekly during term-time
- **Lag:** W+1 week
- **Parse:** `absence_rate` (%) by week_commencing date
- **Existing /data:** None directly — extend `/data/growth/education` or new endpoint.
- **Status:** Phase 3b — new fetch script needed.
- **Caveats:** Codified-reason rule from Autumn 2024 — pre-rule data not directly comparable. Holiday gaps in data.

### sd-domestic-electricity-bill

- **Sub-tab:** Service Delivery
- **Direction:** up-bad
- **Source:** Ofgem — Energy Price Cap
- **Endpoint:** `https://www.ofgem.gov.uk/energy-policy-and-regulation/policy-and-regulatory-programmes/energy-price-cap-default-tariff-policy/energy-price-cap-default-tariff-levels`
- **Format:** XLSX per quarter (no historical CSV)
- **Auth:** None
- **Cadence:** Quarterly (announced 27 May / 26 Aug / 25 Nov / 27 Feb)
- **Lag:** Q+2 months
- **Parse:** "Pre-levelised rates model" XLSX → typical household bill (£/year, Direct Debit). Unit rates also in p/kWh.
- **Existing /data:** `/data/foundations/energy` — extend.
- **Status:** Phase 3c — new fetch script.
- **Caveats:** Methodology change Jan 2023 (dynamic auction-based).

### sd-train-ppm

- **Sub-tab:** Service Delivery
- **Direction:** up-good
- **Source:** ORR — Passenger Rail Performance
- **Endpoint:** `https://dataportal.orr.gov.uk/statistics/performance/passenger-rail-performance/`
- **Format:** CSV / Excel via portal tables (3103 historic, 3113 by sector). No public API.
- **Auth:** None (or contact `rail.stats@orr.gov.uk` for direct CSV)
- **Cadence:** 4-weekly (network periods)
- **Lag:** P+15 working days
- **Parse:** PPM percentage by period end date
- **Existing /data:** `/data/growth/transport/rail` — extend.
- **Status:** Phase 3b — scrape ORR data tables.
- **Caveats:** Definition: trains arriving on-time (within 5min/10min of scheduled). May migrate to "On-time" or "Time to 3" metrics.

### sd-crown-court-backlog

- **Sub-tab:** Service Delivery
- **Direction:** up-bad
- **Source:** MoJ — Criminal Court Statistics Quarterly
- **Endpoint:** `https://assets.publishing.service.gov.uk/media/{UUID}/cc_rdos_tool.xlsx` (latest UUID changes)
- **Discovery:** `https://www.gov.uk/government/collections/criminal-court-statistics`
- **Format:** XLSX
- **Auth:** None
- **Cadence:** Quarterly
- **Lag:** Q+8-10 weeks
- **Parse:** "Open cases" row by quarter end
- **Existing /data:** `/data/state/justice` — extend.
- **Status:** Phase 3c — new fetch.
- **Caveats:** Series at all-time high; political salience high.

### sd-asylum-decisions-backlog

- **Sub-tab:** Service Delivery
- **Direction:** up-bad
- **Source:** Home Office — Immigration Statistics
- **Endpoint:** `https://assets.publishing.service.gov.uk/media/{UUID}/asylum-claims-awaiting-decision-datasets-{mon}-{yyyy}.xlsx`
- **Discovery:** `https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables#asylum`
- **Format:** XLSX (table Asy_D03)
- **Auth:** None
- **Cadence:** Quarterly
- **Lag:** Q+6 weeks
- **Parse:** Total cases awaiting initial decision
- **Existing /data:** `/data/state/immigration` (data already in `asylum-statistics.json`) — Phase 3a candidate.
- **Status:** Existing JSON covers it via `asylumBacklogQuarterly`. Wire directly.

---

## Building

### bd-housing-completions

- **Sub-tab:** Building
- **Direction:** up-good
- **Source:** DLUHC — Housing Statistics Live Tables
- **Endpoint:** `https://assets.publishing.service.gov.uk/media/{UUID}/LiveTable213.xlsx`
- **Discovery:** `https://www.gov.uk/government/statistical-data-sets/live-tables-on-house-building`
- **Format:** XLSX (Quarterly by tenure / Annual by tenure sheets)
- **Auth:** None
- **Cadence:** Quarterly (England)
- **Lag:** Q+3 months
- **Parse:** "Total completed" by quarter
- **Existing /data:** `/data/foundations/housing/supply` (existing `housing-supply.json`) — Phase 3a candidate.
- **Status:** Verify existing fetch covers it. Likely Phase 3a.
- **Caveats:** Building Control estimates. England only.

### bd-brick-deliveries

- **Sub-tab:** Building
- **Direction:** up-good
- **Source:** DBT — Construction Building Materials
- **Endpoint:** `https://assets.publishing.service.gov.uk/media/{UUID}/construction_building_materials_-_tables_{month}_{yyyy}.xlsx`
- **Discovery:** `https://www.gov.uk/government/collections/building-materials-and-components-monthly-statistics-2012`
- **Format:** XLSX (also ODS available)
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+6 weeks
- **Parse:** "Bricks delivered" (millions/month)
- **Existing /data:** `/data/foundations/housing/supply` (proxy alongside completions)
- **Status:** Phase 3b — new fetch.
- **Caveats:** Series paused Feb-Dec 2025 for ONS methodology correction; resumed Jan 2026.

### bd-epc-newbuild-lodgements

- **Sub-tab:** Building
- **Direction:** up-good
- **Source:** EPC Open Data Communities
- **Endpoint:** `https://epc.opendatacommunities.org/api/v1/domestic/search`
- **Format:** REST JSON / CSV
- **Auth:** **Required.** Basic auth — base64(email:apikey). Register at the discovery URL.
- **Query:** `?from-year=YYYY&from-month=N&to-year=YYYY&to-month=N&size=5000` paginate via `search-after` token
- **Cadence:** Daily lodgements (we aggregate monthly)
- **Lag:** D+1-2 days
- **Parse:** Filter by `transaction-type=new-dwelling`; aggregate count by lodgement-date month
- **Existing /data:** None — new.
- **Status:** Phase 3b — new fetch. Requires API key in GitHub Secrets.
- **Caveats:** **API SUNSETS 30 May 2026.** Migrate to https://get-energy-performance-data.communities.gov.uk before then.

### bd-heat-pumps-bus

- **Sub-tab:** Building
- **Direction:** up-good
- **Source:** DESNZ — Boiler Upgrade Scheme Statistics (preferred over MCS dashboard, which has no API and is currently 500-erroring)
- **Endpoint:** `https://assets.publishing.service.gov.uk/media/{UUID}/Boiler_Upgrade_Scheme_BUS_Statistics_{Month}_{YYYY}.ods`
- **Discovery:** `https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics`
- **Format:** ODS (also XLSX in some months)
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+5 weeks
- **Parse:** ASHP redemptions + GSHP redemptions = total grants installed per month. Applications are leading indicator.
- **Existing /data:** None — new.
- **Status:** Phase 3b — new fetch.
- **Caveats:** BUS only (England & Wales); excludes MCS-only and self-funded installs (~80% of total). Acceptable given direction is what matters.

### bd-battery-storage-capacity

- **Sub-tab:** Building
- **Direction:** up-good
- **Source:** NESO — Capacity Market Register Components
- **Endpoint:** `https://api.neso.energy/dataset/0b3ab475-5622-4465-8825-9d35d03bb28b/resource/790f5fa0-f8eb-4d82-b98d-0d34d3e404e8/download/component_{YYYYMMDD}.csv`
- **CKAN SQL:** `https://api.neso.energy/api/3/action/datastore_search_sql?sql=SELECT%20*%20FROM%20%22790f5fa0-f8eb-4d82-b98d-0d34d3e404e8%22%20WHERE%20%22Primary%20Fuel%22%20%3D%20%27Storage%20-%20Battery%27`
- **Format:** CSV
- **Auth:** None (rate limit 2 req/min for SQL endpoint)
- **Cadence:** Daily updates; we aggregate monthly
- **Lag:** Live
- **Parse:** Filter rows where `Primary Fuel = Storage - Battery`; sum `De-Rated Capacity (MW)` by Delivery Year. We track total operational by month.
- **Existing /data:** None directly — new.
- **Status:** Phase 3c — NESO API.
- **Caveats:** Capacity Market Register only; excludes some embedded batteries.

### bd-fttp-premises-passed

- **Sub-tab:** Building
- **Direction:** up-good
- **Source:** Openreach press releases (primary) + Ofcom Connected Nations (secondary)
- **Endpoint:** Quarterly Openreach press at `https://www.openreach.com/news`; Ofcom CSV at `https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/connected-nations-20252/data-downloads-2025`
- **Format:** Press release text scrape OR Ofcom CSV (annual)
- **Auth:** None
- **Cadence:** Quarterly (Openreach earnings calls); annual + spring update (Ofcom)
- **Lag:** Q+1 month
- **Parse:** Regex `(\d+(?:\.\d+)?)\s*million\s+premises` from latest press release
- **Existing /data:** `/data/growth/digital/broadband` — extend with monthly proxy.
- **Status:** Phase 3c — manual ingest of Openreach quarterly figures.
- **Caveats:** "Premises passed" not "premises subscribed". Reading a press release is fragile; ideally subscribe to BT Group earnings.

---

## Sovereign Capability

### sc-co2-intensity-generation

- **Sub-tab:** Sovereign Capability
- **Direction:** **up-bad** (lower gCO₂/kWh = cleaner)
- **Source:** NESO — Carbon Intensity API
- **Endpoint:** `https://api.carbonintensity.org.uk/intensity` (live), `https://api.carbonintensity.org.uk/intensity/date/{YYYY-MM-DD}` (daily), `https://api.carbonintensity.org.uk/intensity/{from}/{to}` (range)
- **Format:** REST JSON
- **Auth:** None (free public API)
- **Cadence:** Real-time (5-minute granularity); we aggregate daily/monthly average
- **Lag:** Live
- **Parse:** Response: `{ data: [{ from, to, intensity: { forecast, actual, index } }] }`. Take `actual` field for historic, average across month.
- **Existing /data:** None — new.
- **Status:** Phase 3a/3b — quick win, NESO API is excellent.
- **Caveats:** Outcome metric (replaced earlier "renewable share" suggestion which was means-prescriptive). Lower is good; up-bad direction.

### sc-industrial-electricity-price

- **Sub-tab:** Sovereign Capability
- **Direction:** up-bad
- **Source:** DESNZ — Quarterly Energy Prices (QEP)
- **Endpoint:** `https://www.gov.uk/government/statistical-data-sets/gas-and-electricity-prices-in-the-non-domestic-sector`
- **Format:** XLSX (no API/CSV)
- **Auth:** None
- **Cadence:** Quarterly
- **Lag:** Q+3 months
- **Parse:** Industrial electricity price (£/kWh) by quarter; pick CCL-inclusive series.
- **Existing /data:** `/data/foundations/energy` — extend with non-domestic series.
- **Status:** Phase 3c — XLSX scrape.
- **Caveats:** Multiple consumption bands (small / medium / large industrial); pick "Medium" as representative.

### sc-gas-import-concentration

- **Sub-tab:** Sovereign Capability
- **Direction:** up-bad (more concentrated = worse)
- **Source:** DESNZ — Energy Trends Section 4: Gas
- **Endpoint:** `https://www.gov.uk/government/statistics/energy-trends-section-4-gas`
- **Format:** PDF + supplementary CSV/XLSX
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+2 months
- **Parse:** Gas imports by source country (TWh) → calculate Herfindahl-Hirschman Index (HHI) on shares. HHI = Σ(share²) × 10000.
- **Existing /data:** `/data/foundations/energy` — extend.
- **Status:** Phase 3c — XLSX/PDF parse.
- **Caveats:** "Concentration" metric is computed (HHI), not raw. Document the formula.

### sc-iop-chemicals

- **Sub-tab:** Sovereign Capability
- **Direction:** up-good
- **Source:** ONS — Index of Production
- **Endpoint:** `https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/k226/data`
- **Format:** REST JSON (ONS CSDB API)
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+6 weeks
- **Parse:** `data.months[].{date,value}` — index points (2019=100). Series K226 is chemicals manufacturing (CVM).
- **Existing /data:** `/data/growth/industrial` — extend.
- **Status:** Phase 3b — ONS JSON API is clean.
- **Caveats:** Severe long-term decline (-88% from 1999 peak); the series is informative because of the trend.

### sc-food-self-sufficiency

- **Sub-tab:** Sovereign Capability
- **Direction:** up-good
- **Source:** DEFRA — Food Statistics Pocketbook
- **Endpoint:** `https://www.gov.uk/government/statistics/food-statistics-pocketbook/food-statistics-in-your-pocket`
- **Format:** CSV linked from page
- **Auth:** None
- **Cadence:** Annual
- **Lag:** A+9 months
- **Parse:** Production-to-supply ratio for "all food" and "indigenous-type food"; pick "all food" as headline.
- **Existing /data:** None — new.
- **Status:** Phase 3c — annual fetch is rare-event.
- **Caveats:** Slow data; included because political salience is high. Annual cadence acceptable for sub-tab tile (sparkline shows decade).

### sc-tech-incorporations

- **Sub-tab:** Sovereign Capability
- **Direction:** up-good (proxy for ecosystem vitality)
- **Source:** Companies House — Public Data API (Advanced Search)
- **Endpoint:** `https://api.company-information.service.gov.uk/advanced-search/companies`
- **Format:** REST JSON
- **Auth:** **Required.** API key (basic auth, base64(api_key:)). Free. Sign up at https://developer.company-information.service.gov.uk/get-started/
- **Query:** `?sic_codes=62,63,21,26,72&incorporated_from={YYYY-MM-DD}&incorporated_to={YYYY-MM-DD}&size=100`
- **Cadence:** Daily; we aggregate monthly
- **Lag:** D+1
- **Parse:** Count results paginated; aggregate by `date_of_creation` month.
- **SIC codes used:** 62 (computer programming), 63 (information service activities), 21 (pharmaceuticals), 26 (electronics & optical), 72 (R&D).
- **Existing /data:** None — new.
- **Status:** Phase 3b — needs API key in GitHub Secrets.
- **Caveats:** SIC selection is editorial; document choices. "Frontier tech" is a proxy — many incorporations are dormant shells.

---

## Quality of Life

### ql-cpih-inflation

- **Sub-tab:** Quality of Life
- **Direction:** neutral (target ~2%)
- **Source:** ONS — CPIH 12-month rate
- **Endpoint:** `https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/data`
- **Format:** REST JSON
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+3 weeks
- **Parse:** `data.months[].{date, value}` — % YoY.
- **Existing /data:** `/data/spending/spending/moneySupply` (data in `cpih.json`) — Phase 3a, ready to wire.
- **Status:** Phase 3a — JSON exists.

### ql-real-wages

- **Sub-tab:** Quality of Life
- **Direction:** up-good
- **Source:** ONS — Average Weekly Earnings (deflated by CPIH)
- **Endpoint:** Nominal AWE: `https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/jlgd/lms`. CPIH: `https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/data`
- **Format:** REST JSON
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+4 weeks
- **Parse:** Real wages = JLGD / L55O × 100 (real-terms total pay including bonuses, 2015=100). Monthly YoY change.
- **Existing /data:** `/data/growth/jobs/earnings` — Phase 3a.
- **Status:** Phase 3a — likely already in jobs dataset.

### ql-house-price-index

- **Sub-tab:** Quality of Life
- **Direction:** neutral (politically contested; we use level + YoY change)
- **Source:** ONS / Land Registry — UK House Price Index
- **Endpoint:** `https://landregistry.data.gov.uk/app/ukhpi/` (Linked Data, SPARQL endpoint at `/app/sparql`)
- **Format:** SPARQL → JSON / RDF
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+8 weeks (conveyancing reporting lag)
- **Parse:** SPARQL query for latest indexValue per refDate.
- **Existing /data:** `/data/foundations/housing/prices` — Phase 3a.
- **Status:** Phase 3a — likely already wired.

### ql-homelet-rent

- **Sub-tab:** Quality of Life
- **Direction:** up-bad
- **Source:** HomeLet Rental Index (private; achieved rents) — alternative ONS IPHRP for monthly official
- **Endpoint:** Primary scrape `https://homelet.co.uk/homelet-rental-index`. Fallback: ONS IPHRP `https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/indexofprivatehousingrentalprices`
- **Format:** HTML scrape (HomeLet) or CSV (IPHRP)
- **Auth:** None
- **Cadence:** Monthly
- **Lag:** M+2 weeks
- **Parse:** Monthly average rent £; or IPHRP year-on-year %.
- **Existing /data:** `/data/foundations/housing/prices` — extend.
- **Status:** Phase 3b — start with ONS IPHRP (more stable than HomeLet scrape), migrate to HomeLet if user wants achieved-rent figures.

### ql-knife-crime

- **Sub-tab:** Quality of Life
- **Direction:** up-bad
- **Source:** ONS — Crime in England and Wales (knife/sharp instrument offences)
- **Endpoint:** `https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/policeforceareadatatables`
- **Format:** XLSX
- **Auth:** None
- **Cadence:** Quarterly
- **Lag:** Q+5-6 weeks
- **Parse:** "Police recorded crime — knife or sharp instrument offences" by quarter
- **Existing /data:** `/data/state/justice` — extend.
- **Status:** Phase 3b — XLSX scrape.
- **Caveats:** Some forces under-record; CSEW survey is methodologically different.

### ql-quarterly-births

- **Sub-tab:** Quality of Life
- **Direction:** up-good
- **Source:** ONS — Quarterly births in England and Wales (NEW from Feb 2025)
- **Endpoint:** `https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets`
- **Format:** CSV (linked from dataset page)
- **Auth:** None
- **Cadence:** Quarterly
- **Lag:** Q+8 weeks
- **Parse:** Live births count by quarter
- **Existing /data:** `/data/foundations/family` (data in `family.json`) — extend with quarterly proxy.
- **Status:** Phase 3b — new fetch using quarterly series.
- **Caveats:** New series; methodology may shift. Annual TFR remains canonical for long-run; quarterly is the dashboard tile.

---

## Bonus metrics (not in core 24, candidates for expansion)

### sd-ae-4-hour-standard
NHS England A&E performance (% within 4 hours), monthly. URL pattern: `https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/{YYYY}/{MM}/{Month}-{YYYY}-AE-by-provider-{HASH}.xls`. Strong monthly cadence. Up-good.

### sd-ambulance-cat2-response
NHS England Ambulance Quality Indicators, mean Cat 2 response time. Monthly. ICB-level XLS aggregated to England mean. Up-bad.

### sd-mental-health-access
NHS England Mental Health Services Monthly Statistics: % first treatment within 6 weeks. Up-good.

### sd-cancer-62day
NHS England Cancer Waiting Times: 62-day standard %. Up-good.

### bd-housing-starts
DLUHC Live Table 213 (or 209) — quarterly starts by tenure (England). Pair with brick deliveries.

### bd-planning-approvals
DLUHC Planning Applications Statistics (quarterly). Up-good.

### sc-net-migration-skilled
Home Office skilled worker visas issued (proxy for talent inflow). Quarterly.

### sc-mhra-approvals
MHRA — clinical trial / medicine approvals. Monthly. Pharma capacity proxy.

### ql-loneliness
ONS Personal Wellbeing — quarterly until April 2025; annual from May 2026.

### ql-net-migration
ONS Long-Term International Migration. Quarterly. Methodology revised Nov 2025.

### ql-antidepressants
NHSBSA prescription cost analysis — antidepressant prescriptions (BNF Section 4.3). Monthly. Mental health proxy.

---

## Implementation notes for fetch scripts

### Common pattern

Each `scripts/fetch-{id}.js` should:

1. Resolve the latest URL (regex from a discovery page where the URL changes per release)
2. Download the file (`https.get` with redirect handling)
3. Parse the format (XLSX → `xlsx` package; CSV → `csv-parse`; JSON → JSON.parse; SPARQL → POST endpoint)
4. Extract the time series
5. Write `public/data/{id}.json` in v1 schema
6. Log new vs prior data points (so the GitHub Action commits only when something changed)

### Required npm dependencies

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",        // already installed — XLSX parsing
    "csv-parse": "^5.x"        // CSV parsing
  }
}
```

`csv-parse` not yet installed; add when first CSV-only fetch is written. ODS files (BUS heat pumps) — XLSX library handles ODS natively.

### Authentication

Two metrics need credentials:

- **EPC Open Data Communities**: registration → email + API key. Set as `EPC_EMAIL` and `EPC_API_KEY` GitHub Secrets.
- **Companies House**: free API key. Set as `COMPANIES_HOUSE_API_KEY`.

All other endpoints are no-auth public.

### Rate limits

- NESO CKAN SQL endpoint: 2 req/min — stagger.
- NESO Carbon Intensity API: no documented limit, but be polite (1 req/min during fetches).
- Companies House: documented rate limits; pagination needed.
- ONS time-series: no documented limit; cache.

### URL volatility

Several gov.uk URLs include UUIDs that change per release. The fetch
script must scrape the discovery page first to find the latest UUID,
then download. Document this pattern in each script header.

---

## GitHub Action sketch

`.github/workflows/dashboard-fetches.yml`:

```yaml
name: Dashboard data refresh
on:
  schedule:
    - cron: "0 5 * * *"   # daily at 05:00 UTC for daily metrics
    - cron: "0 6 * * 1"   # weekly Monday at 06:00 UTC for weekly metrics
    - cron: "0 7 5 * *"   # monthly 5th at 07:00 UTC for monthly metrics
    - cron: "0 8 5 1,4,7,10 *"  # quarterly Jan/Apr/Jul/Oct on 5th
  workflow_dispatch:

jobs:
  daily:
    if: github.event.schedule == '0 5 * * *'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: |
          node scripts/fetch-co2-intensity.js
          node scripts/fetch-battery-storage-capacity.js
          node scripts/fetch-tech-incorporations.js
        env:
          COMPANIES_HOUSE_API_KEY: ${{ secrets.COMPANIES_HOUSE_API_KEY }}
      - run: node scripts/sync-api-data.js
      - run: |
          if git diff --quiet public/data/; then exit 0; fi
          git config user.email "actions@github.com"
          git config user.name "data refresh"
          git add public/data/ public/api/data/
          git commit -m "Auto: dashboard data refresh $(date -u +%Y-%m-%d)"
          git push

  weekly:
    if: github.event.schedule == '0 6 * * 1'
    # similar structure: school-absence, train-ppm, epc-newbuild

  monthly:
    if: github.event.schedule == '0 7 5 * *'
    # nhs-rtt, ae-4-hour, ambulance, brick-deliveries, heat-pumps-bus,
    # iop-chemicals, cpih, awe, hpi, knife-crime, gas-imports

  quarterly:
    if: github.event.schedule == '0 8 5 1,4,7,10 *'
    # crown-court, asylum-backlog, ofgem-cap, qep-industrial, births
```

Each cron handles a cadence bucket. Failed fetches don't break others
(each `node scripts/fetch-*.js` is its own step). Diff check ensures
commits only happen when data actually changes.

### Local testing

Each script should be runnable in isolation:

```sh
npm run fetch-data           # existing: full battery
node scripts/fetch-co2-intensity.js  # new: single metric
node scripts/validate-data.js {id}   # validate v1 schema
node scripts/sync-api-data.js        # mirror to public/api/data
```

---

## Current state (live tiles + staged fetches)

Implementation has gone past the original 24-tile shortlist. Tile counts:
Service Delivery 12, Sovereign Capability 12, Construction 11, Quality
of Life 22 — about 57 tiles total wired through `src/dashboard/metrics.js`.

Status taxonomy:
- **Live** = data already in `public/data/{file}.json` (existing v1 dataset)
  and the tile renders with real values today.
- **Staged** = metric defined and tile placed; waiting on its fetch
  script to run once to populate `public/data/{file}.json`.

### Service Delivery (12 tiles)

| Tile | Status | Source / dataset |
|---|---|---|
| NHS RTT waiting list | Live | nhs-waiting.json |
| GP appointments per month | Live | gp-access.json |
| Hospital bed occupancy | Live | hospital-capacity.json |
| Mental health IAPT referrals | Live | mental-health.json |
| Crown Court outstanding cases | Live (q'ly) | court-backlog-quarterly.json |
| Rail PPM | Live | infrastructure.json |
| Water leakage | Live | water.json |
| Police officers (workforce) | Live | workforce.json |
| Prison population | Live | justice.json |
| Domestic energy bill (Ofgem cap) | Live (q'ly) | ofgem-price-cap.json |
| Public sector net debt | Staged | fetch-public-sector-debt.js → ONS HF6X |
| Asylum decisions backlog | Live | asylum-statistics.json |

### Sovereign Capability (12 tiles)

| Tile | Status | Source / dataset |
|---|---|---|
| CO₂ intensity of generation | Staged | fetch-co2-intensity.js → NESO Carbon Intensity API |
| Manufacturing output (K222) | Staged | fetch-mfg-output.js → ONS |
| IoP chemicals (K226) | Staged | fetch-iop-chemicals.js → ONS |
| Defence spending % GDP | Live | defence.json |
| British Army personnel | Live | defence.json |
| Royal Navy escort fleet | Live | defence.json |
| RAF combat aircraft | Live | defence.json |
| Greenhouse gas emissions | Live | environment.json |
| R&D as % of GDP | Live | research.json |
| UK VC investment | Live | startups.json |
| High-growth firms | Live | startups.json |
| Output per hour | Live | productivity.json |

### Construction (11 tiles)

| Tile | Status | Source / dataset |
|---|---|---|
| Housing completions (England) | Live | housing-supply.json |
| Brick deliveries (SA) | Live | housing-supply.json |
| EPC new-build lodgements | Live | housing-supply.json |
| FTTP coverage | Live | infrastructure.json |
| Gigabit broadband coverage | Live | infrastructure.json |
| Rail route km electrified | Live | infrastructure.json |
| Motorway network length | Live | infrastructure.json |
| Reservoir capacity | Live | reservoirs.json |
| Battery storage capacity | Staged | fetch-battery-storage-neso.js → NESO CKAN |
| Construction output (KFAP) | Staged | fetch-construction-output.js → ONS |

### Quality of Life (22 tiles)

| Tile | Status | Source / dataset |
|---|---|---|
| CPIH inflation | Live | cpih.json (YoY enrichment) |
| Real wages YoY (monthly) | Staged | fetch-real-wages-monthly.js → ONS AWE × CPIH |
| Real median pay (annual) | Live | jobs.json realEarningsTrend |
| House Price Index | Staged | fetch-house-price-index.js → HM Land Registry SPARQL |
| Average mortgage rate | Live | money-supply.json |
| Mortgage approvals | Live | money-supply.json |
| Unemployment rate | Staged | fetch-unemployment-rate.js → ONS MGSX |
| Employment rate | Staged | fetch-employment-rate.js → ONS LF24 |
| Economic inactivity | Staged | fetch-economic-inactivity.js → ONS LF2S |
| CPI inflation | Staged | fetch-cpi-inflation.js → ONS D7G7 |
| Monthly GDP | Staged | fetch-monthly-gdp.js → ONS ECY2 |
| Services output | Staged | fetch-services-output.js → ONS S2KU |
| Retail sales | Staged | fetch-retail-sales.js → ONS J5EL |
| Average weekly hours | Staged | fetch-avg-weekly-hours.js → ONS YBUS |
| 10-year gilt yield | Live | borrowing.json giltYields |
| Air quality (PM2.5) | Live | environment.json |
| Total fertility rate | Live | family.json |
| Average household size | Live | family.json |
| Life expectancy at birth | Live | health-outcomes.json |
| Healthy life expectancy | Live | health-outcomes.json |
| Knife crime | Live (q'ly) | knife-crime-quarterly.json |
| Violent crime | Live | safety.json |
| Fear of crime | Live | safety.json |
| Suicide rate | Live | mental-health.json |
| Net migration | Live | immigration.json |

### Fetch scripts written (committed; need one-time run to populate)

```
scripts/fetch-co2-intensity.js
scripts/fetch-iop-chemicals.js
scripts/fetch-real-wages-monthly.js
scripts/fetch-house-price-index.js
scripts/fetch-unemployment-rate.js
scripts/fetch-employment-rate.js
scripts/fetch-economic-inactivity.js
scripts/fetch-monthly-gdp.js
scripts/fetch-cpi-inflation.js
scripts/fetch-public-sector-debt.js
scripts/fetch-retail-sales.js
scripts/fetch-mfg-output.js
scripts/fetch-services-output.js
scripts/fetch-construction-output.js
scripts/fetch-avg-weekly-hours.js
scripts/fetch-battery-storage-neso.js
scripts/fetch-ofgem-price-cap.js          (hardcoded historical)
scripts/fetch-knife-crime-quarterly.js    (hardcoded historical)
scripts/fetch-court-backlog-quarterly.js  (hardcoded historical)
scripts/lib/ons-fetch.js                  (shared helper)
```

The first 16 hit live ONS / NESO / Land Registry endpoints. The last
three hold hardcoded historical series until XLSX-discovery routines are
written. All work via the cadence-bucketed `.github/workflows/dashboard-fetches.yml`.

### Future (post-Phase-3)

- XLSX-discovery routines for Ofgem cap latest, MoJ court tools, ONS
  CSEW knife crime quarterly — replace hardcoded fallbacks.
- EPC API migration before 30 May 2026 sunset.
- Companies House tech-SIC incorporations (free API key needed).
- HomeLet rents scrape, falling back to ONS IPHRP.
- Heat pumps via DESNZ Boiler Upgrade Scheme ODS.
- DESNZ gas-import country concentration via Energy Trends.
- Hero tile (`size="hero"`) for the headline metric of each sub-tab.
- Cross-tab period toggle.
- Freshness-coloured dots on tiles.
