import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  CHART_CARD, CHART_TITLE, CHART_SUBTITLE, SOURCE_TEXT,
  AXIS_TICK_MONO, yAxisLabel,
} from "../../theme/chartStyles";
import { fetchHousePrices, toAnnual } from "../../api/landRegistry";
import useDataset from "../../hooks/useDataset";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";

// EHS Annex Table 1.4: % of households who are owner-occupiers, by age band
// Source: English Housing Survey 2024-25, DLUHC
const OWNERSHIP_BY_AGE = [
  { year: "03-04", "16-24": 24.0, "25-34": 58.6, "35-44": 74.3, "45-54": 80.6, "55-64": 81.5, "65+": 71.0 },
  { year: "04-05", "16-24": 27.2, "25-34": 56.7, "35-44": 71.5, "45-54": 77.5, "55-64": 80.7, "65+": 72.0 },
  { year: "05-06", "16-24": 16.9, "25-34": 56.0, "35-44": 73.0, "45-54": 80.1, "55-64": 79.5, "65+": 73.6 },
  { year: "06-07", "16-24": 19.0, "25-34": 56.5, "35-44": 71.6, "45-54": 76.9, "55-64": 81.5, "65+": 72.8 },
  { year: "07-08", "16-24": 14.5, "25-34": 55.2, "35-44": 70.7, "45-54": 77.4, "55-64": 80.5, "65+": 75.1 },
  { year: "08-09", "16-24": 14.4, "25-34": 51.5, "35-44": 67.1, "45-54": 74.1, "55-64": 79.0, "65+": 74.7 },
  { year: "09-10", "16-24": 14.2, "25-34": 46.6, "35-44": 66.8, "45-54": 73.9, "55-64": 78.1, "65+": 75.9 },
  { year: "10-11", "16-24": 11.9, "25-34": 43.1, "35-44": 63.1, "45-54": 73.5, "55-64": 78.6, "65+": 75.8 },
  { year: "11-12", "16-24": 10.0, "25-34": 42.8, "35-44": 63.6, "45-54": 71.6, "55-64": 76.2, "65+": 75.6 },
  { year: "12-13", "16-24": 11.2, "25-34": 39.5, "35-44": 61.8, "45-54": 72.0, "55-64": 76.9, "65+": 77.3 },
  { year: "13-14", "16-24": 8.9,  "25-34": 35.8, "35-44": 58.8, "45-54": 67.8, "55-64": 76.2, "65+": 77.1 },
  { year: "14-15", "16-24": 8.5,  "25-34": 36.7, "35-44": 58.9, "45-54": 68.8, "55-64": 75.6, "65+": 76.7 },
  { year: "15-16", "16-24": 10.2, "25-34": 38.2, "35-44": 56.2, "45-54": 66.8, "55-64": 71.9, "65+": 77.8 },
  { year: "16-17", "16-24": 8.6,  "25-34": 37.3, "35-44": 52.4, "45-54": 67.0, "55-64": 75.0, "65+": 77.6 },
  { year: "17-18", "16-24": 12.3, "25-34": 37.6, "35-44": 56.5, "45-54": 66.5, "55-64": 73.2, "65+": 78.6 },
  { year: "18-19", "16-24": 9.4,  "25-34": 41.2, "35-44": 54.6, "45-54": 66.5, "55-64": 72.9, "65+": 78.7 },
  { year: "19-20", "16-24": 14.3, "25-34": 40.9, "35-44": 55.8, "45-54": 66.3, "55-64": 73.6, "65+": 79.7 },
  { year: "20-21", "16-24": 14.3, "25-34": 46.9, "35-44": 61.3, "45-54": 64.6, "55-64": 69.6, "65+": 79.6 },
  { year: "21-22", "16-24": 14.2, "25-34": 41.4, "35-44": 59.3, "45-54": 65.6, "55-64": 71.5, "65+": 78.6 },
  { year: "22-23", "16-24": 10.3, "25-34": 44.7, "35-44": 59.0, "45-54": 67.4, "55-64": 71.3, "65+": 78.4 },
  { year: "23-24", "16-24": 16.5, "25-34": 45.4, "35-44": 56.0, "45-54": 67.2, "55-64": 71.5, "65+": 78.3 },
  { year: "24-25", "16-24": 10.6, "25-34": 47.7, "35-44": 56.4, "45-54": 65.7, "55-64": 70.8, "65+": 78.9 },
];

