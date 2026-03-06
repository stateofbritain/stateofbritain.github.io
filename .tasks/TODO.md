# TODO

## How to read this file
- Tasks are ordered by priority (highest first)
- `Depends on` means that task ID must be in DONE.md before this starts
- Points are effort estimates: 1 = trivial, 3 = half day, 5 = full day, 8 = multi-day
- Phase 0 = restructure, Phase 1 = foundations data, Phase 2 = growth data, Phase 3 = state data, Phase 4 = polish

## Design Principles
- **Broad international comparisons:** Always compare the UK against a wide range of countries, not just the G7. Include high-performing small nations (Singapore, Ireland, Switzerland, Nordic countries), emerging economies catching up (Poland, Czech Republic, South Korea), and the OECD average. G7-only comparisons mask failures shared across large economies and miss instructive success stories elsewhere.

---

## Phase 0: Restructure UI for Three Pillars

### [T-001] Pillar navigation and routing
- **Points:** 5
- **Priority:** Critical
- **Depends on:** --
- **Files likely involved:** `src/App.jsx`, `src/components/Nav.jsx`, new `src/components/PillarNav.jsx`, new `src/components/TopicSidebar.jsx`
- **Acceptance criteria:**
  - Top-level nav shows three pillars: Foundations, Growth, State
  - Clicking a pillar shows its sub-topics in a sidebar
  - URL updates to reflect selection (hash routing is fine: `#/foundations/housing`)
  - Existing Spending tab accessible under State > Spending

### [T-002] Move existing tabs into pillar folder structure
- **Points:** 3
- **Priority:** Critical
- **Depends on:** T-001
- **Files likely involved:** `src/tabs/` (delete), new `src/pillars/foundations/`, `src/pillars/growth/`, `src/pillars/state/`
- **Acceptance criteria:**
  - `src/pillars/state/Spending.jsx` works (moved from `src/tabs/SpendingTab.jsx`)
  - Old `src/tabs/` directory removed
  - All existing topic views relocated to correct pillar
  - Build passes, no broken imports

### [T-003] Landing page with pillar overview
- **Points:** 3
- **Priority:** High
- **Depends on:** T-001
- **Files likely involved:** new `src/pillars/Landing.jsx`, `src/App.jsx`
- **Acceptance criteria:**
  - Default view shows three pillar cards with 2-3 headline metrics each
  - Cards link to the first sub-topic in each pillar
  - Maintains existing visual style (palette, typography)

### [T-004] Strip editorial judgement from existing insight text
- **Points:** 1
- **Priority:** High
- **Depends on:** --
- **Files likely involved:** `src/data/topics.js`, `src/tabs/SpendingTab.jsx`
- **Acceptance criteria:**
  - All `insight` strings replaced with neutral factual summaries
  - No language that tells the reader how to interpret a trend
  - Analysis boxes renamed to "Summary" or "Context"

---

## Phase 1: Foundations -- Real Data

### [T-010] ONS API client with caching
- **Points:** 5
- **Priority:** Critical
- **Depends on:** --
- **Files likely involved:** new `src/api/ons.js`, new `src/hooks/useDataset.js`
- **Acceptance criteria:**
  - `fetchONS(datasetId, params)` returns JSON observations
  - Results cached in localStorage with configurable TTL (default 1 hour)
  - Handles rate limiting (429 → retry with backoff)
  - Handles errors gracefully (returns `{ data: null, error, loading }`)
  - `useDataset` hook wraps this for React components

### [T-011] Housing page with live Land Registry data
- **Points:** 5
- **Priority:** High
- **Depends on:** T-001, T-010
- **Files likely involved:** new `src/api/landRegistry.js`, new `src/pillars/foundations/Housing.jsx`
- **Acceptance criteria:**
  - Fetches UK house price index from Land Registry API
  - Shows: average price, annual change, sales volume
  - Chart: price index over time (monthly, from 2010)
  - Breakdowns: by property type, first-time buyer vs existing owner
  - Source citation with link to Land Registry

