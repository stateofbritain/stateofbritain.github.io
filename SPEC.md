# State of Britain — Project Spec

> Objective data on how Britain meets its citizens' needs, grows its
> economy, and delivers public services. Data first, judgement left to the reader.

---

## Vision

A public-facing, editorial-quality data dashboard organised around three
questions that matter:

1. **Foundations** — housing, energy, water, food, health, safety
2. **Growth** — startups, R&D, productivity, investment, infrastructure
3. **State** — public spending, NHS, education, justice, defence, demographics

Every number traceable to a primary government source. No illustrative data.
Think "Our World in Data" scoped to Britain, with the visual polish of the
FT or Economist.

---

## Site Structure: Three Pillars

```
┌─────────────────────────────────────────────────────────┐
│                    STATE OF BRITAIN                      │
├──────────────┬──────────────────┬────────────────────────┤
│  FOUNDATIONS  │  GROWTH ENGINE   │  STATE PERFORMANCE    │
│  (Needs)      │  (Drivers)       │  (Services)           │
├──────────────┼──────────────────┼────────────────────────┤
│ Housing       │ Startups & VCs   │ NHS & Health Outcomes  │
│ Energy        │ University       │ Education & Skills     │
│ Water         │   Spinouts       │ Justice & Policing     │
│ Food & Cost   │ Research Funding │ Defence                │
│   of Living   │ Productivity     │ Public Spending        │
│ Healthcare    │ Productive       │ Immigration & Labour   │
│   Access      │   Quotient       │ Demographics           │
│ Safety        │ Investment &     │                        │
│ Environment   │   Capital        │                        │
│               │ Infrastructure   │                        │
└──────────────┴──────────────────┴────────────────────────┘
```

### Navigation concept

Top-level: three pillar tabs. Within each pillar: sub-topics as cards or
a vertical sidebar nav. URL structure: `/foundations/housing`,
`/growth/startups`, `/state/nhs`.

---

## Pillar 1: Foundations (Needs)

The Maslow layer. Data on the basic conditions for life: shelter, energy, water, food, health, safety.

### 1.1 Housing
- **Metrics:** Avg house price, price-to-earnings ratio, new builds/yr, homeownership rate, homelessness (rough sleeping count), social housing stock
- **Sources:** Land Registry API (prices), ONS (earnings, builds), DLUHC (homelessness stats, social housing)
- **Charts:** Price index over time, affordability ratio, builds vs target (300k), regional price map

### 1.2 Energy
- **Metrics:** Avg household bill, grid capacity margin, renewables share, energy security (import dependency), fuel poverty rate
- **Sources:** DESNZ (energy stats, fuel poverty), Ofgem (price cap), National Grid ESO (capacity)
- **Charts:** Energy mix stacked area, household bill over time, import dependency trend, renewables trajectory

### 1.3 Water
- **Metrics:** Leakage rate (Ml/day), sewage overflow incidents, bathing water quality, investment (£bn), water company debt
- **Sources:** Ofwat (company performance), EA (bathing water, sewage), Water UK
- **Charts:** Leakage trend, sewage events over time, investment vs debt

### 1.4 Food & Cost of Living
- **Metrics:** Food price inflation, household spending share on food, food bank usage, CPI breakdown
- **Sources:** ONS (CPI, family spending), Trussell Trust (food banks), DEFRA (food statistics)
- **Charts:** Food CPI vs overall CPI, household budget breakdown, food security trend

### 1.5 Healthcare Access
- **Metrics:** NHS waiting list, A&E 4hr performance, GP appointments per capita, life expectancy, cancer survival rates
- **Sources:** NHS England CSVs (RTT, A&E), ONS (life expectancy), OHID (cancer)
- **Charts:** Waiting list trajectory, A&E performance, life expectancy by region, cancer survival rates

### 1.6 Safety
- **Metrics:** Recorded crime, violent crime rate, charge rate, emergency response times, road deaths
- **Sources:** Police API, MOJ, ONS (Crime Survey), DfT (road casualties)
- **Charts:** Crime trends, charge rate over time, outcomes breakdown