// ONS Housing Affordability in England and Wales
// Median house price to median workplace-based annual earnings ratio
// Source: ONS Table 5c, 1997–2024
const AFFORDABILITY = [
  { year: 1997, ratio: 3.54, price: 60000,  earnings: 16950 },
  { year: 1998, ratio: 3.65, price: 62500,  earnings: 17120 },
  { year: 1999, ratio: 3.88, price: 67000,  earnings: 17270 },
  { year: 2000, ratio: 4.11, price: 72000,  earnings: 17520 },
  { year: 2001, ratio: 4.39, price: 78000,  earnings: 17770 },
  { year: 2002, ratio: 5.13, price: 94000,  earnings: 18330 },
  { year: 2003, ratio: 5.88, price: 114000, earnings: 19390 },
  { year: 2004, ratio: 6.57, price: 137000, earnings: 20850 },
  { year: 2005, ratio: 6.82, price: 143000, earnings: 20970 },
  { year: 2006, ratio: 7.15, price: 152000, earnings: 21260 },
  { year: 2007, ratio: 7.25, price: 160000, earnings: 22070 },
  { year: 2008, ratio: 6.97, price: 157000, earnings: 22530 },
  { year: 2009, ratio: 6.28, price: 145000, earnings: 23100 },
  { year: 2010, ratio: 6.69, price: 155000, earnings: 23170 },
  { year: 2011, ratio: 6.58, price: 152500, earnings: 23170 },
  { year: 2012, ratio: 6.59, price: 153000, earnings: 23220 },
  { year: 2013, ratio: 6.76, price: 157500, earnings: 23300 },
  { year: 2014, ratio: 7.09, price: 167000, earnings: 23560 },
  { year: 2015, ratio: 7.52, price: 178000, earnings: 23660 },
  { year: 2016, ratio: 7.72, price: 190000, earnings: 24600 },
  { year: 2017, ratio: 7.91, price: 197000, earnings: 24900 },
  { year: 2018, ratio: 8.04, price: 203000, earnings: 25250 },
  { year: 2019, ratio: 7.83, price: 200000, earnings: 25550 },
  { year: 2020, ratio: 7.69, price: 204000, earnings: 26530 },
  { year: 2021, ratio: 8.96, price: 240000, earnings: 26780 },
  { year: 2022, ratio: 8.28, price: 257500, earnings: 31100 },
  { year: 2023, ratio: 8.26, price: 262500, earnings: 31800 },
  { year: 2024, ratio: 7.54, price: 282500, earnings: 37470 },
];

const AGE_BANDS = [
  { key: "25-34", label: "25–34", color: P.sienna },
  { key: "35-44", label: "35–44", color: P.yellow },
  { key: "45-54", label: "45–54", color: P.navy },
  { key: "55-64", label: "55–64", color: P.teal },
  { key: "65+",   label: "65+",   color: P.grey },
];

function formatPrice(v) {
  if (v >= 1000000) return `£${(v / 1000000).toFixed(2)}m`;
  if (v >= 1000) return `£${Math.round(v / 1000)}k`;
  return `£${v}`;
}

