# IN REVIEW

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