### 1.7 Environment
- **Metrics:** CO₂ emissions, air quality (PM2.5), biodiversity index, EV uptake, tree planting rate
- **Sources:** DESNZ/NAEI (emissions), DEFRA (air quality, biodiversity), DfT (EV registrations)
- **Charts:** Emissions trajectory, air quality trends, species index

---

## Pillar 2: Growth Engine (Drivers)

The inputs and conditions that drive economic output.

### 2.1 Startups & Venture Capital
- **Metrics:** VC investment (£bn/yr), number of unicorns, startup births/deaths, scale-up rate, UK share of European VC
- **Sources:** British Business Bank (Small Business Finance Markets report), Companies House (incorporations), Beauhurst, BVCA
- **Charts:** VC funding over time, UK vs EU startup formation, sector breakdown (fintech, biotech, deeptech, AI)

### 2.2 University Spinouts & Research Commercialisation
- **Metrics:** Spinouts per year, spinout survival rate, licensing income, patent applications, knowledge transfer partnerships
- **Sources:** HESA/UKRI (HE-BCI survey), IPO (patents), UKRI (KTP data)
- **Charts:** Spinout formation trend, top universities by spinout, IP income, UK vs international comparison

### 2.3 Research & Innovation Funding
- **Metrics:** R&D spend (% GDP), UKRI budget, Innovate UK grants, business R&D, research output (papers, citations)
- **Sources:** ONS (GERD), UKRI annual reports, Scopus/Web of Science (publication data)
- **Charts:** R&D/GDP vs G7, public vs private R&D split, research output per capita

### 2.4 Productivity
- **Metrics:** Output per hour (level + growth), output per worker, multi-factor productivity, sectoral productivity
- **Sources:** ONS (productivity stats), Bank of England
- **Charts:** UK productivity vs G7, sectoral breakdown, trend since 2008

### 2.5 The Productive Quotient
A novel metric for this site: what fraction of organisational effort goes to
core mission vs administrative overhead?

- **Metrics:** NHS clinical vs non-clinical staff ratio, teacher contact hours vs admin, police officers vs total police staff, university academics vs administrators, public sector "back office" share
- **Sources:** NHS workforce stats, DfE school workforce census, Home Office police workforce, HESA staff data
- **Charts:** Clinical/frontline share over time across services, international comparison where available

### 2.6 Investment & Capital Formation
- **Metrics:** Business investment (% GDP), FDI inflows, infrastructure pipeline (£bn), pension fund domestic allocation
- **Sources:** ONS (business investment), UNCTAD/ONS (FDI), IPA (infrastructure pipeline)
- **Charts:** Investment/GDP over time, FDI league table, infrastructure spending by sector

### 2.7 Infrastructure & Connectivity
- **Metrics:** Full-fibre coverage, 5G coverage, rail punctuality, road condition, port throughput, planning permission timelines
- **Sources:** Ofcom (broadband/mobile), ORR (rail), DfT (roads, ports), DLUHC (planning)
- **Charts:** Broadband rollout curve, rail performance, planning decision times

---

## Pillar 3: State Performance (Services & Results)

What the state spends, and what it delivers.

### 3.1 Public Spending (existing)
- **Metrics:** Total managed expenditure, spending/GDP, deficit, debt interest, debt/GDP
- **Sources:** OBR Public Finances Databank
- **Charts:** Drillable spending pie (already built), tax calculator (already built), spending over time
- **Enhancement:** Show spending per capita in real terms

### 3.2 NHS & Health Outcomes
- **Metrics:** Health spend per capita (real), outcomes per £ (life expectancy, QALY-adjusted), staff per 1000 population, bed occupancy
- **Sources:** NHS England, ONS, OECD Health Data
- **Charts:** Spend vs outcomes scatter (UK vs peers), efficiency trends

### 3.3 Education Results
- **Metrics:** Spend per pupil (real), GCSE/A-level attainment, PISA ranking, graduate earnings premium, apprenticeship starts
- **Sources:** DfE API, OECD PISA, SLC (student loans)
- **Charts:** Funding vs attainment, UK PISA trajectory, degree vs apprenticeship pathways

### 3.4 Justice & Policing
- **Metrics:** Cost per prisoner, reoffending rate, court backlog, charge-to-conviction rate, police per capita
- **Sources:** MOJ, Police API, HMICFRS
- **Charts:** Justice pipeline funnel (crime → charge → conviction → sentence), cost-effectiveness

