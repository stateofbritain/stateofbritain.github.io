# DONE

_Completed tasks are logged here. Do not delete entries -- this is the agent's long-term memory._

### [T-001] Pillar navigation and routing ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `src/App.jsx`, `src/pillars/config.js`, `src/hooks/useHashRoute.js`, `src/components/PillarNav.jsx`, `src/components/TopicSidebar.jsx`, `src/pillars/Landing.jsx`, `src/pillars/Placeholder.jsx`, `src/pillars/state/Spending.jsx`, `src/components/Header.jsx`
- **Notes:** Three-pillar nav with hash routing (#/pillar/topic). Landing page shows pillar overview cards. Sidebar nav within each pillar. Existing Spending tab moved to state/Spending.jsx. Placeholder component renders for topics not yet built. To register a new topic page, import it in App.jsx and add to TOPIC_COMPONENTS map.

### [T-010] ONS API client with caching ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `src/api/ons.js`, `src/hooks/useDataset.js`
- **Notes:** ONS client supports fetchObservations(), getDataset(), getLatestVersion(), listDatasets(). localStorage cache with 1hr TTL. Retry with backoff on 429. toTimeSeries() helper for extracting simple time series. useDataset hook returns { data, loading, error } for any async fetch function.

### [T-004] Strip editorial judgement from existing insight text ✅
- **Completed:** 2026-03-05
- **Points delivered:** 1
- **Key files changed:** `src/data/topics.js`, `src/components/AnalysisBox.jsx`, `src/tabs/TopicTab.jsx`
- **Notes:** All `insight` fields renamed to `context`. Text rewritten as neutral factual summaries (numbers and dates only, no interpretation). AnalysisBox label changed from "Analysis" to "Context" (configurable via prop). Italic styling removed.

### [T-002] Move existing tabs into pillar folder structure ✅
- **Completed:** 2026-03-05
- **Points delivered:** 3
- **Key files changed:** Deleted `src/tabs/`, deleted `src/components/Nav.jsx`
- **Notes:** SpendingTab already moved in T-001. Old tabs/ and flat Nav component removed — no remaining imports. data/topics.js kept as placeholder data for future use.

### [T-003] Landing page with pillar overview ✅
- **Completed:** 2026-03-05
- **Points delivered:** 3
- **Key files changed:** `src/pillars/Landing.jsx` (built as part of T-001)
- **Notes:** Three pillar cards with descriptions and topic tags. Cards link to first topic in each pillar. Already delivered in T-001 scope.

### [T-011] Housing page with live Land Registry data ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `src/api/landRegistry.js`, `src/pillars/foundations/Housing.jsx`, `src/App.jsx`
- **Notes:** First live data page. Fetches UK House Price Index from Land Registry API. Shows average price, annual change, sales volume, detached vs flat. Three chart views: Price (avg + detached + flat), By Type (all 4 types), Volume (bar chart). Paginated fetch handles full history. Source citation links to landregistry.data.gov.uk. To add a new topic page: create component, import in App.jsx, add to TOPIC_COMPONENTS map.

### [T-014] Safety page with Police API data ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `src/api/police.js`, `src/pillars/foundations/Safety.jsx`, `src/App.jsx`
- **Notes:** Police API client with localStorage caching and 429 retry. getNationalSnapshot() aggregates street-level crime from 10 major city centres (London, Birmingham, Manchester, Leeds, Liverpool, Bristol, Sheffield, Newcastle, Nottingham, Cardiff). Bar/pie toggle chart. Clearly labelled as a geographic sample, not nationally comprehensive. Source citation links to data.police.uk.

### [T-015] Food & Cost of Living page with ONS CPIH data ✅
- **Completed:** 2026-03-05
- **Points delivered:** 3
- **Key files changed:** `src/pillars/foundations/FoodCostOfLiving.jsx`, `src/App.jsx`
- **Notes:** Fetches 5 CPIH aggregates (Overall, Food & beverages, Housing/water/energy, Transport, Recreation & culture) from ONS API using cpih01 dataset with time=* wildcard. Line chart from 2010 onwards. Metric cards show cumulative % change. parseONSMonth() handles "Jul-24" format. Source citation links to ONS inflation page.

### [T-012] Energy page with static DESNZ data ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `scripts/fetch-energy.js`, `public/data/energy.json`, `src/pillars/foundations/Energy.jsx`, `src/App.jsx`, `package.json`, `src/api/ons.js`
- **Notes:** First static data pipeline. Script downloads 4 DUKES XLSX files (1.1.1 consumption, 5.1.3 electricity, 1.1.6 expenditure, 1.1.2 availability), parses with SheetJS, outputs energy.json. Component shows 4 chart views: energy mix (stacked area), electricity generation by fuel (% stacked area), household spend (stacked bar), import dependency (line). Data: 1990-2024. Added `npm run fetch-data` script. Also added 5xx retry to ONS API client.

### [T-013] Healthcare Access page with NHS CSV data ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `scripts/fetch-nhs.js`, `public/data/nhs.json`, `src/pillars/foundations/HealthcareAccess.jsx`, `src/App.jsx`, `package.json`
- **Notes:** Fetch script downloads RTT Overview Timeseries XLSX (national waiting list, Apr 2007-Dec 2025) and 4 quarterly A&E monthly XLS files (provider-level, aggregated to England total). Component shows 3 chart views: waiting list (line), 18-week performance vs 92% target (line with reference line), A&E performance (combo bar+line). Key metrics: 7.29m waiting, 61.5% within 18 weeks, 140k+ over 52 weeks, A&E 72.5% within 4 hours.

### [T-016] Water page with Ofwat data ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `scripts/fetch-water.js`, `public/data/water.json`, `src/pillars/foundations/Water.jsx`, `src/App.jsx`, `package.json`
- **Notes:** Curated data from Ofwat WCPR 2024-25 (sector performance table, leakage time series 1992-2025, company categorisation, company leakage) and Environment Agency (pollution incidents 2016-2024, storm overflow EDM 2024). Three chart views: leakage trend (line), pollution incidents (bar), sector performance (data table). Company categorisation section shows leading/average/lagging breakdown.

### [T-017] Environment page with DESNZ/DEFRA data ✅
- **Completed:** 2026-03-05
- **Points delivered:** 5
- **Key files changed:** `scripts/fetch-environment.js`, `public/data/environment.json`, `src/pillars/foundations/Environment.jsx`, `src/App.jsx`, `package.json`
- **Notes:** Fetch script downloads 4 sources: DESNZ provisional GHG emissions XLSX (Table 1a, 1990-2024 by sector), DEFRA PM2.5 annual CSV (urban background, 2009-2024), DEFRA NO2 annual CSV (urban background, 1990-2024), DfT VEH0171 ODS (UK annual ULEV registrations, 2015-2024). Three sections: GHG emissions (stacked area by sector + total line), air quality (PM2.5 and NO2 with WHO reference lines), ULEV registrations (stacked bar BEV/PHEV/other). Key data: 371.4 MtCO2e in 2024 (54.2% below 1990), PM2.5 7.15 µg/m³, NO2 13.13 µg/m³, 578k ULEV registrations. Completes all 7 Foundations pillar topics.

### [T-022] Research Funding page ✅
- **Completed:** 2026-03-06
- **Points delivered:** 3
- **Key files changed:** `scripts/fetch-research.js`, `public/data/research.json`, `src/pillars/growth/ResearchFunding.jsx`, `src/App.jsx`, `package.json`
- **Notes:** Fetch script downloads ONS GERD Official Statistics 2023 XLSX — extracts Table 3 (R&D by sector of funding, current + constant 2023 prices, 2018-2023), Table 5 (regional breakdown 2023), Table 6 (total + % GDP). Curated international comparison from World Bank/OECD MSTI (G7 + Israel, S. Korea, OECD avg). Three sections: UK R&D Expenditure (stacked area by source / public-private bar / % GDP line with OECD reference, current/constant price toggle), International Comparison (horizontal bar with UK highlighted), Regional R&D (stacked horizontal bar by sector). Key data: £72.6bn total (2023), 2.64% GDP (below OECD 2.7%), business 57%, public 20%. Methodology revised 2021; data comparable from 2018 only.

### [T-021] University Spinouts page ✅
- **Completed:** 2026-03-06
- **Points delivered:** 5
- **Key files changed:** `src/pillars/growth/Spinouts.jsx`, `src/App.jsx`
- **Notes:** Curated static data from RAEng/Beauhurst "Spotlight on Spinouts 2025" report (no fetch script — data from PDF, not downloadable dataset). Four sections: Population & Pipeline (2,064 total, 1,337 active, stage breakdown, failure rate, top 20 universities horizontal bar), Investment (equity £17.0bn over 3,788 deals 2015-2024, IUK grants £814m, top investors bar chart, equity/IUK toggle), Sectors (traditional vs emerging tech toggle, horizontal bar charts), Regional Distribution (England/Scotland/Wales/NI metric cards, Golden Triangle stats, gender breakdown). Source citation links to RAEng report.

### [T-024] Productive Quotient page ✅
- **Completed:** 2026-03-06
- **Points delivered:** 8
- **Key files changed:** `scripts/fetch-workforce.js`, `public/data/workforce.json`, `src/pillars/growth/ProductiveQuotient.jsx`, `src/App.jsx`, `package.json`
- **Notes:** Fetch script downloads 3 official datasets: NHS Digital HCHS Workforce Statistics XLSX (Table 1, monthly FTE by staff group, Sep 2009-Dec 2025), DfE School Workforce Census CSV (national totals, 2011/12-2024/25), Home Office Police Workforce Open Data ODS (officers/staff/PCSOs, 2007-2025). HESA academic vs professional staff curated from published bulletins (data behind paywall). Component shows cross-service comparison bar chart (frontline %), trend lines per service, stacked bar workforce composition, and methodology cards. Key findings: NHS 84.3% clinical, police 62.1% officers+PCSOs, universities 49.0% academic, schools 76.8% teachers+TAs. NHS ratio stable since 2013; police officers fell from 146k (2009) to 125k (2018) then recovered to 149k (2025).

### [T-023] Productivity page ✅
- **Completed:** 2026-03-06
- **Points delivered:** 3
- **Key files changed:** `scripts/fetch-productivity.js`, `public/data/productivity.json`, `src/pillars/growth/Productivity.jsx`, `src/App.jsx`, `package.json`
- **Notes:** Fetch script downloads ONS Output per Hour Worked XLSX (Tables 5, 6, 12) and fetches OECD Productivity Database via SDMX REST API. Three sections: UK Trend (£/hour line + index with 2023=100 toggle), International Comparison (horizontal bar of 33 OECD countries with UK highlighted + multi-line growth trajectories for 8 countries, Ireland excluded as statistical outlier), Sector Breakdown (horizontal bar by SIC section). Key data: £46.66/hr (2024), $79.49 PPP/hr, rank 14/33 OECD, 13% above OECD avg but 18% below US and 15% below Germany. Also broadened Research Funding international comparison from 10 to 24 countries per new design principle. Added "Personal project by Jack Aspinall" to footer.

### [T-020] Startups & VC page ✅
- **Completed:** 2026-03-06
- **Points delivered:** 5
- **Key files changed:** `scripts/fetch-startups.js`, `public/data/startups.json`, `src/pillars/growth/Startups.jsx`, `src/App.jsx`, `package.json`
- **Notes:** First Growth Engine pillar page. Fetch script downloads ONS Business Demography 2024 XLSX — extracts UK totals from Tables 1.1a-d (births), 2.1a-d (deaths), 3.1a-d (active), 4.1 (survival by cohort), 1.2 (births by SIC section), 7.2 (high-growth enterprises). Curated equity data from BBB Small Business Equity Tracker editions 2016–2025 (Beauhurst data). Three sections: Business Demography (births/deaths bar, active line, high-growth bar with view toggle), Survival & Sectors (grouped bar survival by cohort, horizontal bar sector breakdown), Equity Investment (bar chart £bn 2015–2024). Key data: 317k births, 280k deaths, 2.86m active, 14.3k high-growth (2024); 5-year survival 38.4% (2019 cohort); equity £10.8bn (2024), peak £18.1bn (2021); VC = 0.68% GDP.

### [T-025] Investment & Capital page ✅
- **Completed:** 2026-03-06
- **Points delivered:** 3
- **Key files changed:** `scripts/fetch-investment.js`, `public/data/investment.json`, `src/pillars/growth/Investment.jsx`, `src/App.jsx`, `package.json`
- **Notes:** Fetch script downloads ONS Business Investment XLSX (cxnv.xlsx) — extracts annual GFCF and Business Investment (current prices + CVM, 1997-2025), government GFCF, and asset-type breakdown (intangibles, buildings, plant & machinery, transport). Also fetches OECD GFCF as % GDP via SDMX API — cross-section for 22 countries (2023) and time series for 8 comparators (2000-2023). Three sections: UK Investment Trend (GFCF + BI line chart, CP/CVM toggle, stacked area by asset type), International Comparison (horizontal bar GFCF/GDP with UK highlighted + trajectories line chart), Context box. Key data: £565bn total GFCF (2025), £315bn BI (55.6% of GFCF), UK at 18.9% of GDP vs OECD avg 22.9%, rank 21/22. Completes all 7 Growth Engine pillar topics.

### [T-030] Spending page with real OBR data ✅
- **Completed:** 2026-03-06
- **Points delivered:** 5
- **Key files changed:** `scripts/fetch-obr.js`, `public/data/spending.json`, `src/pillars/state/Spending.jsx`, `package.json`, deleted `src/data/spending.js`
- **Notes:** Fetch script downloads OBR Public Finances Databank (Feb 2026) and PESA 2025 Chapter 9 tables. OBR provides aggregate time series (receipts, TME, borrowing, debt interest, debt, GDP) in £bn and % of GDP from 1978-2030 (forecasts from 2025-26). PESA provides COFOG function breakdown (10 functions + accounting adjustments) for 2023-24 outturn. Receipts breakdown by 15 tax types. Component rewritten with 4 sections: COFOG pie chart + sidebar + tax calculator (kept from original), Receipts vs Spending area chart (£bn/% toggle), Net Debt/GDP line, Tax Receipts horizontal bar. Editorial text in AnalysisBox replaced with factual summary. Old static spending.js removed. Key data: TME £1,292bn (2024-25), receipts £1,139bn, borrowing £153bn, debt interest £106bn, debt 93.2% GDP. Social protection (£364bn) + Health (£224bn) = 48% of spending.
