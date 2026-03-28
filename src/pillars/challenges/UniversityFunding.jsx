import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, Cell, LabelList, Customized,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";

const PURPLE = "#7B4B8A";

// ─── HESA Finance Statistics 2022-23, Table 1 ─────────────────────
// Income by source (£m). 'research' combines grants & contracts + funding body
// grants (including Research England QR block grant). EU students reclassified
// as international fee-payers from 2021-22 following the end of EU home-fee
// status. Source: HESA Finance Statistics 2022-23 (published March 2024).
const INCOME_SERIES = [
  { year: "2016-17", home: 11400, intl: 5100, research: 9000, other: 11900 },
  { year: "2017-18", home: 12000, intl: 5800, research: 9200, other: 11900 },
  { year: "2018-19", home: 12200, intl: 6700, research: 9600, other: 12400 },
  { year: "2019-20", home: 12100, intl: 8000, research: 9900, other: 12000 },
  { year: "2020-21", home: 12000, intl: 8800, research: 10100, other: 10900 },
  { year: "2021-22", home: 12200, intl: 10300, research: 10500, other: 12600 },
  { year: "2022-23", home: 12300, intl: 11900, research: 11200, other: 14200 },
];

// ─── England home UG tuition fee history ─────────────────────────
// Nominal = fee cap in £ (most institutions charge the maximum).
// Real = CPI-adjusted to 2024-25 prices (ONS series D7BT).
// Variable top-up fees introduced 2006-07; £9k cap introduced 2012-13;
// first permitted increase to £9,250 under TEF 2017-18; £9,535 from 2025-26.
const FEE_HISTORY = [
  { year: 2006, nominal: 3000, real: 5040 },
  { year: 2007, nominal: 3070, real: 5030 },
  { year: 2008, nominal: 3145, real: 4960 },
  { year: 2009, nominal: 3225, real: 5020 },
  { year: 2010, nominal: 3290, real: 4970 },
  { year: 2011, nominal: 3375, real: 4860 },
  { year: 2012, nominal: 9000, real: 12090 },
  { year: 2013, nominal: 9000, real: 11800 },
  { year: 2014, nominal: 9000, real: 11540 },
  { year: 2015, nominal: 9000, real: 11350 },
  { year: 2016, nominal: 9000, real: 11090 },
  { year: 2017, nominal: 9250, real: 11200 },
  { year: 2018, nominal: 9250, real: 10890 },
  { year: 2019, nominal: 9250, real: 10720 },
  { year: 2020, nominal: 9250, real: 10580 },
  { year: 2021, nominal: 9250, real: 10390 },
  { year: 2022, nominal: 9250, real: 9790 },
  { year: 2023, nominal: 9250, real: 9470 },
  { year: 2024, nominal: 9250, real: 9250 },
  { year: 2025, nominal: 9535, real: 9360 },
];

// ─── International vs home fee comparison (2024-25) ──────────────
// Home cap: DfE fee regulations. International averages: HESA
// Student Record 2022-23 / institutions' published fee schedules.
const FEE_COMPARISON = [
  { type: "Home UG cap", fee: 9535, color: P.navy },
  { type: "Intl UG (avg)", fee: 22200, color: PURPLE },
  { type: "Intl PG Taught (avg)", fee: 19800, color: PURPLE },
  { type: "Intl Medicine", fee: 38000, color: P.sienna },
];

// ─── HESA Statistical Bulletin SB271 (published March 2025) ─────────
// Non-UK students by country of domicile, 2023-24 academic year.
// Headcount (total enrolments). EU countries are counted as international
// post-Brexit. China (PRC) and Hong Kong reported separately by HESA.
// India overtook China in 2022-23 and maintained the lead in 2023-24,
// though Indian new-entrant numbers fell ~15% year-on-year following
// tightened Student visa dependant rules introduced January 2024.
const INTL_STUDENTS_BY_COUNTRY = [
  { country: "India",        students: 166310, eu: false, highlight: false },
  { country: "China",        students: 149885, eu: false, highlight: true  },
  { country: "Nigeria",      students:  57505, eu: false, highlight: false },
  { country: "Pakistan",     students:  45720, eu: false, highlight: false },
  { country: "USA",          students:  23250, eu: false, highlight: false },
  { country: "Hong Kong",    students:  17250, eu: false, highlight: true  },
  { country: "Malaysia",     students:  12760, eu: false, highlight: false },
  { country: "Nepal",        students:  12715, eu: false, highlight: false },
  { country: "Bangladesh",   students:  12285, eu: false, highlight: false },
  { country: "Ireland",      students:   9690, eu: true,  highlight: false },
  { country: "Saudi Arabia", students:   9680, eu: false, highlight: false },
  { country: "France",       students:   8680, eu: true,  highlight: false },
  { country: "Italy",        students:   7160, eu: true,  highlight: false },
  { country: "Spain",        students:   7110, eu: true,  highlight: false },
  { country: "Germany",      students:   7105, eu: true,  highlight: false },
];
const TOTAL_INTL_STUDENTS = 732285;