### 3.5 Defence & Security
- **Metrics:** Defence spend (% GDP + real), armed forces strength, equipment programme, NATO comparison
- **Sources:** MOD annual report, NATO, IISS
- **Charts:** Spend trajectory, force size over time, UK vs NATO target

### 3.6 Immigration & Labour Market
- **Metrics:** Net migration by route, employment rate by visa type, fiscal contribution, asylum processing time
- **Sources:** Home Office tables, ONS (labour market), Migration Advisory Committee
- **Charts:** Migration by route (study, work, family, asylum), employment rates, skills distribution

### 3.7 Demographics & Fiscal Sustainability
- **Metrics:** Population, fertility, dependency ratio, pension cost projections, median age
- **Sources:** ONS (population estimates, projections), OBR (fiscal sustainability report)
- **Charts:** Population pyramid, dependency ratio trajectory, pension spend forecast

---

## Data Sources (unchanged from previous research)

### Tier 1: Live JSON APIs (browser fetch)

| Source | Base URL | Auth | Rate Limit |
|--------|----------|------|------------|
| ONS API | `api.beta.ons.gov.uk/v1` | None | 120/10s, 200/min |
| Police API | `data.police.uk/api` | None | 15/s burst 30 |
| Land Registry | `landregistry.data.gov.uk/data/ukhpi` | None | Undocumented |
| DfE Education | `api.education.gov.uk/statistics/v1` | None | Undocumented |

### Tier 2: CSV/XLSX (pre-processed at build time)

| Source | Covers |
|--------|--------|
| NHS England CSVs | Waiting lists, A&E, cancer waits, workforce |
| OBR Databank | Spending, revenue, deficit, debt (300yr) |
| Home Office tables | Migration, visas, asylum |
| DESNZ / NAEI | Emissions, energy mix, fuel poverty |
| MOJ / Justice Data | Prisons, courts, reoffending |
| Ofwat | Water company performance |
| UKRI / HESA | Research funding, spinouts, HE staff |
| Companies House | Business incorporations |

### Tier 3: Manual / Annual

| Source | Covers |
|--------|--------|
| British Business Bank | VC/startup ecosystem reports |
| OECD | International comparisons (health, education, productivity) |
| IPA | Infrastructure pipeline |
| Ofcom | Broadband/mobile coverage |

---

## Architecture

```
StateOfBritain/
├── src/
│   ├── api/                  # One client per data source
│   │   ├── ons.js
│   │   ├── police.js
│   │   ├── landRegistry.js
│   │   ├── education.js
│   │   └── nhs.js
│   ├── hooks/
│   │   └── useDataset.js     # Generic fetch → cache → error hook
│   ├── data/                 # Static fallback + transforms
│   │   └── static/           # Pre-processed JSON from scripts/
│   ├── theme/
│   │   └── palette.js
│   ├── components/           # Reusable UI atoms
│   │   ├── MetricCard.jsx
│   │   ├── TopicChart.jsx
│   │   ├── AnalysisBox.jsx
│   │   ├── SourceCitation.jsx
│   │   ├── CustomTooltip.jsx
│   │   ├── PillarNav.jsx     # Top-level pillar navigation
│   │   └── TopicSidebar.jsx  # Sub-topic nav within a pillar
│   ├── pillars/              # One folder per pillar
│   │   ├── foundations/
│   │   │   ├── Housing.jsx
│   │   │   ├── Energy.jsx
│   │   │   ├── Water.jsx
│   │   │   ├── FoodCostOfLiving.jsx
│   │   │   ├── HealthcareAccess.jsx
│   │   │   ├── Safety.jsx
│   │   │   └── Environment.jsx
│   │   ├── growth/
│   │   │   ├── Startups.jsx
│   │   │   ├── Spinouts.jsx
│   │   │   ├── ResearchFunding.jsx
│   │   │   ├── Productivity.jsx
│   │   │   ├── ProductiveQuotient.jsx
│   │   │   ├── Investment.jsx
│   │   │   └── Infrastructure.jsx
│   │   └── state/
│   │       ├── Spending.jsx      # (existing SpendingTab, moved)
│   │       ├── NhsOutcomes.jsx
│   │       ├── EducationResults.jsx
│   │       ├── Justice.jsx
│   │       ├── Defence.jsx
│   │       ├── Immigration.jsx
│   │       └── Demographics.jsx
│   └── App.jsx
├── scripts/
│   └── fetch-static.js      # Download & parse XLSX → JSON
├── public/data/              # Committed pre-built JSON
└── tests/
```

