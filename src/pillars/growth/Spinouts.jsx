import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";

// ─── Curated data from RAEng / Beauhurst "Spotlight on Spinouts 2025" ────
// Source: https://raeng.org.uk/policy-and-resources/research-and-innovation/accelerating-enterprise/
// Published March 2025. All figures from Beauhurst data as reported in the RAEng report.

const EQUITY = [
  { year: 2015, amount: 879, deals: 294 },
  { year: 2016, amount: 990, deals: 301 },
  { year: 2017, amount: 1220, deals: 368 },
  { year: 2018, amount: 1540, deals: 363 },
  { year: 2019, amount: 1110, deals: 390 },
  { year: 2020, amount: 1580, deals: 424 },
  { year: 2021, amount: 2750, deals: 434 },
  { year: 2022, amount: 2390, deals: 428 },
  { year: 2023, amount: 1890, deals: 427 },
  { year: 2024, amount: 2600, deals: 359 },
];

const IUK_GRANTS = [
  { year: 2015, amount: 41.8, grants: 233 },
  { year: 2016, amount: 24.6, grants: 134 },
  { year: 2017, amount: 61.7, grants: 279 },
  { year: 2018, amount: 66.5, grants: 245 },
  { year: 2019, amount: 93.6, grants: 263 },
  { year: 2020, amount: 104, grants: 424 },
  { year: 2021, amount: 81.3, grants: 493 },
  { year: 2022, amount: 108, grants: 284 },
  { year: 2023, amount: 150, grants: 332 },
  { year: 2024, amount: 83.3, grants: 243 },
];

const TOP_UNIVERSITIES = [
  { name: "Oxford", count: 225 },
  { name: "Cambridge", count: 175 },
  { name: "Imperial", count: 132 },
  { name: "Manchester", count: 114 },
  { name: "UCL", count: 99 },
  { name: "Bristol", count: 81 },
  { name: "RCA", count: 72 },
  { name: "Edinburgh", count: 71 },
  { name: "Swansea", count: 58 },
  { name: "Queen's Belfast", count: 57 },
  { name: "Sheffield", count: 52 },
  { name: "Leeds", count: 47 },
  { name: "Falmouth", count: 46 },
  { name: "Warwick", count: 46 },
  { name: "Newcastle", count: 45 },
  { name: "Strathclyde", count: 44 },
  { name: "Nottingham", count: 43 },
  { name: "Southampton", count: 43 },
  { name: "Glasgow", count: 40 },
  { name: "Queen Mary", count: 35 },
];

const TOP_SECTORS = [
  { sector: "Pharmaceuticals", count: 399 },
  { sector: "Data & Analytics", count: 282 },
  { sector: "Electronics Hardware", count: 269 },
  { sector: "Research Tools & Reagents", count: 268 },
  { sector: "Clinical Research", count: 240 },
  { sector: "Medical Devices", count: 240 },
  { sector: "Clinical Diagnostics", count: 219 },
  { sector: "Biotechnology", count: 189 },
  { sector: "Materials Technology", count: 156 },
  { sector: "Manufacturing", count: 123 },
  { sector: "Sensors", count: 118 },
  { sector: "Parts & Components", count: 77 },
];

const EMERGING_TECH = [
  { sector: "AI", count: 214 },
  { sector: "SaaS", count: 180 },
  { sector: "CleanTech", count: 169 },
  { sector: "Precision Medicine", count: 121 },
  { sector: "Genomics", count: 115 },
  { sector: "Nanotechnology", count: 81 },
  { sector: "eHealth", count: 62 },
  { sector: "Digital Security", count: 46 },
  { sector: "Wearables", count: 42 },
  { sector: "Regen. Medicine", count: 41 },
  { sector: "IoT", count: 39 },
  { sector: "Synthetic Biology", count: 30 },
  { sector: "Quantum", count: 24 },
  { sector: "Robotics", count: 24 },
];

const TOP_INVESTORS = [
  { name: "Parkwalk Advisors", deals: 325, value: 1840 },
  { name: "Scottish Enterprise", deals: 320, value: null },
  { name: "Mercia Ventures", deals: 172, value: null },
  { name: "Cambridge Enterprise", deals: 132, value: null },
  { name: "Oxford Science Enterprises", deals: 127, value: 1830 },
  { name: "Future Planet Capital", deals: 120, value: null },
  { name: "IP Group", deals: 105, value: 1420 },
  { name: "SyndicateRoom", deals: 91, value: null },
  { name: "British Business Bank", deals: 87, value: 1150 },
  { name: "Cambridge Angels", deals: 80, value: null },
];

const sectionHeading = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "20px",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};

