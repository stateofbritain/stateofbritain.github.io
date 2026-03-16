import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_TITLE, CHART_SUBTITLE,
  AXIS_TICK, yAxisLabel, GRID_PROPS, toggleBtn,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { fetchDataset } from "../../hooks/useDataset";

const TS_LINES = [
  { key: "KOR", label: "South Korea", color: "#6B8EC4" },
  { key: "JPN", label: "Japan", color: P.navy },
  { key: "FRA", label: "France", color: P.yellow },
  { key: "USA", label: "United States", color: "#4A7A58" },
  { key: "DEU", label: "Germany", color: P.sienna },
  { key: "OECD", label: "OECD Average", color: P.grey },
  { key: "GBR", label: "United Kingdom", color: P.teal },
  { key: "POL", label: "Poland", color: P.red },
];

const ASSET_COLORS = {
  intangibles: P.teal,
  buildings: P.sienna,
  plantMachinery: P.navy,
  transport: "#6B8EC4",
  other: P.grey,
};

export default function Investment() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ukView, setUkView] = useState("gfcf");
  const [priceBase, setPriceBase] = useState("cp");
  const [intlView, setIntlView] = useState("bar");

  useEffect(() => {
    fetchDataset("investment.json")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const ukTrend = useMemo(() => {
    if (!data?.ukTrend) return [];
    return data.ukTrend.filter((r) => r.year >= 1997);
  }, [data]);

  const assetData = useMemo(() => {
    if (!data?.assetBreakdown) return [];
    return data.assetBreakdown.filter((r) => r.year >= 1997);
  }, [data]);

  const intlBar = useMemo(() => {
    if (!data?.international) return [];
    return data.international.map((r) => ({
      ...r,
      fill: r.countryCode === "GBR" ? P.teal : r.countryCode === "OECD" ? P.sienna : P.grey,
    }));
  }, [data]);

  const tsSeries = useMemo(() => {
    if (!data?.timeSeries) return [];
    return data.timeSeries;
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Investment & Capital</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Investment & Capital</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latest = ukTrend[ukTrend.length - 1];
  const prev = ukTrend[ukTrend.length - 2];
  const biGrowth = latest?.biCP && prev?.biCP
    ? (((latest.biCP - prev.biCP) / prev.biCP) * 100).toFixed(1)
    : null;
  const ukOECD = data.international.find((r) => r.countryCode === "GBR");
  const oecdAvg = data.international.find((r) => r.countryCode === "OECD");
  const ukRank = data.international.filter((r) => r.countryCode !== "OECD").sort((a, b) => b.pctGDP - a.pctGDP).findIndex((r) => r.countryCode === "GBR") + 1;
  const totalCountries = data.international.filter((r) => r.countryCode !== "OECD").length;

  // Latest asset breakdown
  const latestAsset = assetData[assetData.length - 1];

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Investment & Capital
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Gross fixed capital formation (GFCF) — spending on buildings, machinery, transport,
        and intellectual property that expands the economy's productive capacity.
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard
          label="Total GFCF"
          value={`£${(latest.gfcfCP / 1000).toFixed(0)}bn`}
          sub={`${latest.year}, current prices SA`}
        />
        <MetricCard
          label="Business investment"
          value={`£${(latest.biCP / 1000).toFixed(0)}bn`}
          sub={`${latest.biSharePct}% of GFCF${biGrowth ? ` · ${biGrowth > 0 ? "+" : ""}${biGrowth}% YoY` : ""}`}
        />
        <MetricCard
          label="GFCF / GDP"
          value={`${ukOECD?.pctGDP}%`}
          sub={`${ukOECD?.year} · OECD avg ${oecdAvg?.pctGDP}%`}
        />
        <MetricCard
          label="OECD rank"
          value={`${ukRank}/${totalCountries}`}
          sub="GFCF as % GDP"
        />
      </div>

      {/* Section 1: UK Investment Trend */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>UK Investment Trend</h3>
        <p style={SECTION_NOTE}>
          Total GFCF and business investment since 1997.
          {ukView === "asset"
            ? " Current prices, seasonally adjusted. Asset breakdown by type."
            : priceBase === "cp"
              ? " Current prices, seasonally adjusted."
              : " Chained volume measure (2023 prices), seasonally adjusted."}
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(ukView === "gfcf")} onClick={() => setUkView("gfcf")}>GFCF + BI</button>
          <button style={toggleBtn(ukView === "asset")} onClick={() => setUkView("asset")}>By asset type</button>
          {ukView === "gfcf" && (
            <>
              <span style={{ width: 12 }} />
              <button style={toggleBtn(priceBase === "cp")} onClick={() => setPriceBase("cp")}>Current prices</button>
              <button style={toggleBtn(priceBase === "cvm")} onClick={() => setPriceBase("cvm")}>Real (CVM)</button>
            </>
          )}
        </div>

        {ukView === "gfcf" ? (
          <ShareableChart title="UK Investment Trend (GFCF)">
          <div>
          <div style={{ marginBottom: 10 }}>
            <div style={CHART_TITLE}>UK Investment Trend</div>
            <div style={CHART_SUBTITLE}>Gross fixed capital formation, real terms</div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={ukTrend}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis
                tick={AXIS_TICK}
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}bn`}
                label={yAxisLabel("Investment (£bn)")}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={(v) => `£${(v / 1000).toFixed(1)}bn`}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey={priceBase === "cp" ? "gfcfCP" : "gfcfCVM"}
                stroke={P.sienna}
                strokeWidth={2}
                dot={false}
                name="Total GFCF"
              />
              <Line
                type="monotone"
                dataKey={priceBase === "cp" ? "biCP" : "biCVM"}
                stroke={P.teal}
                strokeWidth={2}
                dot={false}
                name="Business Investment"
                connectNulls
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
          </ResponsiveContainer>
          </div>
          </ShareableChart>
        ) : (
          <ShareableChart title="UK Investment by Asset Type">
          <div>
          <div style={{ marginBottom: 10 }}>
            <div style={CHART_TITLE}>Investment by Asset Type</div>
            <div style={CHART_SUBTITLE}>GFCF breakdown by category, UK</div>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={assetData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis
                tick={AXIS_TICK}
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}bn`}
                label={yAxisLabel("Investment (£bn)")}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={(v) => `£${(v / 1000).toFixed(1)}bn`}
                  />
                }
              />
              <Area type="monotone" dataKey="intangibles" stackId="a" fill={ASSET_COLORS.intangibles} stroke={ASSET_COLORS.intangibles} name="Intangibles (IP, software, R&D)" />
              <Area type="monotone" dataKey="buildings" stackId="a" fill={ASSET_COLORS.buildings} stroke={ASSET_COLORS.buildings} name="Buildings & structures" />
              <Area type="monotone" dataKey="plantMachinery" stackId="a" fill={ASSET_COLORS.plantMachinery} stroke={ASSET_COLORS.plantMachinery} name="Plant & machinery" />
              <Area type="monotone" dataKey="transport" stackId="a" fill={ASSET_COLORS.transport} stroke={ASSET_COLORS.transport} name="Transport equipment" />
              <Area type="monotone" dataKey="other" stackId="a" fill={ASSET_COLORS.other} stroke={ASSET_COLORS.other} name="Other (dwellings, transfers)" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
          </ShareableChart>
        )}
      </section>

      {/* Section 2: International GFCF/GDP */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>International Comparison — GFCF as % of GDP</h3>
        <p style={SECTION_NOTE}>
          Total gross fixed capital formation as a share of GDP, {ukOECD?.year}.
          Covers {totalCountries} OECD countries.
          The UK ranks {ukRank}th at {ukOECD?.pctGDP}%, compared to an OECD average of {oecdAvg?.pctGDP}%.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(intlView === "bar")} onClick={() => setIntlView("bar")}>Country ranking</button>
          <button style={toggleBtn(intlView === "ts")} onClick={() => setIntlView("ts")}>Trajectories</button>
        </div>

        {intlView === "bar" ? (
          <ShareableChart title="International GFCF as % of GDP">
          <div>
          <div style={{ marginBottom: 10 }}>
            <div style={CHART_TITLE}>International GFCF Comparison</div>
            <div style={CHART_SUBTITLE}>Gross fixed capital formation as % of GDP</div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(400, intlBar.length * 26)}>
            <BarChart data={intlBar} layout="vertical" margin={{ left: 110, right: 30 }}>
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} label={{ value: "% of GDP", position: "insideBottomRight", style: { textAnchor: "middle", fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <YAxis type="category" dataKey="country" tick={AXIS_TICK} width={105} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
              <Bar dataKey="pctGDP" name="GFCF / GDP" isAnimationActive={false}>
                {intlBar.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
              <ReferenceLine
                x={oecdAvg?.pctGDP}
                stroke={P.sienna}
                strokeDasharray="4 4"
                label={{ value: `OECD ${oecdAvg?.pctGDP}%`, fontSize: 11, fill: P.sienna, position: "top" }}
              />
            </BarChart>
          </ResponsiveContainer>
          </div>
          </ShareableChart>
        ) : (
          <ShareableChart title="Investment Trajectories (% GDP)">
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Investment Trajectories</div>
              <div style={CHART_SUBTITLE}>GFCF as % of GDP over time</div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={tsSeries}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis
                  domain={[14, 34]}
                  tick={AXIS_TICK}
                  tickFormatter={(v) => `${v}%`}
                  label={yAxisLabel("% of GDP")}
                />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}%`} />} />
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
          </div>
          </ShareableChart>
        )}
      </section>

      {/* Context */}
      <AnalysisBox>
        UK total GFCF was £{(latest.gfcfCP / 1000).toFixed(0)}bn in {latest.year},
        of which £{(latest.biCP / 1000).toFixed(0)}bn ({latest.biSharePct}%) was business investment
        {latest.govCP ? ` and £${(latest.govCP / 1000).toFixed(0)}bn was government capital spending` : ""}.
        {latestAsset && ` By asset type, intangibles (IP, software, R&D) accounted for £${(latestAsset.intangibles / 1000).toFixed(0)}bn (${((latestAsset.intangibles / latest.gfcfCP) * 100).toFixed(0)}% of GFCF), surpassing physical plant and machinery (£${(latestAsset.plantMachinery / 1000).toFixed(0)}bn).`}
        {" "}At {ukOECD?.pctGDP}% of GDP, the UK's GFCF ranks {ukRank}th of {totalCountries} OECD
        countries — {(oecdAvg?.pctGDP - ukOECD?.pctGDP).toFixed(1)} percentage points below
        the OECD average of {oecdAvg?.pctGDP}%.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/businessinvestment" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          ONS Business Investment (Feb 2026)
        </a>
        {" · "}
        <a href="https://data-explorer.oecd.org/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          OECD National Accounts — GFCF as % of GDP (2023)
        </a>
      </div>
    </div>
  );
}