### [T-012] Energy page with static DESNZ data
- **Points:** 5
- **Priority:** High
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-energy.js`, new `public/data/energy.json`, new `src/pillars/foundations/Energy.jsx`
- **Acceptance criteria:**
  - Script downloads DESNZ energy stats and outputs JSON
  - Shows: household bills, energy mix, renewables share, import dependency, fuel poverty rate
  - Chart: energy mix stacked area over time
  - Source citation with link to DESNZ
  - `npm run fetch-data` includes this script

### [T-013] Healthcare Access page with NHS CSV data
- **Points:** 5
- **Priority:** High
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-nhs.js`, new `public/data/nhs.json`, new `src/pillars/foundations/HealthcareAccess.jsx`
- **Acceptance criteria:**
  - Script downloads RTT waiting list and A&E CSVs, outputs JSON
  - Shows: waiting list total, A&E 4hr performance, GP appointments
  - Charts: waiting list over time, A&E performance over time
  - Source citation with link to NHS England statistics

### [T-014] Safety page with Police API data
- **Points:** 5
- **Priority:** High
- **Depends on:** T-001, T-010
- **Files likely involved:** new `src/api/police.js`, new `src/pillars/foundations/Safety.jsx`
- **Acceptance criteria:**
  - Police API client aggregates crime data across forces
  - Shows: total recorded crime, crime by category, outcomes
  - Chart: crime trends over time
  - Source citation with link to data.police.uk

### [T-015] Food & Cost of Living page with ONS CPI data
- **Points:** 3
- **Priority:** Medium
- **Depends on:** T-001, T-010
- **Files likely involved:** new `src/pillars/foundations/FoodCostOfLiving.jsx`
- **Acceptance criteria:**
  - Fetches CPIH breakdown from ONS API (food, housing, transport, etc.)
  - Shows: food CPI, overall CPI, household spending breakdown
  - Chart: CPI components over time
  - Source citation

### [T-016] Water page with Ofwat data
- **Points:** 5
- **Priority:** Medium
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-water.js`, new `public/data/water.json`, new `src/pillars/foundations/Water.jsx`
- **Acceptance criteria:**
  - Script downloads Ofwat performance data, outputs JSON
  - Shows: leakage rate, sewage overflows, bathing water quality, investment, company debt
  - Chart: leakage and sewage trends over time
  - Source citation

### [T-017] Environment page with DESNZ/DEFRA data
- **Points:** 5
- **Priority:** Medium
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-environment.js`, new `public/data/environment.json`, new `src/pillars/foundations/Environment.jsx`
- **Acceptance criteria:**
  - Script downloads emissions data (NAEI), air quality (DEFRA), outputs JSON
  - Shows: CO2 emissions, air quality (PM2.5), EV uptake, biodiversity index
  - Chart: emissions trajectory, air quality trends
  - Source citation

---

## Phase 2: Growth Engine -- New Content

### [T-020] Startups & VC page
- **Points:** 5
- **Priority:** High
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-startups.js`, new `public/data/startups.json`, new `src/pillars/growth/Startups.jsx`
- **Acceptance criteria:**
  - Data from British Business Bank reports + Companies House incorporations
  - Shows: VC investment (GBP/yr), unicorn count, startup births, UK share of European VC
  - Chart: VC funding over time, sector breakdown
  - Source citation

### [T-021] University Spinouts page
- **Points:** 5
- **Priority:** High
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-spinouts.js`, new `public/data/spinouts.json`, new `src/pillars/growth/Spinouts.jsx`
- **Acceptance criteria:**
  - Data from HESA HE-BCI survey
  - Shows: spinouts per year, licensing income, patent applications
  - Chart: spinout formation trend, top universities
  - Source citation

