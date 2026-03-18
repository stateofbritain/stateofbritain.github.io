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
