import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";

const sectionHeading = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "20px",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};

const sectionNote = {
  fontSize: "13px",
  lineHeight: 1.7,
  color: P.textMuted,
  fontFamily: "'Playfair Display', serif",
  margin: "0 0 18px",
  maxWidth: 720,
};

const toggleBtn = (active) => ({
  padding: "4px 12px",
  border: `1px solid ${active ? P.teal : P.border}`,
  borderRadius: 4,
  background: active ? P.teal : "transparent",
  color: active ? "#fff" : P.textMuted,
  fontSize: "11px",
  fontFamily: "'DM Mono', monospace",
  cursor: "pointer",
  transition: "all 0.15s",
});

const TS_LINES = [
  { key: "USA", label: "United States", color: "#4A7A58" },
  { key: "DEU", label: "Germany", color: P.sienna },
  { key: "FRA", label: "France", color: P.yellow },
  { key: "GBR", label: "United Kingdom", color: P.teal },
  { key: "OECD", label: "OECD Average", color: P.grey },
  { key: "JPN", label: "Japan", color: P.navy },
  { key: "KOR", label: "South Korea", color: "#6B8EC4" },
  { key: "POL", label: "Poland", color: P.red },
];

export default function Productivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ukView, setUkView] = useState("level");
  const [intlView, setIntlView] = useState("bar");

  useEffect(() => {
    fetch("/data/productivity.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Merge index + level into one series from 2000
  const ukSeries = useMemo(() => {
    if (!data) return [];
    const idxMap = Object.fromEntries(data.indexSeries.map((r) => [r.year, r.index]));
    const lvlMap = Object.fromEntries(data.levelSeries.map((r) => [r.year, r.gbpPerHour]));
    const years = [...new Set([...Object.keys(idxMap), ...Object.keys(lvlMap)])]
      .map(Number)
      .filter((y) => y >= 2000)
      .sort();
    return years.map((y) => ({ year: y, index: idxMap[y], gbpPerHour: lvlMap[y] }));
  }, [data]);

  // International bar chart data — exclude Ireland (outlier due to MNC booking) but note it
  const intlBar = useMemo(() => {
    if (!data?.international) return [];
    return data.international
      .filter((r) => r.countryCode !== "IRL") // exclude statistical outlier
      .map((r) => ({
        ...r,
        fill: r.countryCode === "GBR" ? P.teal : r.countryCode === "OECD" ? P.sienna : P.grey,
      }));
  }, [data]);

  // Time series from 2000 for international convergence chart
  const tsSeries = useMemo(() => {
    if (!data?.timeSeries) return [];
    return data.timeSeries.filter((r) => r.year >= 2000);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Productivity</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Productivity</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestLevel = data.levelSeries[data.levelSeries.length - 1];
  const latestIndex = data.indexSeries[data.indexSeries.length - 1];
  const ukIntl = data.international.find((r) => r.countryCode === "GBR");
  const oecdAvg = data.international.find((r) => r.countryCode === "OECD");
  const ukRank = data.international.findIndex((r) => r.countryCode === "GBR") + 1;
  const totalCountries = data.international.filter((r) => r.countryCode !== "OECD").length;

  // Growth since 2008 (pre-financial crisis)
  const level2008 = data.levelSeries.find((r) => r.year === 2008);
  const growth0824 = level2008
    ? (((latestLevel.gbpPerHour - level2008.gbpPerHour) / level2008.gbpPerHour) * 100).toFixed(1)
    : null;

  // OECD time series growth comparison
  const ukTs2008 = data.timeSeries.find((r) => r.year === 2008);
  const ukTs2023 = data.timeSeries.find((r) => r.year === 2023);
  const usGrowth = ukTs2008 && ukTs2023
    ? (((ukTs2023.USA - ukTs2008.USA) / ukTs2008.USA) * 100).toFixed(0)
    : null;
  const deuGrowth = ukTs2008 && ukTs2023
    ? (((ukTs2023.DEU - ukTs2008.DEU) / ukTs2008.DEU) * 100).toFixed(0)
    : null;
  const gbrGrowthPPP = ukTs2008 && ukTs2023
    ? (((ukTs2023.GBR - ukTs2008.GBR) / ukTs2008.GBR) * 100).toFixed(0)
    : null;
  const polGrowth = ukTs2008?.POL && ukTs2023?.POL
    ? (((ukTs2023.POL - ukTs2008.POL) / ukTs2008.POL) * 100).toFixed(0)
    : null;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Productivity
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Output per hour worked — the single most important determinant of living standards.
        Measures how efficiently the economy converts labour into goods and services.
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Output per hour" value={`£${latestLevel.gbpPerHour}`} sub={`${latestLevel.year}`} />
        <MetricCard label="Index (2023 = 100)" value={latestIndex.index.toFixed(1)} sub={`${latestIndex.year}`} />
        <MetricCard label="OECD rank" value={`${ukRank}/${totalCountries}`} sub={`$${ukIntl?.usdPPP} PPP/hr`} />
        {growth0824 && <MetricCard label="Growth since 2008" value={`${growth0824}%`} sub="£/hour, nominal" />}
      </div>

      {/* Section 1: UK Trend */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>UK Output per Hour</h3>
        <p style={sectionNote}>
          Annual output per hour worked for the whole UK economy.
          {ukView === "level"
            ? " Measured in current-price £ per hour."
            : " Index with 2023 = 100, showing real growth trajectory."}
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(ukView === "level")} onClick={() => setUkView("level")}>£ per hour</button>
          <button style={toggleBtn(ukView === "index")} onClick={() => setUkView("index")}>Index (2023=100)</button>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={ukSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
            <YAxis
              tick={{ fontSize: 11, fill: P.textMuted }}
              tickFormatter={(v) => ukView === "level" ? `£${v}` : v}
              label={{ value: ukView === "level" ? "£/hour" : "index", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => ukView === "level" ? `£${v.toFixed(2)}/hr` : v.toFixed(1)} />} />
            {ukView === "level" ? (
              <Line type="monotone" dataKey="gbpPerHour" stroke={P.teal} strokeWidth={2} dot={false} name="£/hour" />
            ) : (
              <>
                <Line type="monotone" dataKey="index" stroke={P.teal} strokeWidth={2} dot={false} name="Index" />
                <ReferenceLine y={100} stroke={P.textLight} strokeDasharray="4 4" label={{ value: "2023 = 100", fontSize: 10, fill: P.textLight }} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Section 2: International Comparison */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>International Comparison</h3>
        <p style={sectionNote}>
          GDP per hour worked in USD at current purchasing power parities (PPPs), 2023.
          Covers {totalCountries} OECD countries. Ireland excluded from chart (${data.international.find((r) => r.countryCode === "IRL")?.usdPPP}/hr
          — inflated by multinational profit-shifting).
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(intlView === "bar")} onClick={() => setIntlView("bar")}>Country ranking</button>
          <button style={toggleBtn(intlView === "ts")} onClick={() => setIntlView("ts")}>Growth trajectories</button>
        </div>

        {intlView === "bar" ? (
          <ResponsiveContainer width="100%" height={Math.max(500, intlBar.length * 26)}>
            <BarChart data={intlBar} layout="vertical" margin={{ left: 110, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted }} width={105} />
              <Tooltip content={<CustomTooltip formatter={(v) => `$${v.toFixed(1)}/hr PPP`} />} />
              <Bar dataKey="usdPPP" name="GDP/hour (USD PPP)" isAnimationActive={false}>
                {intlBar.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
              <ReferenceLine
                x={oecdAvg?.usdPPP}
                stroke={P.sienna}
                strokeDasharray="4 4"
                label={{ value: `OECD avg $${oecdAvg?.usdPPP}`, fontSize: 10, fill: P.sienna, position: "top" }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={tsSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
                <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `$${v}`} label={{ value: "$/hour PPP", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
                <Tooltip content={<CustomTooltip formatter={(v) => `$${v?.toFixed(1)}/hr`} />} />
                {TS_LINES.map(({ key, label, color }) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={key === "GBR" ? 3 : 1.5}
                    dot={false}
                    name={label}
                    connectNulls
                    strokeDasharray={key === "OECD" ? "4 4" : undefined}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
              {TS_LINES.map(({ key, label, color }) => (
                <span key={key} style={{ fontSize: 11, color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
                  <span style={{ display: "inline-block", width: 12, height: 3, background: color, marginRight: 4, verticalAlign: "middle" }} />
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Section 3: Sector breakdown */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Sector Breakdown</h3>
        <p style={sectionNote}>
          Output per hour worked by SIC 2007 industry section, {latestLevel.year}, current prices.
          Wide dispersion from capital-intensive sectors (mining, utilities) to labour-intensive services.
        </p>
        <ResponsiveContainer width="100%" height={Math.max(400, data.sectorBreakdown.length * 30)}>
          <BarChart
            data={data.sectorBreakdown.map((s) => ({
              ...s,
              sector: s.sector.length > 40 ? s.sector.slice(0, 38) + "..." : s.sector,
            }))}
            layout="vertical"
            margin={{ left: 240, right: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `£${v}`} />
            <YAxis type="category" dataKey="sector" tick={{ fontSize: 11, fill: P.textMuted }} width={235} />
            <Tooltip content={<CustomTooltip formatter={(v) => `£${v.toFixed(2)}/hr`} />} />
            <Bar dataKey="gbpPerHour" fill={P.teal} name="£ per hour" isAnimationActive={false} />
            <ReferenceLine
              x={latestLevel.gbpPerHour}
              stroke={P.sienna}
              strokeDasharray="4 4"
              label={{ value: `Whole economy £${latestLevel.gbpPerHour}`, fontSize: 10, fill: P.sienna, position: "top" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Context */}
      <AnalysisBox>
        UK output per hour was £{latestLevel.gbpPerHour} in {latestLevel.year} (${ukIntl?.usdPPP} in PPP terms),
        ranking {ukRank}th of {totalCountries} OECD countries. The UK is{" "}
        {((ukIntl?.usdPPP / oecdAvg?.usdPPP - 1) * 100).toFixed(0)}% above the OECD average
        but {((1 - ukIntl?.usdPPP / data.international.find((r) => r.countryCode === "USA")?.usdPPP) * 100).toFixed(0)}% below the US
        and {((1 - ukIntl?.usdPPP / data.international.find((r) => r.countryCode === "DEU")?.usdPPP) * 100).toFixed(0)}% below Germany.
        {gbrGrowthPPP && usGrowth && ` Since 2008, UK productivity grew ${gbrGrowthPPP}% in PPP terms vs ${usGrowth}% (US) and ${deuGrowth}% (Germany).`}
        {polGrowth && ` Poland grew ${polGrowth}% over the same period, narrowing the gap from 2.1:1 to 1.5:1.`}
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://www.ons.gov.uk/economy/economicoutputandproductivity/productivitymeasures/datasets/outputperhourworkeduk" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          ONS Output per hour worked, UK (Feb 2026)
        </a>
        {" · "}
        <a href="https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_PDB%40DF_PDB_LV&df[ag]=OECD.SDD.TPS&df[vs]=1.0" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          OECD Productivity Database — GDP per hour worked, USD current PPPs (2023)
        </a>
      </div>
    </div>
  );
}
