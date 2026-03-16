import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, SOURCE_TEXT } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { useJsonDataset } from "../../hooks/useDataset";

const FUNDING_SERIES = [
  { key: "business", label: "Business Enterprise", color: P.sienna },
  { key: "government", label: "Government (excl. UKRI)", color: P.navy },
  { key: "ukri", label: "UKRI", color: P.teal },
  { key: "hefce", label: "HE Funding Councils", color: P.yellow },
  { key: "higherEducation", label: "Higher Education", color: "#4A7A58" },
  { key: "privateNonProfit", label: "Private Non-Profit", color: P.grey },
  { key: "overseas", label: "Overseas", color: P.red },
];

// OfS Annual TRAC 2023-24, Table 2 — Research by sponsor type
// England and Northern Ireland HEIs (128 institutions)
// Source: OfS 2025.31, published 10 June 2025
const TRAC_RESEARCH = [
  { sponsor: "Research Councils", income: 2351, fec: 3454, recovery: 68.1, color: P.teal },
  { sponsor: "Other Gov Depts", income: 1306, fec: 1715, recovery: 76.2, color: P.navy },
  { sponsor: "Industry", income: 1329, fec: 1773, recovery: 75.0, color: P.sienna },
  { sponsor: "UK Charities", income: 1149, fec: 2068, recovery: 55.6, color: "#4A7A58" },
  { sponsor: "EU", income: 372, fec: 658, recovery: 56.5, color: P.yellow },
  { sponsor: "PG Training", income: 1291, fec: 3019, recovery: 42.8, color: P.grey },
  { sponsor: "Own-funded", income: 538, fec: 3119, recovery: 17.3, color: P.red },
];

// Research income by source (for pie chart) — includes QR block grant
const INCOME_PIE = [
  { name: "Research Councils", value: 2351, color: P.teal },
  { name: "QR Grant (RE)", value: 2103, color: "#6B8EC4" },
  { name: "Industry", value: 1329, color: P.sienna },
  { name: "Other Gov Depts", value: 1306, color: P.navy },
  { name: "PG Training", value: 1291, color: P.grey },
  { name: "UK Charities", value: 1149, color: "#4A7A58" },
  { name: "Own-funded", value: 538, color: P.red },
  { name: "EU", value: 372, color: P.yellow },
];

const TRAC_TOTALS = {
  income: 10440, fec: 15807, deficit: 5367, recovery: 66.0,
  qrGrant: 2103, sustainabilityPct: 7.6 };

