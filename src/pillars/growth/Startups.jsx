import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, SOURCE_TEXT } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { fetchDataset } from "../../hooks/useDataset";

export default function Startups() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoView, setDemoView] = useState("births");
  const sectorChartData = useMemo(() => {
    if (!data?.sectorBreakdown) return [];
    return data.sectorBreakdown.slice(0, 12).map((s) => ({
      sector: s.sector.length > 30 ? s.sector.slice(0, 28) + "..." : s.sector,
      births: s.births,
    }));
  }, [data]);

  useEffect(() => {
    fetchDataset("startups.json")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Startups & VC</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Startups & VC</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const demo = data.demography;
  const latest = demo[demo.length - 1];
  const prev = demo[demo.length - 2];
  const equity = data.equity;
  const latestEquity = equity[equity.length - 1];
  const peakEquity = equity.reduce((a, b) => (b.total > a.total ? b : a));
  const latestSurvival = data.survival[0]; // 2019 cohort has full 5-year data
  const hg = data.highGrowth;
  const latestHG = hg[hg.length - 1];
  const birthChange = prev ? (((latest.births - prev.births) / prev.births) * 100).toFixed(1) : "--";
  const netBirths = latest.births - latest.deaths;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Startups & VC</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          ONS Business Demography {latest.year} &middot; BBB Equity Tracker {latestEquity.year}
        </span>
      </div>

      {/* ═══════════ SECTION 1 — BUSINESS DEMOGRAPHY ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Business Demography</h3>
        <p style={SECTION_NOTE}>
          Business births and deaths measure the creation and closure of VAT/PAYE-registered enterprises.
          A healthy economy needs high birth rates, but also high survival rates among new firms.
          "High-growth" enterprises are those with 10+ employees that grew employment by 20%+ per year
          over three years.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="New Businesses"
            value={fmtK(latest.births)}
            change={`${parseFloat(birthChange) >= 0 ? "+" : ""}${birthChange}% vs ${prev?.year}`}
            up={parseFloat(birthChange) > 0}
            color={P.teal}
            delay={0.1}
          />
          <MetricCard
            label="Net Formation"
            value={fmtK(netBirths)}
            change={`births minus deaths (${latest.year})`}
            up={netBirths > 0}
            color={netBirths > 0 ? P.teal : P.red}
            delay={0.18}
          />
          <MetricCard
            label="Active Enterprises"
            value={fmtM(latest.active)}
            change={`VAT/PAYE registered (${latest.year})`}
            up={false}
            color={P.navy}
            delay={0.26}
          />
          <MetricCard
            label="High-Growth Firms"
            value={fmtK(latestHG.count)}
            change={`20%+ employment growth (${latestHG.year})`}
            up={latestHG.count > hg[0].count}
            color={P.sienna}
            delay={0.34}
          />
        </div>

        <ChartCard
          label={demoView === "births" ? "Business births & deaths" : demoView === "active" ? "Active enterprises" : "High-growth enterprises"}
          yearRange={`${demo[0].year}–${latest.year}`}
          views={["births", "active", "highgrowth"]}
          viewLabels={{ births: "Births/Deaths", active: "Active", highgrowth: "High-Growth" }}
          activeView={demoView}
          onViewChange={setDemoView}
        >
          {demoView === "births" && <BirthDeathChart data={demo} />}
          {demoView === "active" && <ActiveChart data={demo} />}
          {demoView === "highgrowth" && <HighGrowthChart data={hg} />}
        </ChartCard>

        {demoView === "births" && (
          <Legend items={[
            { key: "births", label: "Births", color: P.teal },
            { key: "deaths", label: "Deaths", color: P.red },
          ]} />
        )}
      </div>

      {/* ═══════════ SECTION 2 — SURVIVAL & SECTORS ═══════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Survival & Sector Breakdown</h3>
        <p style={SECTION_NOTE}>
          Five-year survival rates show what fraction of a birth cohort are still active after
          one to five years. The sector breakdown shows which industries produce the most new
          enterprises.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="1-Year Survival"
            value={`${latestSurvival.yr1}%`}
            change={`${latestSurvival.cohort} birth cohort`}
            up={false}
            color={P.navy}
            delay={0.1}
          />
          <MetricCard
            label="3-Year Survival"
            value={`${latestSurvival.yr3}%`}
            change={`${latestSurvival.cohort} birth cohort`}
            up={false}
            color={P.yellow}
            delay={0.18}
          />
          <MetricCard
            label="5-Year Survival"
            value={`${latestSurvival.yr5}%`}
            change={`${latestSurvival.cohort} birth cohort`}
            up={false}
            color={P.red}
            delay={0.26}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard label="Survival by cohort year" yearRange={`${data.survival[data.survival.length - 1].cohort}–${data.survival[0].cohort}`}>
            <SurvivalChart data={data.survival} />
          </ChartCard>
          <ChartCard label={`New businesses by sector (${latest.year})`} yearRange="">
            <SectorChart data={sectorChartData} />
          </ChartCard>
        </div>

        <Legend items={[
          { key: "yr1", label: "1-year", color: P.navy },
          { key: "yr2", label: "2-year", color: P.teal },
          { key: "yr3", label: "3-year", color: P.yellow },
          { key: "yr4", label: "4-year", color: P.sienna },
          { key: "yr5", label: "5-year", color: P.red },
        ]} />
      </div>

      {/* ═══════════ SECTION 3 — EQUITY INVESTMENT ═══════════ */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={SECTION_HEADING}>Equity Investment</h3>
        <p style={SECTION_NOTE}>
          UK equity investment covers venture capital, growth equity and other announced equity deals
          into UK-based SMEs. The UK is the largest VC market in Europe. UK VC represented
          0.68% of GDP over 2022–2024 (BBB SBET 2025).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Equity Investment"
            value={`£${latestEquity.total}bn`}
            change={`${latestEquity.year} (peak: £${peakEquity.total}bn in ${peakEquity.year})`}
            up={false}
            color={P.sienna}
            delay={0.1}
          />
          <MetricCard
            label="Equity Deals"
            value={latestEquity.deals ? fmtK(latestEquity.deals) : "--"}
            change={`announced deals (${latestEquity.year})`}
            up={false}
            color={P.navy}
            delay={0.18}
          />
          <MetricCard
            label="VC as % of GDP"
            value="0.68%"
            change="2022–2024 average (BBB)"
            up={false}
            color={P.teal}
            delay={0.26}
          />
        </div>

        <ChartCard
          label="UK SME equity investment (£bn)"
          yearRange={`${equity[0].year}–${latestEquity.year}`}
        >
          <EquityChart data={equity} />
        </ChartCard>
      </div>

      {/* Source */}
      <div style={{ ...SOURCE_TEXT, marginBottom: 20 }}>
        BUSINESS DEMOGRAPHY:{" "}
        <a href="https://www.ons.gov.uk/businessindustryandtrade/business/activitysizeandlocation/datasets/businessdemographyreferencetable" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          ONS Business Demography, UK 2024
        </a>
        {" "}&middot; Tables 1.1, 1.2, 4.1, 7.2 &middot; Data: {demo[0].year}&ndash;{latest.year}
        <br />
        EQUITY INVESTMENT:{" "}
        <a href="https://www.british-business-bank.co.uk/about-research-and-publications/small-business-equity-tracker-2025" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          British Business Bank Small Business Equity Tracker (2016–2025 editions)
        </a>
        {" "}&middot; Beauhurst data &middot; {equity[0].year}&ndash;{latestEquity.year}
      </div>

      <AnalysisBox color={P.sienna} label="Context">
        UK business births: {fmtK(latest.births)} ({latest.year}), net formation {fmtK(netBirths)}.
        {" "}{fmtM(latest.active)} active enterprises. {fmtK(latestHG.count)} high-growth firms.
        {" "}5-year survival rate: {latestSurvival.yr5}% ({latestSurvival.cohort} cohort).
        {" "}SME equity investment: £{latestEquity.total}bn ({latestEquity.year}), peak £{peakEquity.total}bn ({peakEquity.year}).
        {" "}UK VC = 0.68% of GDP (2022–2024 average).
      </AnalysisBox>
    </div>
  );
}

// ─── Formatting helpers ───────────────────────────────────────────

function fmtK(n) {
  if (n == null) return "--";
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)}m`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtM(n) {
  if (n == null) return "--";
  return `${(n / 1000000).toFixed(2)}m`;
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

function BirthDeathChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          label={{ value: "Enterprises", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="births" name="Births" fill={P.teal} opacity={0.85} />
        <Bar dataKey="deaths" name="Deaths" fill={P.red} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActiveChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${(v / 1000000).toFixed(2)}m`}
          label={{ value: "Active enterprises", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
          domain={["dataMin - 50000", "dataMax + 50000"]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="active" name="Active Enterprises" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HighGrowthChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
          label={{ value: "High-growth firms", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="High-Growth Enterprises" fill={P.sienna} opacity={0.85} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SurvivalChart({ data }) {
  // Flip to show newest cohort last (natural left-to-right reading)
  const sorted = [...data].sort((a, b) => a.cohort - b.cohort);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="cohort" tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false} unit="%"
          domain={[0, 100]}
          label={{ value: "Survival rate (%)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="yr1" name="1-year" fill={P.navy} opacity={0.85} />
        <Bar dataKey="yr2" name="2-year" fill={P.teal} opacity={0.85} />
        <Bar dataKey="yr3" name="3-year" fill={P.yellow} opacity={0.85} />
        <Bar dataKey="yr4" name="4-year" fill={P.sienna} opacity={0.85} />
        <Bar dataKey="yr5" name="5-year" fill={P.red} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SectorChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          label={{ value: "New businesses (count)", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <YAxis
          type="category" dataKey="sector" width={150}
          tick={{ fontSize: 8, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="births" name="Births" fill={P.teal} opacity={0.85} radius={[0, 3, 3, 0]} />
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
          label={{ value: "Equity investment (£bn)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total" name="Equity Investment (£bn)" fill={P.sienna} opacity={0.85} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

