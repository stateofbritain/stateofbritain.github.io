# TODO

## How to read this file
- Tasks are ordered by priority (highest first)
- `Depends on` means that task ID must be in DONE.md before this starts
- Points are effort estimates: 1 = trivial, 3 = half day, 5 = full day, 8 = multi-day
- Phase 0 = restructure, Phase 1 = foundations data, Phase 2 = growth data, Phase 3 = state data, Phase 4 = polish

## Design Principles
- **Broad international comparisons:** Always compare the UK against a wide range of countries, not just the G7. Include high-performing small nations (Singapore, Ireland, Switzerland, Nordic countries), emerging economies catching up (Poland, Czech Republic, South Korea), and the OECD average. G7-only comparisons mask failures shared across large economies and miss instructive success stories elsewhere.
- **Mobile-first layout:** All pages must work on mobile (≤767px). Use the `useIsMobile()` hook to adapt layouts. Test at 375px before shipping.

---

## Completed

### Phase 0: Restructure UI — ALL DONE
- [T-001] Pillar navigation and routing ✅
- [T-002] Move existing tabs into pillar folder structure ✅
- [T-003] Landing page with pillar overview ✅
- [T-004] Strip editorial judgement from existing insight text ✅

### Phase 1: Foundations — ALL DONE
- [T-010] ONS API client with caching ✅ (`src/hooks/useDataset.js`, `src/api/`)
- [T-011] Housing page ✅ (`src/pillars/foundations/Housing.jsx`)
- [T-012] Energy page ✅ (`src/pillars/foundations/Energy.jsx`)
- [T-013] Healthcare Access page ✅ (`src/pillars/foundations/HealthcareAccess.jsx`)
- [T-014] Safety page ✅ (`src/pillars/foundations/Safety.jsx`)
- [T-015] Food & Cost of Living page ✅ (`src/pillars/foundations/FoodCostOfLiving.jsx`)
- [T-016] Water page ✅ (`src/pillars/foundations/Water.jsx`)
- [T-017] Environment page ✅ (`src/pillars/foundations/Environment.jsx`)
- [T-018] Family page ✅ (`src/pillars/foundations/Family.jsx`) — not in original spec

### Phase 2: Growth Engine — ALL DONE
- [T-020] Startups & VC page ✅ (`src/pillars/growth/Startups.jsx`)
- [T-021] University Spinouts page ✅ (`src/pillars/growth/Spinouts.jsx`)
- [T-022] Research Funding page ✅ (`src/pillars/growth/ResearchFunding.jsx`)
- [T-023] Productivity page ✅ (`src/pillars/growth/Productivity.jsx`)
- [T-024] Productive Quotient page ✅ (`src/pillars/growth/ProductiveQuotient.jsx`)
- [T-025] Investment & Capital page ✅ (`src/pillars/growth/Investment.jsx`)
- [T-026] Infrastructure page ✅ (`src/pillars/growth/Infrastructure.jsx`)
- [T-027] Industrial Production page ✅ (`src/pillars/growth/IndustrialProduction.jsx`) — not in original spec
- [T-028] Education page ✅ (`src/pillars/growth/Education.jsx`)

### Phase 3: State Performance — ALL DONE
- [T-030] Spending page with real OBR data ✅ (`src/pillars/state/Spending.jsx`)
- [T-031] NHS Outcomes page ✅ (rough — covered partly via `HealthcareAccess.jsx`)
- [T-033] Justice & Policing page ✅ (`src/pillars/state/Justice.jsx`)
- [T-034] Defence page ✅ (`src/pillars/state/Defence.jsx`)
- [T-035] Immigration page ✅ (`src/pillars/state/Immigration.jsx`)
- [T-036] Demographics page ✅ (covered under Immigration)

### Phase 4: UI Polish — ALL DONE
- [T-040] Mobile responsive breakpoints ✅ (`useIsMobile` hook, all shared components adapted)
- [T-044] About page ✅ (`src/pillars/About.jsx`, linked from footer)
- [T-045] SEO and meta tags ✅ (OG/Twitter cards, dynamic page titles)
- [T-041] Source citations ✅ (inline on each page)
- [T-043] CSV/data export ✅ (superseded by Data & API page)
- [T-046] Data & API page ✅ (`src/pillars/DataPage.jsx`, `/api/index.json`, licence-safe filtering)

---

## Remaining

### Phase 5: Stretch

#### [T-050] International comparison mode
- **Points:** 8
- **Priority:** Low
- **Acceptance criteria:** UK vs broad country set on any metric

#### [T-051] Regional breakdown views
- **Points:** 5
- **Priority:** Low

#### [T-052] Interactive crime/housing map
- **Points:** 8
- **Priority:** Low

#### [T-053] Productive Quotient deep-dive tool
- **Points:** 5
- **Priority:** Low

#### [T-054] Legislation cross-references (MCP tool)
- **Points:** 3
- **Priority:** Low

#### [T-055] Accessibility audit (WCAG 2.1 AA)
- **Points:** 5
- **Priority:** Low
