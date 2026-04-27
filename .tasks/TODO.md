# TODO — Data Expansions

## How this works

1. **You add tasks** — describe the topic and direction (e.g. "Expand defence with equipment numbers, fleet size, age of platforms")
2. **An AI agent picks up a task** — moves it to DOING, creates a git branch (`data/{task-id}`), researches official sources, builds the fetch script, data file, component, and enrichment entry following the standardised pipeline
3. **Agent finishes** — moves the task to INREVIEW with the branch name, then picks up the next task from the queue
4. **You review the branch** — check data accuracy, editorial tone, and presentation. Make tweaks, merge to main, move to DONE

### Task format

```
### [D-XXX] Short title
- **Topic:** Which pillar/topic this extends or creates
- **Direction:** What kind of data to look for, what questions to answer
- **Sources to check:** Specific gov.uk / ONS / DLUHC publications to start with (optional)
- **Priority:** High / Medium / Low
- **Notes:** Any constraints or preferences
```

### Pipeline checklist (per task)
- [ ] Research official government data sources
- [ ] Write fetch script → `scripts/fetch-{id}.js`
- [ ] Generate data → `public/data/{id}.json`
- [ ] Validate → `node scripts/validate-data.js {id}`
- [ ] Sync API → `node scripts/sync-api-data.js`
- [ ] Add enrichment → `data/enrichment.yaml` (concise, AI-queryable summaries)
- [ ] Regenerate catalog → `node scripts/generate-catalog.js`
- [ ] Build/extend component with ChartCard, sources, appropriate tone
- [ ] Register in config.js and App.jsx (if new topic/subtopic)
- [ ] Build passes → `npx vite build`
- [ ] Commit to branch `data/{task-id}`

---

## Queue

### [D-004] Taxation
- **Topic:** spending/taxation (new subtopic, depends on D-003)
- **Direction:** Build out the taxation subtopic with comprehensive UK tax data:
  - Tax receipts by type over time (income tax, NICs, VAT, corporation tax, council tax, business rates, fuel duty, stamp duty, etc.)
  - Effective tax rates and thresholds over time (personal allowance, basic/higher/additional rate thresholds, how fiscal drag works)
  - Tax burden as % of GDP, historical trend and international comparison (OECD tax-to-GDP ratios)
  - Tax gap (HMRC publishes this annually, difference between theoretical liability and actual receipts)
  - Where the tax base is concentrated (top 1%/10%/50% share of income tax, how few people pay higher rate)
  - Corporation tax: rate history (was 28%, now 25%), effective rate vs headline rate
  - International comparison of tax structure (UK vs peers: how much comes from income tax vs consumption tax vs property tax)
- **Sources to check:** HMRC tax receipts statistics, HMRC income tax liabilities statistics, HMRC tax gap report, OBR tax-by-tax ready reckoner, OECD Revenue Statistics
- **Priority:** High (depends on D-003)
- **Notes:** HMRC data is excellent and mostly OGL-licensed. Create `scripts/fetch-taxation.js` and `public/data/taxation.json` as a separate dataset from spending.

### [D-005] Local Government Finance
- **Topic:** spending/local-government (new subtopic, depends on D-003)
- **Direction:** Build out local government finance as a new subtopic:
  - Council spending by service area (social care, education, housing, highways, planning, waste, etc.)
  - Funding sources (council tax, business rates, government grants, fees & charges) and how the mix has changed
  - Council tax levels by band and area, real-terms change since 2010, referendum limits
  - Financial health: Section 114 notices issued (Northamptonshire, Croydon, Slough, Birmingham, Woking, etc.), reserves levels, audit backlogs
  - Statutory obligations vs discretionary spending
  - Social care spending (the largest and fastest-growing council cost)
  - Staffing levels over time
- **Sources to check:** DLUHC local authority revenue expenditure (RO/RA outturn), DLUHC council tax statistics, NAO "Financial sustainability of local authorities" reports, CIPFA resilience index, LGA finance publications, DLUHC local authority capital expenditure
- **Priority:** High (depends on D-003)
- **Notes:** Create `scripts/fetch-local-government.js` and `public/data/local-government.json` as a separate dataset. The Section 114 timeline is factual record. Keep neutral, present the financial position without characterising it as a "crisis" or "failure".

---

## Dashboard tile expansions

These are user-prioritised metrics for the Command Dashboard. The dashboard
shows monthly+ cadence only — slower data lives on /data pages. Each task
should land as a v1 dataset, a `METRICS` entry in `src/dashboard/metrics.js`,
and a tile in the matching sub-tab of `src/pillars/Dashboard.jsx`. Add a
schedule entry in `scripts/release-schedule.json`.

### [D-006] Monthly live births (Quality of Life) ✅ DONE
- Shipped via NHS Digital MSDS scraper (`scripts/fetch-births-monthly.js`).
  Auto-pulls 23+ months of TotalBabies + TotalDeliveries from
  `files.digital.nhs.uk` exp-data CSVs. Wired as `ql-births-monthly`
  tile + Overview MiniTile. Schedule: last Thursday of month + 1 day.

### [D-007] "Going out" indicator — pints / coffees / hospitality (Quality of Life)
- **Topic:** dashboard/quality-of-life
- **Direction:** A monthly indicator of out-and-about activity. Trying to capture social vitality, not just retail spend.
- **Sources to check:**
  - HMRC monthly tax & NIC receipts: beer duty, cider duty, wine duty (monthly volumetric receipts → infer volumes).
  - ONS Index of Services (S2KU) "Food and beverage service activities" subindex (SIC 56), monthly.
  - ONS CPIH "Beer, on premises" / "Coffee on premises" item-level subindex (price not volume).
  - BBPA Beer Barometer (quarterly fallback).
  - CGA Sales Tracker — paywalled, skip.