const sectionNote = {
  fontSize: "14px",
  lineHeight: 1.7,
  color: P.textMuted,
  fontFamily: "'Playfair Display', serif",
  margin: "0 0 18px",
  maxWidth: 720,
};

export default function Spinouts() {
  const [investView, setInvestView] = useState("equity");
  const [sectorView, setSectorView] = useState("traditional");

  const latestEquity = EQUITY[EQUITY.length - 1];
  const peakEquity = EQUITY.reduce((a, b) => (b.amount > a.amount ? b : a));
  const totalEquity = EQUITY.reduce((s, e) => s + e.amount, 0);
  const totalDeals = EQUITY.reduce((s, e) => s + e.deals, 0);
  const latestIUK = IUK_GRANTS[IUK_GRANTS.length - 1];
  const totalIUK = IUK_GRANTS.reduce((s, g) => s + g.amount, 0);

  const sectorData = useMemo(() => {
    return sectorView === "traditional" ? TOP_SECTORS : EMERGING_TECH;
  }, [sectorView]);

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>University Spinouts</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          RAEng / Beauhurst &middot; Spotlight on Spinouts 2025
        </span>
      </div>

      {/* ═══════════ SECTION 1 — OVERVIEW ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={sectionHeading}>Population & Pipeline</h3>
        <p style={sectionNote}>
          University spinouts are companies formed to commercialise research from UK universities.
          Beauhurst tracks 2,064 spinouts created since 2011, of which 1,337 are active
          (excluding "zombie" companies with no signs of activity). The Golden Triangle
          (Oxford, Cambridge, London) accounts for 27.7% of all spinouts.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Total Spinouts"
            value="2,064"
            change="tracked since 2011"
            up={false}
            color={P.navy}
            delay={0.1}
          />
          <MetricCard
            label="Active Spinouts"
            value="1,337"
            change="excluding zombie companies"
            up={false}
            color={P.teal}
            delay={0.18}
          />
          <MetricCard
            label="Avg. Uni Stake"
            value="16.1%"
            change="10-year low (was 21.5% in 2023)"
            up={false}
            color={P.sienna}
            delay={0.26}
          />
          <MetricCard
            label="Exits (2015-24)"
            value="226"
            change="200 acquisitions + 26 IPOs"
            up={false}
            color={P.yellow}
            delay={0.34}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Seed Stage"
            value="55%"
            change="736 companies"
            up={false}
            color={P.teal}
            delay={0.42}
          />
          <MetricCard
            label="Venture Stage"
            value="30%"
            change="402 companies"
            up={false}
            color={P.navy}
            delay={0.5}
          />
          <MetricCard
            label="Growth/Established"
            value="15%"
            change="125 growth + 74 established"
            up={false}
            color={P.sienna}
            delay={0.58}
          />
          <MetricCard
            label="Failure Rate"
            value="21.4%"
            change="441 no longer operational, avg age at death 7.75 yrs"
            up={true}
            color={P.red}
            delay={0.66}
          />
        </div>

        <ChartCard label="Spinouts by university (top 20)" yearRange="since 2011">
          <UniChart data={TOP_UNIVERSITIES} />
        </ChartCard>
      </div>

      {/* ═══════════ SECTION 2 — INVESTMENT ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={sectionHeading}>Investment into Spinouts</h3>
        <p style={sectionNote}>
          University spinouts raised £17.0bn across 3,788 equity deals between 2015 and 2024.
          Innovate UK awarded £814m in grants to spinouts over the same period. Parkwalk Advisors
          is the most active investor by deal count (325 deals, £1.84bn), while Oxford Science
          Enterprises leads by value (£1.83bn across 127 deals).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Equity Investment"
            value={`£${(latestEquity.amount / 1000).toFixed(1)}bn`}
            change={`${latestEquity.year} (peak: £${(peakEquity.amount / 1000).toFixed(1)}bn in ${peakEquity.year})`}
            up={false}
            color={P.sienna}
            delay={0.1}
          />
          <MetricCard
            label="Total Raised (10yr)"
            value={`£${(totalEquity / 1000).toFixed(1)}bn`}
            change={`${fmtK(totalDeals)} deals (2015-2024)`}
            up={false}
            color={P.navy}
            delay={0.18}
          />
          <MetricCard
            label="IUK Grants"
            value={`£${latestIUK.amount}m`}
            change={`${latestIUK.grants} grants (${latestIUK.year})`}
            up={false}
            color={P.teal}
            delay={0.26}
          />
          <MetricCard
            label="IUK Total (10yr)"
            value={`£${(totalIUK / 1).toFixed(0)}m`}
            change="2,888 grants (2015-2024)"
            up={false}
            color={P.yellow}
            delay={0.34}
          />
        </div>

        <ChartCard
          label={investView === "equity" ? "Equity investment into spinouts (£m)" : "Innovate UK grants to spinouts (£m)"}
          yearRange="2015–2024"
          views={["equity", "iuk"]}
          viewLabels={{ equity: "Equity", iuk: "IUK Grants" }}
          activeView={investView}
          onViewChange={setInvestView}
        >
          {investView === "equity" && <EquityChart data={EQUITY} />}
          {investView === "iuk" && <IUKChart data={IUK_GRANTS} />}
        </ChartCard>

        <ChartCard label="Top investors into university spinouts (by deals)" yearRange="2015–2024">
          <InvestorChart data={TOP_INVESTORS} />
        </ChartCard>
      </div>

      {/* ═══════════ SECTION 3 — SECTORS ═══════════ */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={sectionHeading}>Sectors & Emerging Technologies</h3>
        <p style={sectionNote}>
          Life sciences and deep tech dominate the spinout landscape. Pharmaceuticals is the
          largest sector (399 spinouts), followed by data & analytics (282) and electronics
          hardware (269). Among emerging technology tags, AI leads with 214 spinouts, followed
          by SaaS (180) and CleanTech (169).
        </p>

        <ChartCard
          label={sectorView === "traditional" ? "Top sectors by spinout count" : "Emerging technology tags"}
          yearRange="since 2011"
          views={["traditional", "emerging"]}
          viewLabels={{ traditional: "Sectors", emerging: "Emerging Tech" }}
          activeView={sectorView}
          onViewChange={setSectorView}
        >
          <SectorChart data={sectorData} />
        </ChartCard>
      </div>

      {/* ═══════════ REGIONAL ═══════════ */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={sectionHeading}>Regional Distribution</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="England" value="1,635" change="79.2%" up={false} color={P.navy} delay={0.1} />
          <MetricCard label="Scotland" value="243" change="11.8%" up={false} color={P.teal} delay={0.18} />
          <MetricCard label="Wales" value="105" change="5.1%" up={false} color={P.red} delay={0.26} />
          <MetricCard label="Northern Ireland" value="81" change="3.9%" up={false} color={P.yellow} delay={0.34} />
        </div>
        <p style={sectionNote}>
          The Golden Triangle (Oxford, Cambridge, London) produces 571 spinouts — 27.7% of the total
          population — with Oxford leading at 225. All-male founding teams account for 75.5% of spinouts;
          all-female founding teams account for 7.4%.
        </p>
      </div>

      {/* Source */}
      <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 20 }}>
        SOURCE:{" "}
        <a href="https://raeng.org.uk/policy-and-resources/research-and-innovation/accelerating-enterprise/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          RAEng / Beauhurst &mdash; Spotlight on Spinouts 2025
        </a>
        {" "}&middot; Published March 2025 &middot; Data: Beauhurst tracking of 2,064 spinouts since 2011
      </div>

      <AnalysisBox color={P.sienna} label="Context">
        2,064 university spinouts tracked since 2011; 1,337 active (excl. zombies).
        {" "}£{(totalEquity / 1000).toFixed(1)}bn raised across {fmtK(totalDeals)} equity deals (2015-2024).
        {" "}£{(totalIUK).toFixed(0)}m in Innovate UK grants (2,888 awards).
        {" "}Oxford leads with 225 spinouts, followed by Cambridge (175) and Imperial (132).
        {" "}Average university equity stake 16.1% in 2024 (10-year low).
        {" "}226 exits: 200 acquisitions + 26 IPOs.
        {" "}21.4% failure rate; average age at death 7.75 years.
      </AnalysisBox>
    </div>
  );
}

// ─── Formatting helpers ───────────────────────────────────────────

function fmtK(n) {
  if (n == null) return "--";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
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
                  transition: "all 0.15s", borderRadius: 2,
                }}
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

// ─── Charts ───────────────────────────────────────────────────────

function UniChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          label={{ value: "Spinouts (count)", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <YAxis
          type="category" dataKey="name" width={110}
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Spinouts" fill={P.navy} opacity={0.85} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EquityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          label={{ value: "Equity investment (£m)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="amount" name="Equity Investment (£m)" fill={P.sienna} opacity={0.85} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function IUKChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          label={{ value: "IUK grants (£m)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="amount" name="IUK Grants (£m)" fill={P.teal} opacity={0.85} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function InvestorChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          label={{ value: "Investment deals (count)", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <YAxis
          type="category" dataKey="name" width={150}
          tick={{ fontSize: 8, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="deals" name="Deals" fill={P.yellow} opacity={0.85} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SectorChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 22)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          label={{ value: "Spinouts (count)", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <YAxis
          type="category" dataKey="sector" width={150}
          tick={{ fontSize: 8, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Spinouts" fill={P.teal} opacity={0.85} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