// ─── HESA Finance Statistics — sector operating surplus ──────────
// Source: HESA Finance Statistics, Table 3, various years.
// 2019-20: COVID year — international travel disrupted mid-year.
// 2020-21: Surplus elevated by pandemic support schemes and reduced activity costs.
// 2021-22: Elevated by unrealised investment and endowment gains.
// 'inDeficit' = count of UK HEIs reporting an operating deficit that year.
const SECTOR_SURPLUS = [
  { year: "2018-19", surplusPct: 5.1, inDeficit: 18 },
  { year: "2019-20", surplusPct: 2.2, inDeficit: 41 },
  { year: "2020-21", surplusPct: 6.0, inDeficit: 14 },
  { year: "2021-22", surplusPct: 7.5, inDeficit: 12 },
  { year: "2022-23", surplusPct: 5.3, inDeficit: 26 },
];

// ─── Named institution operating surplus 2022-23 ─────────────────
// Source: HESA Finance Statistics 2022-23 and individual published accounts.
// Sorted by surplus % descending. Oxford and Cambridge figures include
// substantial endowment and investment income; their core teaching/research
// surpluses are materially lower. Coventry's strong position reflects its
// CU Global overseas campus network, atypical among post-92 institutions.
// coreSurplusPct = surplus from core teaching & research activity.
// endowmentPct   = additional surplus from endowment and investment returns.
// Oxford/Cambridge endowment split is approximate; all other institutions
// have negligible endowment income so endowmentPct = 0.
const NAMED_INSTITUTIONS = [
  // ── Top 5 by research output / rankings ──
  { name: "Oxford",           group: "Top 5",    coreSurplusPct:  6.4, endowmentPct: 8.3, incomeM: 2406 },
  { name: "Cambridge",        group: "Top 5",    coreSurplusPct:  7.0, endowmentPct: 7.3, incomeM: 2726 },
  { name: "LSE",              group: "Top 5",    coreSurplusPct:  6.8, endowmentPct: 0,   incomeM:  470 },
  { name: "Imperial",         group: "Top 5",    coreSurplusPct:  5.1, endowmentPct: 0,   incomeM: 1452 },
  { name: "UCL",              group: "Top 5",    coreSurplusPct:  4.9, endowmentPct: 0,   incomeM: 1872 },
  // ── Red brick / civic ──
  { name: "Manchester",       group: "Red brick", coreSurplusPct:  3.7, endowmentPct: 0,   incomeM: 1298 },
  { name: "Nottingham",       group: "Red brick", coreSurplusPct:  3.3, endowmentPct: 0,   incomeM:  664 },
  { name: "Leeds",            group: "Red brick", coreSurplusPct:  2.9, endowmentPct: 0,   incomeM:  830 },
  { name: "Birmingham",       group: "Red brick", coreSurplusPct:  1.2, endowmentPct: 0,   incomeM:  820 },
  { name: "Sheffield",        group: "Red brick", coreSurplusPct:  0.7, endowmentPct: 0,   incomeM:  720 },
  // ── Post-92 / modern ──
  { name: "Coventry",         group: "Post-92",   coreSurplusPct:  6.7, endowmentPct: 0,   incomeM:  672 },
  { name: "Nottingham Trent", group: "Post-92",   coreSurplusPct:  2.1, endowmentPct: 0,   incomeM:  382 },
  { name: "Sheffield Hallam", group: "Post-92",   coreSurplusPct:  1.3, endowmentPct: 0,   incomeM:  383 },
  { name: "Univ. Arts London",group: "Post-92",   coreSurplusPct: -3.6, endowmentPct: 0,   incomeM:  392 },
  { name: "Birmingham City",  group: "Post-92",   coreSurplusPct: -6.9, endowmentPct: 0,   incomeM:  267 },
];

// ─── Research income by source (2023-24) ─────────────────────────
// TRAC income categories + Research England QR block grant.
// 'UKRI competitive grants' = RCUK/UKRI project grants (EPSRC, MRC, etc.).
// 'QR block grant' = Research England quality-related funding, allocated
//   on REF outcomes — not competitive but tied to research performance.
// 'PG Studentships' = UKRI/charity-funded PhD studentship income.
// 'Overseas govts' = non-EU state funders; includes US NIH, Chinese NSFC
//   and state-linked bodies, Gulf state research agencies, and others.
// Sources: OfS TRAC 2023-24; Research England QR allocations 2023-24.
const RESEARCH_INCOME_SOURCES = [
  { source: "UKRI competitive grants",   value: 2351, color: P.teal   },
  { source: "QR block grant (RE)",       value: 2103, color: "#5B9EC4" },
  { source: "UK Gov (NIHR, MoD, etc.)", value: 1306, color: P.navy   },
  { source: "Industry (UK & overseas)", value: 1329, color: P.sienna  },
  { source: "PG studentships",           value: 1291, color: P.grey   },
  { source: "UK Charities",              value: 1149, color: "#4A7A58" },
  { source: "Overseas governments",      value:  539, color: P.red    },
  { source: "Horizon Europe",            value:  372, color: P.yellow  },
];