### [T-022] Research Funding page
- **Points:** 3
- **Priority:** High
- **Depends on:** T-001, T-010
- **Files likely involved:** new `src/pillars/growth/ResearchFunding.jsx`
- **Acceptance criteria:**
  - ONS GERD data for R&D spend as % GDP
  - Shows: total R&D spend, public vs private split, R&D/GDP vs G7
  - Chart: R&D trajectory, international comparison
  - Source citation

### [T-023] Productivity page
- **Points:** 3
- **Priority:** High
- **Depends on:** T-001, T-010
- **Files likely involved:** new `src/pillars/growth/Productivity.jsx`
- **Acceptance criteria:**
  - ONS productivity data (output per hour)
  - Shows: output per hour (level + growth), sectoral breakdown
  - Chart: UK vs G7 productivity, trend since 2008
  - Source citation

### [T-024] Productive Quotient page
- **Points:** 8
- **Priority:** Medium
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-workforce.js`, new `public/data/workforce.json`, new `src/pillars/growth/ProductiveQuotient.jsx`
- **Acceptance criteria:**
  - Combines workforce data: NHS (clinical vs non-clinical), DfE (teachers vs support), Home Office (officers vs staff), HESA (academics vs admin)
  - Shows: frontline-to-total ratio for each service, trend over time
  - Chart: ratio comparison across services
  - Source citation for each dataset
  - Methodology note explaining what is and isn't counted

### [T-025] Investment & Capital page
- **Points:** 3
- **Priority:** Medium
- **Depends on:** T-001, T-010
- **Files likely involved:** new `src/pillars/growth/Investment.jsx`
- **Acceptance criteria:**
  - ONS business investment data + FDI
  - Shows: business investment (% GDP), FDI inflows
  - Chart: investment/GDP over time
  - Source citation

### [T-026] Infrastructure & Connectivity page
- **Points:** 5
- **Priority:** Medium
- **Depends on:** T-001
- **Files likely involved:** new `scripts/fetch-infrastructure.js`, new `public/data/infrastructure.json`, new `src/pillars/growth/Infrastructure.jsx`
- **Acceptance criteria:**
  - Data from Ofcom (broadband), ORR (rail), DfT (roads)
  - Shows: full-fibre coverage, rail punctuality, road condition
  - Chart: broadband rollout curve, rail performance trend
  - Source citation

---

## Phase 3: State Performance -- Real Data

### [T-030] Spending page with real OBR data
- **Points:** 5
- **Priority:** High
- **Depends on:** T-002
- **Files likely involved:** new `scripts/fetch-obr.js`, new `public/data/spending.json`, `src/pillars/state/Spending.jsx`, `src/data/spending.js`
- **Acceptance criteria:**
  - Script downloads OBR Public Finances Databank XLSX, parses to JSON
  - Replaces all illustrative spending data with real OBR figures
  - Pie chart totals and breakdowns match published PESA/OBR numbers
  - Source citation with link to OBR databank

### [T-031] NHS Outcomes page
- **Points:** 5
- **Priority:** High
- **Depends on:** T-002, T-013
- **Files likely involved:** new `src/pillars/state/NhsOutcomes.jsx`
- **Acceptance criteria:**
  - Shows: health spend per capita (real), outcomes per GBP, staff per 1000 population
  - Chart: spend vs outcomes scatter (UK vs OECD peers if data available)
  - Source citation

### [T-032] Education Results page with DfE API
- **Points:** 5
- **Priority:** High
- **Depends on:** T-002
- **Files likely involved:** new `src/api/education.js`, new `src/pillars/state/EducationResults.jsx`
- **Acceptance criteria:**
  - DfE API client fetches attainment + funding data
  - Shows: spend per pupil (real), GCSE/A-level attainment, apprenticeship starts
  - Chart: funding vs attainment over time
  - Handles potential 403/CORS issues with fallback to static data
  - Source citation

### [T-033] Justice & Policing page
- **Points:** 5
- **Priority:** Medium
- **Depends on:** T-002, T-014
- **Files likely involved:** new `scripts/fetch-justice.js`, new `public/data/justice.json`, new `src/pillars/state/Justice.jsx`
- **Acceptance criteria:**
  - MOJ data: prison population, reoffending rate, court backlog
  - Police API: charge rates, outcomes
  - Chart: justice pipeline funnel (crime > charge > conviction > sentence)
  - Source citation

### [T-034] Defence page
- **Points:** 3
- **Priority:** Medium
- **Depends on:** T-002
- **Files likely involved:** new `scripts/fetch-defence.js`, new `public/data/defence.json`, new `src/pillars/state/Defence.jsx`
- **Acceptance criteria:**
  - MOD annual report data: spend (% GDP + real), force size, equipment programme
  - Chart: spend trajectory, force size over time
  - Source citation

### [T-035] Immigration page with Home Office data
- **Points:** 5
- **Priority:** Medium
- **Depends on:** T-002
- **Files likely involved:** new `scripts/fetch-immigration.js`, new `public/data/immigration.json`, new `src/pillars/state/Immigration.jsx`
- **Acceptance criteria:**
  - Script downloads Home Office XLSX tables, parses to JSON
  - Shows: net migration by route, visa grants, asylum backlog, processing times
  - Chart: migration by route over time
  - Source citation

### [T-036] Demographics page with ONS API
- **Points:** 3
- **Priority:** Medium
- **Depends on:** T-002, T-010
- **Files likely involved:** new `src/pillars/state/Demographics.jsx`
- **Acceptance criteria:**
  - ONS mid-year population estimates + vital statistics
  - Shows: population, fertility rate, dependency ratio, median age
  - Chart: population trend, fertility trend, age structure
  - Source citation

---

## Phase 4: UI Polish

### [T-040] Mobile responsive breakpoints
- **Points:** 5
- **Priority:** High
- **Depends on:** T-001
- **Files likely involved:** `src/styles.css`, all component files with inline styles
- **Acceptance criteria:**
  - Pillar nav stacks vertically on mobile
  - Metric cards go single-column below 640px
  - Charts remain readable at 320px width
  - Spending pie chart sidebar goes below chart on mobile

### [T-041] Source citation component
- **Points:** 2
- **Priority:** High
- **Depends on:** --
- **Files likely involved:** new `src/components/SourceCitation.jsx`
- **Acceptance criteria:**
  - Reusable component: takes source name, URL, date
  - Renders as small linked text below charts
  - Consistent style across all pages

### [T-042] Last updated badges
- **Points:** 2
- **Priority:** Medium
- **Depends on:** T-010
- **Files likely involved:** new `src/components/LastUpdated.jsx`, `src/hooks/useDataset.js`
- **Acceptance criteria:**
  - Shows when data was last fetched (from cache metadata)
  - Appears on each data card/chart

### [T-043] CSV export from charts
- **Points:** 3
- **Priority:** Medium
- **Depends on:** --
- **Files likely involved:** new `src/utils/exportCsv.js`, `src/components/TopicChart.jsx`
- **Acceptance criteria:**
  - Download button on each chart
  - Exports the chart's underlying data as CSV
  - Filename includes topic and date

### [T-044] About / Methodology page
- **Points:** 3
- **Priority:** Medium
- **Depends on:** T-001
- **Files likely involved:** new `src/pillars/About.jsx`
- **Acceptance criteria:**
  - Lists every data source with URL, update frequency, and any transformations applied
  - Explains the Productive Quotient methodology
  - Links to SPEC.md or equivalent public documentation
  - Accessible from site footer and nav

### [T-045] SEO and meta tags
- **Points:** 2
- **Priority:** Low
- **Depends on:** T-001
- **Files likely involved:** `index.html`, `src/App.jsx`
- **Acceptance criteria:**
  - Page title updates per route
  - Open Graph tags for social sharing
  - Meta description
