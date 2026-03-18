# IN REVIEW

<<<<<<< HEAD
_Tasks here are on a branch, awaiting human review before merge._

### [D-003] Public Spending — Restructure into subtopics with sidebar
- **Branch:** `data/D-003`
- **Summary:** Restructured the spending pillar from a single monolithic page into a subtopic structure with sidebar navigation, matching the pattern used by healthcare and housing pillars.
  - Copied `Spending.jsx` to `SpendingOverview.jsx` (renamed export to `SpendingOverview`)
  - Added subtopics to `config.js`: Overview, Taxation, Local Government
  - Updated `App.jsx`: import changed to `SpendingOverview`, route key changed to `spending/spending/overview`
  - Fixed sidebar rendering condition to also show when a single topic has subtopics
  - Taxation and Local Government routes render as Placeholder automatically (no explicit import needed)
  - Original `Spending.jsx` preserved as backup
  - Build passes, no data files changed

### [D-004] Taxation
- **Branch:** `data/D-004`
- **Depends on:** D-003
- **Summary:** Built comprehensive Taxation subtopic page under Public Spending pillar.
  - New fetch script `scripts/fetch-taxation.js` generates `public/data/taxation.json` (v1 schema, 10 series, 19 snapshot values)
  - Data sources: HMRC Tax Receipts (annual bulletin), OBR Public Finances Databank, HMRC Measuring Tax Gaps 2025, HMRC Table 2.4 (income tax percentile shares), HMRC Rates & Allowances, OECD Revenue Statistics 2025, OECD Corporate Tax Statistics 2025
  - Six chart sections: tax receipts by type (stacked area / lines toggle), tax burden as % GDP (with OECD reference + international bar), tax gap (% / £bn toggle + by-type breakdown), income tax concentration (line) + taxpayers by band (stacked bar), corporation tax rate history (step area) + international comparison (bar), personal allowance over time (area with freeze annotation)
  - Added `sourceFrom()` helper to `src/hooks/useDataset.js` for auto-generating source citations from v1 dataset metadata
  - Registered Taxation component in `App.jsx` (route: `spending/spending/taxation`)
  - Added enrichment entry, regenerated catalog
  - Build passes, data validates

### [D-005] Local Government Finance
- **Branch:** `data/D-005`
- **Depends on:** D-003
- **Summary:** Built Local Government Finance subtopic page under Public Spending pillar.
  - New fetch script `scripts/fetch-local-government.js` generates `public/data/local-government.json` (v1 schema, 10 series, 18 snapshot values)
  - Data sources: DLUHC Revenue Outturn (RO multi-year dataset), DLUHC Council Tax Levels Statistics, NAO Financial Sustainability of Local Authorities (2025), ONS Quarterly Public Sector Employment Survey, IFS councils funding analysis 2010-2024, DLUHC Local Audit Reform
  - Nine chart sections: spending by service area (horizontal bar), social care share over time (stacked area), funding mix (stacked area showing shift from grants to council tax), council tax trend (bar with social care precept annotation), core spending power index (line), Section 114 notices timeline (factual list), usable reserves (bar), audit backlog (bar with backstop methodology break), workforce FTE (line)
  - Section 114 notices presented as neutral factual timeline (7 councils: Northamptonshire, Croydon, Slough, Thurrock, Woking, Birmingham, Nottingham)
  - Registered LocalGovernment component in `App.jsx` (route: `spending/spending/localGov`)
  - Added enrichment entry with 10 series summaries, regenerated catalog
  - Build passes, data validates
=======
_Completed tasks awaiting your review. Each has a branch name you can check out, review, tweak, and merge to main._

### [D-001] Defence — Equipment & Capability
- **Branch:** `data/D-001`
- **What changed:**
  - Split defence from a single page into 3 subtopics: Spending & Budget, Personnel, Equipment & Capability
  - **Spending:** Existing spending charts (% GDP, real terms, equipment plan, NATO comparison) moved to own subtopic
  - **Personnel:** Existing personnel chart expanded with trained strength vs requirement, intake vs outflow, voluntary outflow rate by service, reserves
  - **Equipment:** NEW — current equipment inventory table (land/air/naval), escort fleet trend (1990-2025), combat aircraft fleet trend (Tornado/Harrier/Typhoon/F-35), international equipment comparison with 8 peer nations (switchable by category)
- **Data sources:** MoD Equipment & Formations 2025, MoD Quarterly Personnel Statistics (Oct 2025), NATO Defence Expenditure, GlobalFirepower 2026, House of Commons Library
- **Files changed:**
  - `scripts/fetch-defence.js` — expanded with 13 series (up from 6)
  - `public/data/defence.json` — regenerated with v1 schema, 28 snapshot values, 13 series
  - `src/pillars/state/DefenceSpending.jsx` — new subtopic component
  - `src/pillars/state/DefencePersonnel.jsx` — new subtopic component
  - `src/pillars/state/DefenceEquipment.jsx` — new subtopic component
  - `src/pillars/config.js` — defence now has subtopics
  - `src/App.jsx` — registered 3 defence subtopic routes
  - `data/enrichment.yaml` — expanded with all 13 series summaries
  - `data/catalog.json` — regenerated
>>>>>>> data/D-001