// ─── TRAC 2023-24 — research cost recovery by sponsor ────────────
// Source: OfS Annual TRAC 2023-24 (OfS 2025.31), Table 2.
// England and Northern Ireland HEIs (128 institutions).
// 'PG Training' = postgraduate research studentships funded by
//   UKRI / charities / government at stipend + tuition rates.
// 'Own-funded' = research conducted using the university's own funds
//   (i.e. cross-subsidised directly from other income streams).
const TRAC_DATA = [
  { sponsor: "Research Councils", income: 2351, fec: 3454, recovery: 68.1 },
  { sponsor: "UK Charities",      income: 1149, fec: 2068, recovery: 55.6 },
  { sponsor: "Other Gov Depts",   income: 1306, fec: 1715, recovery: 76.2 },
  { sponsor: "Industry",          income: 1329, fec: 1773, recovery: 75.0 },
  { sponsor: "PG Training",       income: 1291, fec: 3019, recovery: 42.8 },
  { sponsor: "EU",                income:  372, fec:  658, recovery: 56.5 },
  { sponsor: "Own-funded",        income:  538, fec: 3119, recovery: 17.3 },
];

// Renders the hatch-pattern defs AND end-of-bar labels in one SVG pass.
// Using Customized lets us read the chart's own scale so labels for
// negative-surplus bars (UAL, Birmingham City) appear LEFT of the bar,
// while positive bars get labels to the RIGHT. Avoids JS float drift
// (6.4 + 8.3 = 14.699…) by rounding before display.
function InstitutionChartOverlay(props) {
  const xAxis = props.xAxisMap && Object.values(props.xAxisMap)[0];
  const yAxis = props.yAxisMap && Object.values(props.yAxisMap)[0];
  const bandwidth = (yAxis?.scale && typeof yAxis.scale.bandwidth === "function")
    ? yAxis.scale.bandwidth() : 20;
  return (
    <>
      <defs>
        <pattern id="endowmentHatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="none" />
          <line x1="0" y1="0" x2="0" y2="7" stroke={P.grey} strokeWidth="2.5" strokeOpacity="0.55" />
        </pattern>
      </defs>
      {xAxis?.scale && yAxis?.scale && NAMED_INSTITUTIONS.map((d, i) => {
        const total = Math.round((d.coreSurplusPct + d.endowmentPct) * 10) / 10;
        const isNeg = total < 0;
        const xPx = xAxis.scale(total);
        const yPx = yAxis.scale(d.name);
        if (xPx == null || yPx == null) return null;
        return (
          <text key={i}
            x={isNeg ? xPx - 4 : xPx + 4}
            y={yPx + bandwidth / 2}
            dominantBaseline="middle"
            textAnchor={isNeg ? "end" : "start"}
            fontSize={9} fill={P.textLight}
            fontFamily="'DM Mono', monospace"
          >
            {`${total}%`}
          </text>
        );
      })}
    </>
  );
}