- **Priority:** High
- **Notes:** Best monthly proxies are HMRC alcohol-duty receipts (volume) and ONS Index of Services hospitality subindex (activity). Tile name could be "Pubs & restaurants activity" or honest "Hospitality output". Slurp Index in D-010 builds on the price side.

### [D-008] Employment by age group (Quality of Life)
- **Topic:** dashboard/quality-of-life
- **Direction:** Monthly employment rate split into early career (16-24), mid career (25-49), late career (50-64), plus 65+. Captures the very different labour-market stories at each life stage.
- **Sources to check:**
  - ONS LFS table A02 / A05 — employment rate by age group, monthly. Available via ONS time-series API as individual CDIDs (need to identify: e.g. MGSV / LF24 family).
  - "Official statistics in development" caveat applies — same as our other LFS tiles.
- **Priority:** High
- **Notes:** Single tile probably won't fit four lines well. Either four sparkline tiles, or a single tile + small modal showing the four lines. Match the cadence and CDID-driven fetch pattern of `fetch-employment-rate.js`.

### [D-009] GDP per capita (Quality of Life)
- **Topic:** dashboard/quality-of-life
- **Direction:** Monthly GDP per head — captures whether the headline GDP growth is being eaten by population growth.
- **Sources to check:**
  - Existing `monthly-gdp.json` (ECY2 index) — already on disk.
  - ONS mid-year population estimate (annual; quarterly population proxy via PEP).
  - World Bank / ONS quarterly population indicator if available monthly.
- **Priority:** High
- **Notes:** Likely a derived metric (like steel-consumption.json) — combine monthly GDP × static-ish population to get £/head per month. Document the population baseline transparently.

### [D-010] Slurp Index — hours of median wage per pint (Quality of Life)
- **Topic:** dashboard/quality-of-life
- **Direction:** Number of hours a median earner has to work to buy one pint. A wry, accessible cost-of-living signal that combines wages and a high-frequency consumer good.
- **Sources to check:**
  - ONS CPI item-level prices (DOEH or similar — "Beer, draught, on premises") — published monthly with absolute pence figures alongside the index.
  - ONS AWE median weekly earnings (KAB9 or similar) and average weekly hours (YBUS) → median hourly wage.
- **Priority:** Medium (fun, signature metric)
- **Notes:** Compute monthly: hours_per_pint = pint_price_pence / 100 / median_hourly_wage. Derived metric like steel-consumption. Title with humour but keep description neutral.

### [D-011] Domestic & industrial electricity price actually paid (Service Delivery)
- **Topic:** dashboard/service-delivery
- **Direction:** What households and industry actually pay per kWh — not the wholesale or marginal price. The Ofgem cap is on the dashboard already (well, was — it's quarterly so we removed it). Industrial users have a very different cost structure.
- **Sources to check:**
  - DESNZ Quarterly Energy Prices (QEP) Tables 2.1.x (domestic) and 2.2.x (industrial) — quarterly. Includes total price paid incl. taxes.
  - ONS CPI "Electricity" subindex (D7BL or similar) — monthly index, no absolute pence.
  - Ofgem default tariff cap quarterly £/kWh figures.
- **Priority:** High
- **Notes:** Dashboard rule is monthly. QEP is quarterly. Either accept a quarterly tile for these (rules-bend), or build a monthly index from CPI/CPIH electricity component scaled against the latest QEP absolute price. Document the construction.

### [D-012] New housing units completed — monthly (Building)
- **Topic:** dashboard/construction
- **Direction:** User wants completed dwellings (not started). DLUHC publishes Live Table 213 quarterly net additional dwellings, but monthly is required for the dashboard.
- **Sources to check:**
  - DLUHC Live Table 213a (England, net additional dwellings, quarterly).
  - NHBC New Home Statistics — monthly registrations + completions, ~70% market coverage.
  - MHCLG building control completions data — quarterly/annual.
  - EPC new-build lodgements (already scaffolded as `epc-newbuild`) — daily/monthly proxy.
- **Priority:** High
- **Notes:** EPC new-build lodgements is the closest monthly indicator already in our pipeline. NHBC monthly completions is the next-best official-ish source. If neither yields, the tile may have to remain quarterly (DLUHC) and we accept it as the rare quarterly exception on the dashboard.

### [D-013] UNGA voting-alignment matrix (Sovereign Capability)
- **Topic:** dashboard/sovereign-capability — but this is a static/annual table, not a monthly tile. May warrant its own widget rather than a standard tile.
- **Direction:** Compute, for each major nation, how often the UK voted with them at the UN General Assembly over the rolling last 5 years. Feeds into a future "strategic dependencies" assessment — countries we're closely aligned diplomatically with vs countries we're commercially exposed to.
- **Sources to check:**
  - Erik Voeten "United Nations General Assembly Voting Data" (Harvard Dataverse) — academic gold standard, annual update, public download.
  - UN Digital Library (undocs.org) for individual roll-call votes — harder to scrape but most current.
  - UN Bibliographic Information System (UNBIS) public data.
- **Priority:** Medium
- **Notes:** This is editorial / one-off compute, not a cadence-fetched tile. Build a script that reads the latest Voeten dataset, filters to the last 5 sessions, computes pairwise UK-other agreement rate, outputs a v1 dataset with country-level alignment scores. Treat as a strategic-dependencies foundation rather than a normal dashboard tile — likely a small table or matrix rendered alongside the regular tiles, or on a dedicated /data/state/diplomacy page.
