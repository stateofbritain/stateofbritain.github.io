# Ideas

_Parking lot for things worth considering but not yet scoped into tasks.
Add freely. Promote to TODO.md when ready to build._

---

## Data & Content

- **"Then and Now" snapshots** — pick a year (e.g. 2010) and show a side-by-side card of every metric then vs now. One screen, no interpretation.
- **International comparisons toggle** — on any metric, overlay G7 / OECD peers. UK productivity vs Germany, UK house prices vs France, etc. Context without commentary.
- **Historical context markers** — vertical lines on charts for major events (financial crisis, Brexit vote, COVID, election dates). Let the reader draw the connections.
- **Regional inequality view** — every metric broken down by region. London vs North East on housing, health, productivity, crime. The gap is the story.
- **Local authority drill-down** — type your postcode, see your area's numbers. Land Registry and Police API already support this.
- **Dependency ratio calculator** — interactive: slide fertility rate and net migration, see projected dependency ratio in 2050. ONS publishes the variant projections.
- **"Cost of dysfunction" estimates** — what does court backlog cost in wasted time? What does NHS waiting cost in lost workdays? Not editorial — just arithmetic.
- **Procurement & contracting data** — Contracts Finder API is open. How much does government spend on outsourcing vs in-house? Where does the money go?
- **Planning permission pipeline** — DLUHC publishes planning stats. Time from application to decision. Refusal rates. Appeals. A bottleneck made visible.
- **Regulatory burden index** — count of statutory instruments per year, pages of regulation. Not a judgement on whether regulation is good or bad — just the volume.

## Energy Security (Energy tab)

- **Gas storage days remaining** — UK has very limited gas storage (~4-5 days' demand vs ~90 days in Germany). Track Rough/other storage capacity, current fill levels, and days-of-demand equivalent. Source: DESNZ gas storage data, National Gas Transmission.
- **Energy system model integration** — incorporate the existing energy system model to show supply/demand balance, import dependency, and vulnerability to disruption. Model already built — needs wiring into the dashboard.
- **Import dependency by fuel** — what fraction of gas, oil, electricity is imported? How has this changed since North Sea peak? DUKES has this.
- **Interconnector flows** — real-time or historical net electricity imports/exports via France, Belgium, Netherlands, Norway interconnectors. Elexon/BMRS data.
- **Capacity margin** — gap between peak demand and available generation capacity. National Grid ESO publishes winter/summer outlooks.

## Growth Engine specifics

- **Patent map** — IPO publishes patent data by applicant and classification. Show what Britain invents and where.
- **Founder visa tracker** — Home Office publishes Innovator/Start-up visa grants. How many? From where? Do they stay?
- **University-to-company pipeline** — link HESA graduate destination data to Companies House. What fraction of graduates start companies?
- **Public vs private sector pay gap** — ONS ASHE has this. Show it by region and occupation. Let people see for themselves.
- **Capital allocation flow** — where does British savings/pension money actually go? UK equities, US equities, gilts, property? The domestic investment question made concrete.

## Visualisation

- **Regional UK map GUI** — Interactive map of UK regions/local authorities. Click a region to see its data across all metrics. Choropleth shading for any metric (house prices, crime rate, productivity, etc.). Could use TopoJSON boundaries from ONS Open Geography Portal. Essential for making regional inequality visible without requiring users to compare tables.

## UX & Features

- **Embeddable charts** — generate an iframe/embed code for any chart. Let journalists and bloggers use them.
- **Data download on everything** — CSV export button on every single chart. Make the data maximally accessible.
- **Comparison mode** — select two topics or two regions, view them side by side.
- **Annotation layer** — let users (or us) add annotations to charts pointing to specific data points. "This is when X policy was introduced."
- **API for others** — serve our cleaned/processed data as a simple JSON API. Become the canonical source for "state of Britain" data.
- **Print/PDF view** — a summary report that can be printed or saved. One page per pillar, key metrics only.
- **Accessibility-first charts** — screen-reader-friendly data tables behind every chart. WCAG 2.1 AA as a minimum.
- **Dark mode** — the palette already has navy as an anchor. A dark variant would work well.

## Productive Quotient ideas

- **Time-use surveys** — ONS publishes time-use data. Could approximate how much of a GP's day is clinical vs administrative.
- **FOI-derived data** — some NHS trusts publish how many emails/meetings staff attend. Anecdotal but illustrative if aggregated.
- **International PQ comparison** — do German hospitals have the same clinical/non-clinical ratio? Hard to get but powerful if available.
- **Private sector PQ** — Companies House data + annual reports. Revenue per employee as a crude proxy. Compare sectors.