---

## Phased Roadmap

### Phase 0: Restructure UI for Three Pillars
0.1 Replace flat tab nav with pillar navigation + sub-topic sidebar
0.2 Move existing tabs into pillar folders (Spending → state/, etc.)
0.3 URL routing: `/foundations/housing`, `/growth/startups`, `/state/spending`
0.4 Landing page with pillar overview cards + key headline metrics

### Phase 1: Foundations — Real Data
1.1 ONS API client + useDataset hook + caching layer
1.2 Housing: Land Registry API → live house price data
1.3 Energy: DESNZ static pipeline → energy mix, bills, fuel poverty
1.4 Healthcare Access: NHS CSV pipeline → waiting lists, A&E
1.5 Safety: Police API → national crime aggregates
1.6 Food & Cost of Living: ONS CPI breakdown
1.7 Water: Ofwat data pipeline
1.8 Environment: DESNZ emissions + DEFRA air quality

### Phase 2: Growth Engine — New Content
2.1 Startups: British Business Bank data + Companies House incorporations
2.2 Spinouts: HESA HE-BCI data pipeline
2.3 Research Funding: ONS GERD + UKRI data
2.4 Productivity: ONS productivity datasets (output per hour)
2.5 Productive Quotient: NHS workforce, DfE school workforce, police workforce
2.6 Investment: ONS business investment + FDI
2.7 Infrastructure: Ofcom broadband, ORR rail, DfT roads

### Phase 3: State Performance — Real Data
3.1 Public Spending: OBR databank pipeline (replace illustrative data)
3.2 NHS Outcomes: outcomes-per-£ analysis, international comparison
3.3 Education Results: DfE API live data + PISA
3.4 Justice: MOJ pipeline + charge-to-conviction funnel
3.5 Defence: MOD data
3.6 Immigration: Home Office XLSX pipeline
3.7 Demographics: ONS population API

### Phase 4: UI & Quality
4.1 Mobile responsive breakpoints
4.2 Source citation links on every chart
4.3 "Last updated" badges + data freshness indicators
4.4 CSV export from any chart
4.5 About/methodology page
4.6 SEO: meta tags, Open Graph
4.7 Landing page polish — headline stats from each pillar

### Phase 5: Stretch
5.1 International comparison mode (UK vs G7 on any metric)
5.2 Regional breakdown views
5.3 Interactive crime/housing map
5.4 Productive Quotient deep-dive tool
5.5 Legislation cross-references (MCP tool)
5.6 Accessibility audit (WCAG 2.1 AA)

---

## Design Principles

1. **No editorial judgement** — present the data. Don't tell the reader whether a trend is good or bad. A shift in energy mix is simultaneously decarbonisation progress and a change in energy security — the reader decides which matters more.
2. **Primary sources only** — every number links to its source. No secondary reporting.
3. **The Productive Quotient** — a signature metric for this site. What fraction of institutional effort reaches the frontline? Track it across NHS, schools, police, universities.
4. **Maslow framing for Foundations** — order sub-topics by how fundamental the need is. Housing before environment. Energy before connectivity.
5. **No party politics** — show trends across governments, not within them. No election-cycle framing.
6. **Complete picture** — show all the data on a topic, not a cherry-picked subset. If crime is down on one measure and up on another, show both.

---

## Technical Notes

- ONS API is beta — may have breaking changes, wrap with error handling
- NHS Digital portal decommissioned March 2026 — use NHS England CSVs
- DfE API returned 403 in testing — test CORS from browser context
- Home Office publishes ODS + XLSX (no CSV) — need SheetJS for parsing
- Police API max 10,000 crimes per area query — aggregate across forces for national view
- Cache: 1 hour for live APIs, static data refreshed on deploy
- Productive Quotient data requires combining workforce datasets from multiple departments — non-trivial but doable