// Dark navy tooltip matching the site's CustomTooltip style.
function DarkTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: P.navy, border: "1px solid rgba(255,255,255,0.1)", padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#e0ddd6", borderRadius: 3, boxShadow: "0 4px 16px rgba(28,43,69,0.25)" }}>
      <div style={{ fontWeight: 500, marginBottom: 4, color: "#EDE3C8", letterSpacing: "0.04em" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ opacity: 0.65 }}>{p.name}:</span>
          <span style={{ fontWeight: 500, color: "#fff" }}>{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function UniversityFunding() {
  const [tracView, setTracView] = useState("deficit");

  const latest = INCOME_SERIES[INCOME_SERIES.length - 1];
  const total2223 = latest.home + latest.intl + latest.research + latest.other;
  const intlPct = ((latest.intl / total2223) * 100).toFixed(0);

  const fee2012Real = FEE_HISTORY.find(f => f.year === 2012).real;
  const feeCurrent = FEE_HISTORY[FEE_HISTORY.length - 1];
  const realCutPct = (((fee2012Real - feeCurrent.real) / fee2012Real) * 100).toFixed(1);

  const intlMultiple = (FEE_COMPARISON[1].fee / FEE_COMPARISON[0].fee).toFixed(1);

  const tracTotals = TRAC_DATA.reduce(
    (acc, d) => ({ income: acc.income + d.income, fec: acc.fec + d.fec }),
    { income: 0, fec: 0 }
  );
  const tracDeficit = tracTotals.fec - tracTotals.income;
  const tracRecovery = ((tracTotals.income / tracTotals.fec) * 100).toFixed(1);

  const tracChartData = TRAC_DATA.map(d => ({
    ...d,
    deficit: d.fec - d.income,
  }));

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>
          University Funding
        </h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          income sources, costs, and the cross-subsidy mechanism
        </span>
      </div>

      {/* ═══════════ SECTION 1 — INCOME MIX ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Where the money comes from</h3>
        <p style={SECTION_NOTE}>
          UK universities draw income from four main streams: home student fees, international student fees,
          research income (grants and the Research England QR block grant), and other income including
          residences, commercial services, and endowments. Between 2016-17 and 2022-23, total sector income
          grew from £37.4bn to £49.6bn. International fee income grew 133% over that period, from £5.1bn to
          £11.9bn, while home fee income grew 8% in nominal terms. Home fees are capped by government
          regulation; international fees carry no cap.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="Total Income" value="£49.6bn" change="2022-23 (HESA)" up={false} color={P.navy} delay={0.1} />
          <MetricCard label="International Fees" value={`£${(latest.intl / 1000).toFixed(1)}bn`} change={`${intlPct}% of total income`} up={false} color={P.sienna} delay={0.18} />
          <MetricCard label="Home Fees" value={`£${(latest.home / 1000).toFixed(1)}bn`} change="Capped at £9,250/yr" up={false} color={P.navy} delay={0.26} />
          <MetricCard label="Research Income" value={`£${(latest.research / 1000).toFixed(1)}bn`} change="Grants + QR block grant" up={false} color={P.teal} delay={0.34} />
        </div>

        <ChartCard
          title="UK University Income by Source"
          subtitle="All UK HEIs — £m — 2016-17 to 2022-23"
          source={<>SOURCE: <a href="https://www.hesa.ac.uk/data-and-analysis/finances/table-1" target="_blank" rel="noopener noreferrer">HESA Finance Statistics 2022-23, Table 1</a> &middot; Published March 2024 &middot; EU students reclassified as international from 2021-22</>}
          legend={[
            { key: "home",     label: "Home student fees",                               color: P.navy },
            { key: "intl",     label: "International student fees (incl. EU from 2021-22)", color: P.sienna },
            { key: "research", label: "Research income (grants + QR block grant)",        color: P.teal },
            { key: "other",    label: "Other income (residences, services, endowments)",  color: P.grey },
          ]}
          height={320}
        >
          <BarChart data={INCOME_SERIES} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} />
            <YAxis tick={AXIS_TICK_MONO} tickFormatter={v => `£${(v / 1000).toFixed(0)}bn`} width={48} />
            <Tooltip content={<DarkTooltip fmt={v => `£${Number(v).toLocaleString()}m`} />} />
            <Bar dataKey="home"     stackId="a" fill={P.navy}   name="Home fees" />
            <Bar dataKey="intl"     stackId="a" fill={P.sienna} name="International fees" />
            <Bar dataKey="research" stackId="a" fill={P.teal}   name="Research income" />
            <Bar dataKey="other"    stackId="a" fill={P.grey}   name="Other income" />
          </BarChart>
        </ChartCard>
      </div>

      {/* ═══════════ SECTION 2 — FEE FREEZE ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>The tuition fee freeze</h3>
        <p style={SECTION_NOTE}>
          The home undergraduate fee cap was set at £9,000 in 2012-13 and held at £9,250 from 2017-18 until 2024-25,
          with the first above-inflation increase to £9,535 taking effect in 2025-26. Adjusted for CPI inflation,
          the 2012-13 fee is equivalent to approximately £12,090 in 2024-25 prices. At the current cap of £9,535,
          universities receive roughly {realCutPct}% less per home undergraduate student in real terms than in the
          first year of the £9k regime. Home fee income has therefore grown only through increases in student
          numbers, not through increases in per-student revenue.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="2025-26 Fee Cap" value="£9,535" change="First rise since 2017-18" up={false} color={P.navy} delay={0.1} />
          <MetricCard label="2012 Fee in Today's Prices" value={`£${fee2012Real.toLocaleString()}`} change="CPI-adjusted to 2024-25" up={false} color={P.textLight} delay={0.18} />
          <MetricCard label="Real-terms Cut Since 2012" value={`-${realCutPct}%`} change="Per student, inflation-adjusted" up={false} color={P.red} delay={0.26} />
          <MetricCard label="International Premium" value={`${intlMultiple}×`} change="Avg. intl UG vs home cap" up={false} color={P.sienna} delay={0.34} />
        </div>

        <ChartCard
          title="Home Undergraduate Fee Cap: Nominal vs Real Terms"
          subtitle="England — Annual fee cap — real values in 2024-25 prices (CPI)"
          source={<>SOURCE: DfE tuition fee regulations &middot; CPI deflation: ONS series D7BT</>}
          legend={[
            { key: "nominal", label: "Nominal fee cap (£)", color: P.navy },
            { key: "real",    label: "Real value (2024-25 prices, CPI)",     color: P.red  },
          ]}
          height={300}
        >
          <LineChart data={FEE_HISTORY} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" type="number" domain={[2006, 2025]} tick={AXIS_TICK_MONO} />
            <YAxis tick={AXIS_TICK_MONO} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} domain={[0, 14000]} width={40} />
            <Tooltip content={<DarkTooltip fmt={v => `£${Number(v).toLocaleString()}`} />} />
            <ReferenceLine x={2012} stroke={P.grey} strokeDasharray="4 4"
              label={{ value: "£9k cap", fontSize: 10, fill: P.textLight, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
            <Line type="monotone" dataKey="nominal" stroke={P.navy}  strokeWidth={2} dot={false} name="Nominal" />
            <Line type="monotone" dataKey="real"    stroke={P.red}   strokeWidth={2} dot={false} name="Real (2024-25 prices)" strokeDasharray="5 3" />
          </LineChart>
        </ChartCard>
      </div>

      {/* ═══════════ SECTION 3 — INTERNATIONAL PREMIUM ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>The international fee premium</h3>
        <p style={SECTION_NOTE}>
          International students face no tuition fee cap. Average fees range from approximately £19,800 for
          postgraduate taught programmes to £38,000 for medicine and dentistry. Standard undergraduate courses
          average around £22,200, roughly {intlMultiple} times the home cap. This premium generates a per-student
          surplus relative to teaching costs that home fees — especially in expensive STEM and clinical subjects —
          often do not. The revenue gap between home and international fees is the primary mechanism universities
          use to fund research activities that run at a structural deficit.
        </p>

        <ChartCard
          title="Tuition Fees: Home Cap vs International Averages (2024-25)"
          subtitle="England — Annual fee cap (home) / average published fee (international) — £"
          source={<>SOURCE: DfE fee cap regulations &middot; <a href="https://www.hesa.ac.uk/data-and-analysis/students/what-do-they-pay" target="_blank" rel="noopener noreferrer">HESA Student Record 2022-23</a> &middot; University fee schedules 2024-25</>}
          height={240}
        >
          <BarChart data={FEE_COMPARISON} layout="vertical" margin={{ top: 4, right: 80, left: 4, bottom: 4 }}>
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK_MONO} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} domain={[0, 44000]} />
            <YAxis type="category" dataKey="type" tick={{ ...AXIS_TICK_MONO, fontSize: 10 }} width={148} />
            <Tooltip content={<DarkTooltip fmt={v => `£${Number(v).toLocaleString()}`} />} />
            <Bar dataKey="fee" radius={[0, 2, 2, 0]} name="Fee">
              {FEE_COMPARISON.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
              <LabelList dataKey="fee" position="right"
                formatter={v => `£${Number(v).toLocaleString()}`}
                style={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Non-UK Students by Country of Domicile (2023-24)"
          subtitle="UK HEIs — headcount — top 15 source countries — HESA SB271"
          source={<>SOURCE: <a href="https://www.hesa.ac.uk/data-and-analysis/students" target="_blank" rel="noopener noreferrer">HESA Statistical Bulletin SB271</a> (published March 2025) &middot; EU countries counted as international post-Brexit &middot; China (PRC) and Hong Kong reported separately</>}
          legend={[
            { key: "china", label: "China / Hong Kong", color: PURPLE },
            { key: "eu",    label: "EU",                 color: P.teal  },
            { key: "other", label: "Other",              color: P.navy  },
          ]}
          height={390}
        >
          <BarChart
            data={[...INTL_STUDENTS_BY_COUNTRY].sort((a, b) => b.students - a.students)}
            layout="vertical"
            margin={{ top: 4, right: 72, left: 4, bottom: 4 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK_MONO} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="country" tick={{ ...AXIS_TICK_MONO, fontSize: 10 }} width={90} />
            <Tooltip content={<DarkTooltip fmt={v => `${Number(v).toLocaleString()} students`} />} />
            <Bar dataKey="students" name="Students" radius={[0, 2, 2, 0]}>
              {[...INTL_STUDENTS_BY_COUNTRY].sort((a, b) => b.students - a.students).map((d, i) => (
                <Cell key={i} fill={d.highlight ? PURPLE : d.eu ? P.teal : P.navy} />
              ))}
              <LabelList dataKey="students" position="right"
                formatter={v => `${(v / 1000).toFixed(1)}k`}
                style={{ fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} />
            </Bar>
          </BarChart>
        </ChartCard>
        <p style={{ ...SECTION_NOTE, marginTop: 10 }}>
          India is the largest single source country at {INTL_STUDENTS_BY_COUNTRY.find(d => d.country === "India").students.toLocaleString()} students,
          ahead of China (PRC) at {INTL_STUDENTS_BY_COUNTRY.find(d => d.country === "China").students.toLocaleString()}.
          India overtook China in 2022-23 after a surge in Indian enrolments following the introduction of the Graduate visa route in 2021,
          though new Indian entrants fell approximately 15% in 2023-24 following tighter dependant visa rules introduced in January 2024.
          Post-Brexit, EU students are counted as international; the five largest EU source countries
          (Ireland, France, Italy, Spain, Germany) together contribute approximately {INTL_STUDENTS_BY_COUNTRY.filter(d => d.eu).reduce((s, d) => s + d.students, 0).toLocaleString()} students.
          China and Hong Kong combined account for approximately {Math.round((INTL_STUDENTS_BY_COUNTRY.find(d => d.country === "China").students + INTL_STUDENTS_BY_COUNTRY.find(d => d.country === "Hong Kong").students) / TOTAL_INTL_STUDENTS * 100)}% of all non-UK students.
        </p>
      </div>

      {/* ═══════════ SECTION 4 — RESEARCH DEFICIT ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>The research deficit</h3>
        <p style={SECTION_NOTE}>
          The largest single sources of research income are UKRI competitive grants (£2.4bn) and the Research
          England QR block grant (£2.1bn), followed by UK government departments (£1.3bn) and industry (£1.3bn).
          Non-EU overseas governments — a category that includes US federal agencies (NIH, NSF), Chinese
          state-linked bodies, and Gulf research agencies — contribute £539m, exceeding UK receipts from Horizon
          Europe (£372m). The Horizon figure reflects partial-association receipts prior to the UK&rsquo;s full
          re-association in late 2023; the overseas government figure is structural and growing.
        </p>
        <p style={SECTION_NOTE}>
          Universities calculate the full economic cost (fEC) of research using the Transparent Approach to
          Costing (TRAC), covering staff, equipment, estates, and a sustainability margin. UKRI grants are
          set to fund 80% of fEC; universities are expected to fund the remaining 20% from other sources. In
          practice, research councils recovered only 68.1% of fEC in 2023-24. Across all funders the recovery
          rate was {tracRecovery}%, leaving a sector-wide deficit of £{(tracDeficit / 1000).toFixed(1)}bn.
          Postgraduate research training is the most severely underfunded category at 42.8% recovery, creating
          a structural incentive to recruit internationally-funded doctoral researchers. Own-funded research
          (where universities directly deploy their own funds) recovers only 17.3% of fEC — meaning this
          category is entirely cross-subsidised from other income.
        </p>

        <ChartCard
          title="Research Income by Source (2023-24)"
          subtitle="England and Northern Ireland HEIs — £m — TRAC income categories + Research England QR block grant"
          source={<>SOURCE: OfS Annual TRAC 2023-24 (OfS 2025.31) &middot; Research England QR allocations 2023-24 &middot; &lsquo;Overseas govts&rsquo; includes US NIH/NSF, Chinese state bodies, Gulf research agencies</>}
          legend={[
            { key: "ukri",     label: "UKRI competitive grants",          color: P.teal },
            { key: "qr",       label: "QR block grant (Research England)", color: "#5B9EC4" },
            { key: "gov",      label: "UK Gov (NIHR, MoD, etc.)",          color: P.navy },
            { key: "industry", label: "Industry (UK & overseas)",          color: P.sienna },
            { key: "pg",       label: "PG studentships",                   color: P.grey },
            { key: "charity",  label: "UK Charities",                      color: "#4A7A58" },
            { key: "overseas", label: "Overseas governments",              color: P.red },
            { key: "horizon",  label: "Horizon Europe",                    color: P.yellow },
          ]}
          height={300}
        >
          <BarChart
            data={[...RESEARCH_INCOME_SOURCES].sort((a, b) => b.value - a.value)}
            layout="vertical"
            margin={{ top: 4, right: 72, left: 4, bottom: 4 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK_MONO} tickFormatter={v => `£${(v / 1000).toFixed(1)}bn`} />
            <YAxis type="category" dataKey="source" tick={{ ...AXIS_TICK_MONO, fontSize: 9 }} width={158} />
            <Tooltip content={<DarkTooltip fmt={v => `£${Number(v).toLocaleString()}m`} />} />
            <Bar dataKey="value" name="Income (£m)" radius={[0, 2, 2, 0]}>
              {[...RESEARCH_INCOME_SOURCES].sort((a, b) => b.value - a.value).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <LabelList dataKey="value" position="right"
                formatter={v => `£${(v / 1000).toFixed(1)}bn`}
                style={{ fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20, marginTop: 20 }}>
          <MetricCard label="Total Research fEC" value={`£${(tracTotals.fec / 1000).toFixed(1)}bn`} change="Full economic cost 2023-24" up={false} color={P.navy} delay={0.1} />
          <MetricCard label="Research Income" value={`£${(tracTotals.income / 1000).toFixed(1)}bn`} change={`${tracRecovery}% of fEC recovered`} up={false} color={P.teal} delay={0.18} />
          <MetricCard label="Sector Research Deficit" value={`£${(tracDeficit / 1000).toFixed(1)}bn`} change="Funded from other sources" up={false} color={P.red} delay={0.26} />
          <MetricCard label="PG Training Recovery" value="42.8%" change="vs 80% target (UKRI)" up={false} color={P.sienna} delay={0.34} />
        </div>

        <ChartCard
          title="Research Cost Recovery by Funder"
          subtitle="England and Northern Ireland HEIs — £m — fEC vs income received — 2023-24"
          source={<>SOURCE: <a href="https://www.officeforstudents.org.uk/publications/annual-trac-2023-24/" target="_blank" rel="noopener noreferrer">OfS Annual TRAC 2023-24 (OfS 2025.31), Table 2</a> &middot; Published June 2025</>}
          views={["deficit", "absolute"]}
          viewLabels={{ deficit: "Deficit Gap", absolute: "fEC vs Income" }}
          activeView={tracView}
          onViewChange={setTracView}
          legend={tracView === "absolute" ? [
            { key: "fec",    label: "Full economic cost (fEC)", color: "#1C2B4530" },
            { key: "income", label: "Income received",          color: P.teal },
          ] : [
            { key: "income",  label: "Income received",  color: P.teal },
            { key: "deficit", label: "Unfunded deficit",  color: P.red  },
          ]}
          height={340}
        >
          {tracView === "absolute" ? (
            <BarChart data={tracChartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="sponsor" tick={{ ...AXIS_TICK_MONO, fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tick={AXIS_TICK_MONO} tickFormatter={v => `£${v.toLocaleString()}m`} width={58} />
              <Tooltip content={<DarkTooltip fmt={v => `£${Number(v).toLocaleString()}m`} />} />
              <Bar dataKey="fec"    fill="#1C2B4530" name="fEC" />
              <Bar dataKey="income" fill={P.teal}    name="Income" />
            </BarChart>
          ) : (
            <BarChart data={tracChartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="sponsor" tick={{ ...AXIS_TICK_MONO, fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tick={AXIS_TICK_MONO} tickFormatter={v => `£${v.toLocaleString()}m`} width={58} />
              <Tooltip content={<DarkTooltip fmt={v => `£${Number(v).toLocaleString()}m`} />} />
              <Bar dataKey="income"  stackId="a" fill={P.teal} name="Income" />
              <Bar dataKey="deficit" stackId="a" fill={P.red}  name="Deficit">
                <LabelList dataKey="recovery" position="top"
                  formatter={v => `${v}%`}
                  style={{ fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} />
              </Bar>
            </BarChart>
          )}
        </ChartCard>
      </div>

      {/* ═══════════ SECTION 5 — BALANCE SHEETS ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>University balance sheets</h3>
        <p style={SECTION_NOTE}>
          The sector's aggregate operating surplus was approximately 5.3% of income in 2022-23. The headline
          figure conceals significant variation: around 26 of approximately 140 institutions reported operating
          deficits that year, and the 2019-20 COVID shock exposed the fragility of the model, pushing the sector
          surplus down to 2.2% as international travel was disrupted. The apparent recovery in 2020-21 and 2021-22
          was partly an artefact of pandemic cost savings and unrealised investment gains, not a structural
          improvement. Oxford and Cambridge report high aggregate surpluses, but much of this reflects endowment
          and investment returns rather than teaching and research income. Red brick civic universities report
          surpluses of 1-4%, leaving limited headroom. Post-92 universities — which draw most income from home
          undergraduate fees and carry minimal research income — show surpluses near zero or deficits: Birmingham
          City University reported a deficit of approximately 7% in 2022-23 and subsequently announced around
          300 redundancies; the University of the Arts London entered deficit and restructured in 2024. The Office
          for Students reported in 2024 that approximately 40% of HEIs face financially challenging positions on
          an underlying basis. The Association of University Directors of Estates estimates a sector-wide deferred
          maintenance backlog of approximately £10bn, reflecting sustained under-investment in estates.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="Sector Surplus" value="5.3%" change="2022-23 operating margin" up={false} color={P.navy} delay={0.1} />
          <MetricCard label="Institutions in Deficit" value="~26" change="Of ~140 UK HEIs, 2022-23" up={false} color={P.sienna} delay={0.18} />
          <MetricCard label="OfS At-risk Assessment" value="~40%" change="HEIs in challenging position (2024)" up={false} color={P.red} delay={0.26} />
          <MetricCard label="Deferred Maintenance" value="~£10bn" change="Sector backlog (AUDE est.)" up={false} color={P.grey} delay={0.34} />
        </div>

        <ChartCard
          title="Sector Operating Surplus"
          subtitle="All UK HEIs — operating surplus as % of income — 2018-19 to 2022-23"
          source={<>SOURCE: <a href="https://www.hesa.ac.uk/data-and-analysis/finances/table-3" target="_blank" rel="noopener noreferrer">HESA Finance Statistics, Table 3</a> &middot; Various years &middot; 2020-21/2021-22 affected by pandemic support and investment gains</>}
          legend={[
            { key: "surplusPct", label: "Operating surplus % of income", color: P.teal },
            { key: "inDeficit",  label: "No. of institutions in deficit (right axis)", color: P.sienna },
          ]}
          height={300}
        >
          <BarChart data={SECTOR_SURPLUS} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} />
            <YAxis tick={AXIS_TICK_MONO} tickFormatter={v => `${v}%`} domain={[0, 10]} width={36} />
            <Tooltip content={<DarkTooltip fmt={v => typeof v === "number" && v < 20 ? `${v}%` : v} />} />
            <ReferenceLine y={3} stroke={P.grey} strokeDasharray="4 4"
              label={{ value: "3% threshold", fontSize: 10, fill: P.textLight, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
            <Bar dataKey="surplusPct" name="Surplus %" radius={[2, 2, 0, 0]}>
              {SECTOR_SURPLUS.map((d, i) => (
                <Cell key={i} fill={d.surplusPct < 3 ? P.red : d.year === "2021-22" || d.year === "2020-21" ? P.grey : P.teal} />
              ))}
              <LabelList dataKey="surplusPct" position="top"
                formatter={v => `${v}%`}
                style={{ fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Operating Surplus by Institution (2022-23)"
          subtitle="Selected UK HEIs — operating surplus as % of total income — HESA Finance Statistics"
          source={<>SOURCE: <a href="https://www.hesa.ac.uk/data-and-analysis/finances/table-3" target="_blank" rel="noopener noreferrer">HESA Finance Statistics 2022-23</a> &middot; Individual published accounts &middot; Oxford/Cambridge endowment split is approximate</>}
          height={400}
        >
          <BarChart data={NAMED_INSTITUTIONS} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 4 }}>
            <Customized component={InstitutionChartOverlay} />
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK_MONO} tickFormatter={v => `${v}%`} domain={[-10, 18]} />
            <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK_MONO, fontSize: 10 }} width={128} />
            <Tooltip content={<DarkTooltip fmt={v => `${v}%`} />} />
            <ReferenceLine x={0} stroke={P.borderStrong} />
            <Bar dataKey="coreSurplusPct" stackId="s" name="Core surplus %">
              {NAMED_INSTITUTIONS.map((d, i) => (
                <Cell key={i}
                  fill={d.coreSurplusPct < 0 ? P.red : d.coreSurplusPct < 2 ? P.sienna : d.group === "Top 5" ? P.navy : P.teal}
                />
              ))}
            </Bar>
            <Bar dataKey="endowmentPct" stackId="s" name="Endowment / investment %" radius={[0, 2, 2, 0]}>
              {NAMED_INSTITUTIONS.map((_, i) => (
                <Cell key={i} fill="url(#endowmentHatch)" />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
        <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginTop: 6, marginBottom: 4 }}>
          <span style={{ color: P.navy, fontWeight: 600 }}>■</span> Top 5 &nbsp;
          <span style={{ color: P.teal, fontWeight: 600 }}>■</span> Red brick / civic &nbsp;
          <span style={{ color: P.sienna, fontWeight: 600 }}>■</span> Post-92 (marginal) &nbsp;
          <span style={{ color: P.red, fontWeight: 600 }}>■</span> Post-92 (deficit) &nbsp;
          <span style={{ borderBottom: `2px dashed ${P.grey}`, paddingBottom: 1, opacity: 0.7 }}>▒</span> Endowment &amp; investment returns (Oxford / Cambridge)
        </div>
      </div>

      {/* ═══════════ SECTION 6 — STRUCTURAL INCENTIVES ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Structural incentives</h3>
        <p style={SECTION_NOTE}>
          The combination of a frozen home fee, uncapped international fees, and systematic research underfunding
          creates three reinforcing structural incentives. First, universities have a strong financial incentive
          to maximise international student recruitment, since each international student generates a surplus
          that cross-subsidises research activities. India is the largest single source country at
          approximately {INTL_STUDENTS_BY_COUNTRY.find(d => d.country === "India").students.toLocaleString()} students (2023-24),
          with China at {INTL_STUDENTS_BY_COUNTRY.find(d => d.country === "China").students.toLocaleString()} and Nigeria at {INTL_STUDENTS_BY_COUNTRY.find(d => d.country === "Nigeria").students.toLocaleString()}.
          Second, postgraduate research training recovers only 42.8% of fEC, making self-funded and
          overseas-government-funded doctoral students financially attractive relative to UKRI-sponsored ones.
          Third, own-funded research recovers only 17.3% of fEC and depends entirely on surpluses generated
          elsewhere. Taken together, these incentives embed the research funding model&rsquo;s sustainability
          in the volume and pricing of international student recruitment.
        </p>

        <ChartCard
          title="fEC Recovery Rate by Funder Type (2023-24)"
          subtitle="England and Northern Ireland HEIs — % of full economic cost recovered — 80% = UKRI policy target"
          source={<>SOURCE: OfS Annual TRAC 2023-24 (OfS 2025.31), Table 2</>}
          height={280}
        >
          <BarChart data={TRAC_DATA} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="sponsor" tick={{ ...AXIS_TICK_MONO, fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
            <YAxis tick={AXIS_TICK_MONO} tickFormatter={v => `${v}%`} domain={[0, 100]} width={36} />
            <Tooltip content={<DarkTooltip fmt={v => `${v}%`} />} />
            <ReferenceLine y={80} stroke={P.navy} strokeDasharray="4 4"
              label={{ value: "80% target", fontSize: 10, fill: P.navy, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
            <Bar dataKey="recovery" name="Recovery %" radius={[2, 2, 0, 0]}>
              {TRAC_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.recovery < 50 ? P.red : entry.recovery < 70 ? P.sienna : P.teal} />
              ))}
              <LabelList dataKey="recovery" position="top"
                formatter={v => `${v}%`}
                style={{ fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} />
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      <AnalysisBox color={PURPLE} label="The cross-subsidy mechanism">
        UK universities receive £49.6bn in income (2022-23). International fees (£11.9bn, 24% of total) have
        grown 133% since 2016-17 as international student numbers have grown and, from 2021-22, EU students
        have paid international rather than home rates. Home fees (£12.3bn) are frozen in real terms: the
        £9,250 cap is worth approximately 23% less per student in real terms than when it was introduced in
        2012-13. Research carries a structural £{(tracDeficit / 1000).toFixed(1)}bn annual deficit: fEC of
        £{(tracTotals.fec / 1000).toFixed(1)}bn is covered only to {tracRecovery}% by research income. The
        deficit is funded from other sources, principally international fee surpluses. Postgraduate research
        training recovers 42.8% of fEC, making internationally-funded doctoral students financially attractive
        relative to UKRI-sponsored ones. Own-funded research recovers 17.3%, meaning it is almost entirely
        cross-subsidised. This architecture embeds a structural dependency on international student recruitment
        into the UK research base.
      </AnalysisBox>
    </div>
  );
}