export default function HousingPrices() {
  const [chartView, setChartView] = useState("price");
  const { data, loading, error } = useDataset(
    () => fetchHousePrices("united-kingdom", { minMonth: "2010-01" }),
    []
  );

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Prices &amp; Affordability</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading Land Registry data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Prices &amp; Affordability</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error}</p>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const yearAgo = data.find((d) => {
    const [y, m] = latest.month.split("-");
    const target = `${parseInt(y) - 1}-${m}`;
    return d.month === target;
  });
  const earliest = data[0];
  const annual = toAnnual(data);

  // For the monthly chart, sample every 3 months to reduce noise
  const quarterly = data.filter((_, i) => i % 3 === 0 || _ === latest);

  const priceChangeSinceStart = earliest
    ? (((latest.averagePrice - earliest.averagePrice) / earliest.averagePrice) * 100).toFixed(0)
    : "--";

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Prices &amp; Affordability</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>UK House Price Index</span>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Avg. House Price"
          value={formatPrice(latest.averagePrice)}
          change={`${latest.annualChange >= 0 ? "+" : ""}${latest.annualChange?.toFixed(1) ?? "--"}% yr/yr`}
          up={latest.annualChange > 0}
          color={P.yellow}
          delay={0.1}
        />
        <MetricCard
          label="Since 2010"
          value={`+${priceChangeSinceStart}%`}
          change={`${formatPrice(earliest?.averagePrice ?? 0)} → ${formatPrice(latest.averagePrice)}`}
          up={true}
          color={P.yellow}
          delay={0.18}
        />
        <MetricCard
          label="Sales Volume"
          value={latest.salesVolume?.toLocaleString() ?? "--"}
          change={`${latest.month} (monthly)`}
          up={false}
          color={P.navy}
          delay={0.26}
        />
        <MetricCard
          label="Detached vs Flat"
          value={formatPrice(latest.averagePriceDetached)}
          change={`Flat: ${formatPrice(latest.averagePriceFlat)}`}
          up={true}
          color={P.grey}
          delay={0.34}
        />
      </div>

      {/* Chart */}
      <ShareableChart title="UK House Prices">
      <div style={{ ...CHART_CARD, marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={CHART_TITLE}>
              UK House Prices
            </div>
            <div style={CHART_SUBTITLE}>
              UK House Price Index, average prices since 2010
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {chartView === "price" && (
              <>
                <LegendDot color={P.yellow} label="Average Price" />
                <LegendDot color={P.navy} label="Detached" />
                <LegendDot color={P.grey} label="Flat" />
              </>
            )}
            {chartView === "type" && (
              <>
                <LegendDot color={P.navy} label="Detached" />
                <LegendDot color={P.teal} label="Semi-detached" />
                <LegendDot color={P.yellow} label="Terraced" />
                <LegendDot color={P.grey} label="Flat" />
              </>
            )}
            {chartView === "volume" && (
              <LegendDot color={P.teal} label="Monthly Sales Volume" />
            )}
          </div>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
            {[
              { key: "price", label: "Price" },
              { key: "type", label: "By Type" },
              { key: "volume", label: "Volume" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartView(key)}
                style={{
                  background: chartView === key ? "rgba(28,43,69,0.06)" : "transparent",
                  border: "none",
                  color: chartView === key ? P.text : P.textLight,
                  padding: "4px 12px",
                  fontSize: "10px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                  transition: "all 0.15s",
                  borderRadius: 2,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          {chartView === "volume" ? (
            <BarChart data={quarterly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Monthly sales")} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="salesVolume" name="Sales Volume" fill={P.teal} opacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          ) : chartView === "type" ? (
            <LineChart data={quarterly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Average price (£)")} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="averagePriceDetached" name="Detached" stroke={P.navy} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="averagePriceSemiDetached" name="Semi-detached" stroke={P.teal} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="averagePriceTerraced" name="Terraced" stroke={P.yellow} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="averagePriceFlat" name="Flat" stroke={P.grey} strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <LineChart data={quarterly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Average price (£)")} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="averagePrice" name="Average" stroke={P.yellow} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="averagePriceDetached" name="Detached" stroke={P.navy} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              <Line type="monotone" dataKey="averagePriceFlat" name="Flat" stroke={P.grey} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            </LineChart>
          )}
        </ResponsiveContainer>

        <div style={SOURCE_TEXT}>
          SOURCES:{" "}
          <a
            href="https://landregistry.data.gov.uk/app/ukhpi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: P.textLight, textDecoration: "underline" }}
          >
            HM Land Registry UK House Price Index
          </a>
          {" "}&middot; {earliest?.month} to {latest?.month}
          {" "}&middot;{" "}
          <a
            href="https://www.gov.uk/government/collections/english-housing-survey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: P.textLight, textDecoration: "underline" }}
          >
            English Housing Survey 2024-25 (DLUHC)
          </a>
        </div>
      </div>
      </ShareableChart>

      {/* Affordability */}
      <ShareableChart title="Housing Affordability">
      <div style={{ ...CHART_CARD, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={CHART_TITLE}>
              Housing Affordability
            </div>
            <div style={CHART_SUBTITLE}>
              Median house price ÷ median annual earnings, England &amp; Wales
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <LegendDot color={P.sienna} label="Affordability Ratio" />
            <LegendDot color="rgba(166,124,82,0.12)" label="Median Price / Earnings" />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={AFFORDABILITY} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
            <YAxis
              yAxisId="ratio"
              tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
              domain={[0, 10]}
              label={yAxisLabel("Price-to-earnings ratio")}
              tickFormatter={(v) => `${v}×`}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
              domain={[0, 300000]}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
              label={yAxisLabel("Median price / earnings (£)", { angle: 90, position: "insideRight" })}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: P.sienna }}>Ratio: {d.ratio}×</div>
                    <div style={{ color: P.textMuted }}>Median price: {formatPrice(d.price)}</div>
                    <div style={{ color: P.textMuted }}>Median earnings: {formatPrice(d.earnings)}</div>
                  </div>
                );
              }}
            />
            <Area yAxisId="price" type="monotone" dataKey="price" name="Median Price" fill="rgba(166,124,82,0.08)" stroke="rgba(166,124,82,0.25)" strokeWidth={1} dot={false} />
            <Area yAxisId="price" type="monotone" dataKey="earnings" name="Median Earnings" fill="rgba(28,43,69,0.05)" stroke="rgba(28,43,69,0.15)" strokeWidth={1} dot={false} />
            <Line yAxisId="ratio" type="monotone" dataKey="ratio" name="Affordability Ratio" stroke={P.sienna} strokeWidth={2.5} dot={false} />
            <ReferenceLine yAxisId="ratio" y={AFFORDABILITY[0].ratio} stroke={P.sienna} strokeDasharray="4 3" strokeOpacity={0.4} />
          </ComposedChart>
        </ResponsiveContainer>

        <div style={SOURCE_TEXT}>
          SOURCE:{" "}
          <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/housing/bulletins/housingaffordabilityinenglandandwales/latest" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            ONS Housing Affordability in England and Wales, Table 5c
          </a>
          {" "}&middot; Median workplace-based, 1997–2024
        </div>
      </div>
      </ShareableChart>

      {/* Home ownership by age */}
      <ShareableChart title="Home Ownership by Age">
      <div style={{ ...CHART_CARD, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={CHART_TITLE}>
              Home Ownership by Age
            </div>
            <div style={CHART_SUBTITLE}>
              % of households who are owner-occupiers, England
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
            {AGE_BANDS.map((b) => (
              <LegendDot key={b.key} color={b.color} label={b.label} />
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={OWNERSHIP_BY_AGE} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
            <YAxis
              tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 100]}
              label={yAxisLabel("% home ownership")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
            {AGE_BANDS.map((b) => (
              <Line key={b.key} type="monotone" dataKey={b.key} name={`${b.label} yrs`} stroke={b.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div style={SOURCE_TEXT}>
          SOURCE:{" "}
          <a href="https://www.gov.uk/government/collections/english-housing-survey" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            English Housing Survey Annex Table 1.4 (DLUHC)
          </a>
          {" "}&middot; 2003-04 to 2024-25
        </div>
      </div>
      </ShareableChart>

      <AnalysisBox color={P.yellow} label="Context">
        UK average house price: {formatPrice(earliest?.averagePrice)} ({earliest?.month}) to{" "}
        {formatPrice(latest?.averagePrice)} ({latest?.month}).
        Detached: {formatPrice(latest?.averagePriceDetached)}.
        Flat: {formatPrice(latest?.averagePriceFlat)}.
        Annual change: {latest?.annualChange >= 0 ? "+" : ""}{latest?.annualChange?.toFixed(1)}%.
        {" "}The median house in England &amp; Wales cost {AFFORDABILITY[0].ratio}× median earnings in 1997;
        by 2024 the ratio was {AFFORDABILITY[AFFORDABILITY.length - 1].ratio}×, peaking at {Math.max(...AFFORDABILITY.map(d => d.ratio)).toFixed(2)}× in 2021.
        {" "}Home ownership rate (EHS 2024-25): 25-34 year olds {OWNERSHIP_BY_AGE[OWNERSHIP_BY_AGE.length - 1]["25-34"]}%
        (down from {OWNERSHIP_BY_AGE[0]["25-34"]}% in 2003-04);
        35-44 year olds {OWNERSHIP_BY_AGE[OWNERSHIP_BY_AGE.length - 1]["35-44"]}%
        (down from {OWNERSHIP_BY_AGE[0]["35-44"]}% in 2003-04).
      </AnalysisBox>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 14, height: 2.5, background: color, display: "inline-block", borderRadius: 1 }} />
      <span style={{ fontSize: "11px", color: "#6B6458", fontWeight: 400, letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}