export default function ResearchFunding() {
  const { data, loading, error, raw } = useJsonDataset("research.json");
  const [fundingView, setFundingView] = useState("stacked");
  const [priceView, setPriceView] = useState("current");
  const [costView, setCostView] = useState("income");

  const chartData = useMemo(() => {
    if (!data) return [];
    const source = priceView === "current" ? data.bySector : data.bySectorReal;
    if (fundingView === "pctGDP") return data.gdpPct;
    return source;
  }, [data, fundingView, priceView]);

  // Grouped public/private for summary
  const publicPrivate = useMemo(() => {
    if (!data?.bySector) return [];
    return data.bySector.map((row) => {
      const pub = (row.government || 0) + (row.ukri || 0) + (row.hefce || 0);
      const priv = (row.business || 0) + (row.privateNonProfit || 0);
      const he = row.higherEducation || 0;
      const overseas = row.overseas || 0;
      return { year: row.year, public: pub, private: priv, higherEducation: he, overseas };
    });
  }, [data]);

  // Regional — exclude UK total, sort by total (must be above early returns)
  const regionData = useMemo(() => {
    if (!data?.regions) return [];
    return data.regions
      .filter((r) => r.region !== "United Kingdom")
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Research Funding</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading ONS GERD data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Research Funding</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latest = data.bySector[data.bySector.length - 1];
  const prev = data.bySector[data.bySector.length - 2];
  const latestGDP = data.gdpPct[data.gdpPct.length - 1];
  const latestPP = publicPrivate[publicPrivate.length - 1];
  const publicTotal = latestPP.public;
  const privateTotal = latestPP.private;
  const publicPct = ((publicTotal / latest.total) * 100).toFixed(1);
  const growthNominal = (((latest.total - prev.total) / prev.total) * 100).toFixed(1);

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Research Funding</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          ONS GERD {latest.year}
        </span>
      </div>

      {/* ═══════════ SECTION 1 — R&D SPENDING ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>UK R&D Expenditure</h3>
        <p style={SECTION_NOTE}>
          Gross Domestic Expenditure on R&D (GERD) measures all R&D performed in the UK, funded
          by business, government, higher education, charities and overseas sources. The ONS
          revised its methodology in 2021 to address undercoverage of small business R&D,
          with comparable data available from 2018 onwards.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Total R&D Spend"
            value={`£${(latest.total / 1000).toFixed(1)}bn`}
            change={`+${growthNominal}% vs ${prev.year}`}
            up={true}
            color={P.navy}
            delay={0.1}
          />
          <MetricCard
            label="R&D as % of GDP"
            value={`${latestGDP.pctGDP}%`}
            change={`${latest.year} (OECD avg: 2.7%)`}
            up={latestGDP.pctGDP >= 2.7}
            color={latestGDP.pctGDP >= 2.7 ? P.teal : P.red}
            delay={0.18}
          />
          <MetricCard
            label="Business R&D"
            value={`£${(latest.business / 1000).toFixed(1)}bn`}
            change={`${((latest.business / latest.total) * 100).toFixed(0)}% of total`}
            up={false}
            color={P.sienna}
            delay={0.26}
          />
          <MetricCard
            label="Public Funding"
            value={`£${(publicTotal / 1000).toFixed(1)}bn`}
            change={`${publicPct}% (Gov + UKRI + HEFC)`}
            up={false}
            color={P.teal}
            delay={0.34}
          />
        </div>

        <ChartCard
          label={
            fundingView === "stacked"
              ? `R&D by source of funding (${priceView === "current" ? "current" : "2023 constant"} prices, £m)`
              : fundingView === "pubpriv"
                ? "Public vs private R&D funding (£m)"
                : "UK R&D as % of GDP"
          }
          yearRange={`${data.bySector[0].year}–${latest.year}`}
          views={["stacked", "pubpriv", "pctGDP"]}
          viewLabels={{ stacked: "By Source", pubpriv: "Public/Private", pctGDP: "% of GDP" }}
          activeView={fundingView}
          onViewChange={setFundingView}
        >
          {fundingView === "stacked" && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setPriceView("current")} style={toggleStyle(priceView === "current")}>Current</button>
                <button onClick={() => setPriceView("constant")} style={toggleStyle(priceView === "constant")}>Constant (2023)</button>
              </div>
              <FundingStackedChart data={chartData} />
            </>
          )}
          {fundingView === "pubpriv" && <PublicPrivateChart data={publicPrivate} />}
          {fundingView === "pctGDP" && <GDPChart data={data.gdpPct} />}
        </ChartCard>

        {fundingView === "stacked" && <Legend items={FUNDING_SERIES} />}
        {fundingView === "pubpriv" && (
          <Legend items={[
            { key: "public", label: "Public (Gov + UKRI + HEFC)", color: P.teal },
            { key: "private", label: "Private (Business + PNP)", color: P.sienna },
            { key: "he", label: "Higher Education", color: P.yellow },
            { key: "overseas", label: "Overseas", color: P.grey },
          ]} />
        )}
      </div>

      {/* ═══════════ SECTION 2 — INTERNATIONAL COMPARISON ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>International Comparison</h3>
        <p style={SECTION_NOTE}>
          The UK spends 2.64% of GDP on R&D, slightly below the OECD average of 2.7%.
          Among G7 nations, the US (3.59%) and Japan (3.41%) lead, while France (2.23%)
          and Italy (1.39%) spend less. Israel (6.02%) and South Korea (5.21%) are global
          leaders in R&D intensity.
        </p>

        <ChartCard label="R&D spending as % of GDP (most recent year)" yearRange="2022–2023">
          <InternationalChart data={data.international} />
        </ChartCard>
      </div>

      {/* ═══════════ SECTION 3 — REGIONAL ═══════════ */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={SECTION_HEADING}>Regional R&D (2023)</h3>
        <p style={SECTION_NOTE}>
          R&D spending is highly concentrated in the "golden triangle" of London, the South East,
          and the East of England, which together account for {regionData.length > 0 ?
            `£${((regionData.filter(r =>
              ["London", "South East", "East of England"].includes(r.region)
            ).reduce((s, r) => s + r.total, 0)) / 1000).toFixed(1)}bn` : "—"} of
          the UK total.
        </p>

        <ChartCard label="R&D expenditure by region (£m, 2023)" yearRange="">
          <RegionalChart data={regionData} />
        </ChartCard>
      </div>

      {/* ═══════════ SECTION 4 — RESEARCH COST RECOVERY ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>University Research Cost Recovery</h3>
        <p style={SECTION_NOTE}>
          University research is costed using the Transparent Approach to Costing (TRAC).
          Full economic costs include directly incurred costs (research staff, consumables, equipment),
          directly allocated costs (investigators&rsquo; time, technicians), indirect costs (central services,
          libraries, administration), and estates costs (buildings, utilities, maintenance), plus a
          sustainability margin ({TRAC_TOTALS.sustainabilityPct}% of fEC). UKRI research council grants
          fund 80% of fEC; universities must find the remaining 20% from other sources.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Research fEC"
            value={`£${(TRAC_TOTALS.fec / 1000).toFixed(1)}bn`}
            change="Full economic cost 2023-24"
            up={false}
            color={P.navy}
            delay={0.1}
          />
          <MetricCard
            label="Research Income"
            value={`£${(TRAC_TOTALS.income / 1000).toFixed(1)}bn`}
            change={`${TRAC_TOTALS.recovery}% of fEC recovered`}
            up={false}
            color={P.teal}
            delay={0.18}
          />
          <MetricCard
            label="Research Deficit"
            value={`£${(TRAC_TOTALS.deficit / 1000).toFixed(1)}bn`}
            change="Costs exceeding income"
            up={false}
            color={P.red}
            delay={0.26}
          />
          <MetricCard
            label="RC Grant Recovery"
            value="68.1%"
            change="vs 80% fEC rate"
            up={false}
            color={P.sienna}
            delay={0.34}
          />
        </div>

        <ChartCard
          label={
            costView === "income"
              ? "University research income by source (£m, 2023-24)"
              : "Cost recovery by research sponsor (% of fEC, 2023-24)"
          }
          yearRange=""
          views={["income", "recovery"]}
          viewLabels={{ income: "Income Sources", recovery: "Cost Recovery %" }}
          activeView={costView}
          onViewChange={setCostView}
        >
          {costView === "income" && <IncomePieChart />}
          {costView === "recovery" && <CostRecoveryChart />}
        </ChartCard>

        {costView === "income" && (
          <Legend items={INCOME_PIE.map(d => ({ key: d.name, label: `${d.name} — £${d.value >= 1000 ? (d.value / 1000).toFixed(1) + "bn" : d.value + "m"}`, color: d.color }))} />
        )}
        {costView === "recovery" && (
          <Legend items={TRAC_RESEARCH.map(d => ({ key: d.sponsor, label: d.sponsor, color: d.color }))} />
        )}
      </div>

      {/* Source */}
      <div style={{ ...SOURCE_TEXT, marginBottom: 20 }}>
        R&D SPENDING:{" "}
        <a href="https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/researchanddevelopmentexpenditure/datasets/ukgrossdomesticexpenditureonresearchanddevelopment2021designatedasofficialstatistics" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          ONS GERD Official Statistics 2023
        </a>
        {" "}&middot; Tables 3, 5, 6 &middot; Published 15 Aug 2025 &middot; Data: 2018&ndash;2023
        <br />
        INTERNATIONAL:{" "}
        <a href="https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          World Bank / OECD MSTI
        </a>
        {" "}&middot; Most recent year (2022&ndash;2023)
        <br />
        COST RECOVERY:{" "}
        <a href="https://www.officeforstudents.org.uk/publications/annual-trac-2023-24/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          OfS Annual TRAC 2023-24
        </a>
        {" "}&middot; Tables 1 & 2 &middot; Published 10 Jun 2025 &middot; England & Northern Ireland HEIs
      </div>

      <AnalysisBox color={P.sienna} label="Context">
        UK R&D spending: £{(latest.total / 1000).toFixed(1)}bn ({latest.year}), {latestGDP.pctGDP}% of GDP.
        {" "}Business enterprise funds {((latest.business / latest.total) * 100).toFixed(0)}% (£{(latest.business / 1000).toFixed(1)}bn);
        public sources (government + UKRI + HEFC) fund {publicPct}% (£{(publicTotal / 1000).toFixed(1)}bn).
        {" "}UK R&D intensity ({latestGDP.pctGDP}%) is below the OECD average (2.7%), and trails the US (3.59%), Japan (3.41%) and Germany (3.13%).
        {" "}University research runs a £{(TRAC_TOTALS.deficit / 1000).toFixed(1)}bn deficit — full economic costs
        of £{(TRAC_TOTALS.fec / 1000).toFixed(1)}bn vs income of £{(TRAC_TOTALS.income / 1000).toFixed(1)}bn
        ({TRAC_TOTALS.recovery}% cost recovery). Research council grants recover only 68.1% of full economic
        costs despite the 80% fEC funding rate.
      </AnalysisBox>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function toggleStyle(active) {
  return {
    background: active ? "rgba(28,43,69,0.06)" : "transparent",
    border: `1px solid ${P.borderStrong}`,
    color: active ? P.text : P.textLight,
    padding: "2px 8px", fontSize: "9px", fontWeight: 500,
    textTransform: "uppercase", letterSpacing: "0.08em",
    cursor: "pointer", fontFamily: "'DM Mono', monospace",
    borderRadius: 2 };
}

// ─── Shared Components ────────────────────────────────────────────

function ChartCard({ label, yearRange, views, viewLabels, activeView, onViewChange, children }) {
  return (
    <ShareableChart title={label}>
    <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px", marginBottom: 16, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
          {label}{yearRange ? ` \u00b7 ${yearRange}` : ""}
        </span>
        {views && onViewChange && (
          <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
            {views.map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                style={{
                  background: activeView === v ? "rgba(28,43,69,0.06)" : "transparent",
                  border: "none",
                  color: activeView === v ? P.text : P.textLight,
                  padding: "4px 10px", fontSize: "10px", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  transition: "all 0.15s", borderRadius: 2 }}
              >
                {viewLabels[v]}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
    </ShareableChart>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 8, background: item.color, display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────

function FundingStackedChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}bn`}
          label={{ value: "R&D expenditure (£m)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        {FUNDING_SERIES.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="1" fill={s.color} stroke={s.color} fillOpacity={0.85} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PublicPrivateChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}bn`}
          label={{ value: "R&D funding (£m)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="public" name="Public (Gov + UKRI + HEFC)" stackId="1" fill={P.teal} opacity={0.85} />
        <Bar dataKey="private" name="Private (Business + PNP)" stackId="1" fill={P.sienna} opacity={0.85} />
        <Bar dataKey="higherEducation" name="Higher Education" stackId="1" fill={P.yellow} opacity={0.85} />
        <Bar dataKey="overseas" name="Overseas" stackId="1" fill={P.grey} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GDPChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          unit="%" domain={[2.4, 3.2]}
          label={{ value: "R&D spending (% of GDP)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={2.7} stroke={P.grey} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: "OECD 2.7%", position: "right", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
        <Line type="monotone" dataKey="pctGDP" name="R&D as % of GDP" stroke={P.navy} strokeWidth={2.5} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function InternationalChart({ data }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.country === "United Kingdom" ? "UK *" : d.country,
    isUK: d.country === "United Kingdom" }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 26)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false} unit="%"
          label={{ value: "R&D spending (% of GDP)", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <YAxis
          type="category" dataKey="label" width={120}
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="pctGDP"
          name="R&D as % of GDP"
          radius={[0, 3, 3, 0]}
          opacity={0.85}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.isUK ? P.sienna : entry.country === "OECD Average" ? P.navy : P.grey} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RegionalChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 24)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}bn`}
          label={{ value: "R&D expenditure (£m)", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <YAxis
          type="category" dataKey="region" width={130}
          tick={{ fontSize: 8, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="business" name="Business" stackId="1" fill={P.sienna} opacity={0.85} />
        <Bar dataKey="he" name="Higher Education" stackId="1" fill={P.yellow} opacity={0.85} />
        <Bar dataKey="govUkri" name="Government & UKRI" stackId="1" fill={P.teal} opacity={0.85} />
        <Bar dataKey="pnp" name="Private Non-Profit" stackId="1" fill={P.grey} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function IncomePieChart() {
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={INCOME_PIE}
          cx="50%" cy="50%"
          outerRadius={120}
          innerRadius={40}
          dataKey="value"
          label={renderLabel}
          labelLine={false}
          strokeWidth={1}
          stroke="rgba(255,255,255,0.6)"
        >
          {INCOME_PIE.map((d, i) => <Cell key={i} fill={d.color} opacity={0.85} />)}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`£${value >= 1000 ? (value / 1000).toFixed(1) + "bn" : value + "m"}`, name]}
          contentStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace", background: P.bgCard, border: `1px solid ${P.border}` }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CostRecoveryChart() {
  const sorted = [...TRAC_RESEARCH].sort((a, b) => b.recovery - a.recovery);

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, sorted.length * 36)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          unit="%"
          label={{ value: "Cost recovery (% of fEC)", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <YAxis
          type="category" dataKey="sponsor" width={120}
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Cost recovery"]}
          contentStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace", background: P.bgCard, border: `1px solid ${P.border}` }}
        />
        <ReferenceLine x={80} stroke={P.sienna} strokeDasharray="6 4" strokeWidth={1.5}
          label={{ value: "80% fEC rate", position: "top", style: { fontSize: 10, fill: P.sienna, fontFamily: "'DM Mono', monospace" } }}
        />
        <ReferenceLine x={100} stroke={P.textLight} strokeDasharray="3 3" strokeWidth={1}
          label={{ value: "Full cost", position: "top", style: { fontSize: 8, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Bar dataKey="recovery" name="Cost recovery %" radius={[0, 3, 3, 0]} opacity={0.85}>
          {sorted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
