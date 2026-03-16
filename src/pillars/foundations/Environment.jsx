import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_CARD, CHART_TITLE, CHART_SUBTITLE,
  SOURCE_TEXT, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { fetchDataset } from "../../hooks/useDataset";

const GHG_SECTORS = [
  { key: "electricity", label: "Electricity Supply", color: P.yellow },
  { key: "transport", label: "Transport", color: P.sienna },
  { key: "buildings", label: "Buildings", color: "#7A6650" },
  { key: "industry", label: "Industry", color: P.navy },
  { key: "agriculture", label: "Agriculture", color: "#4A7A58" },
  { key: "fuel", label: "Fuel Supply", color: P.grey },
  { key: "waste", label: "Waste", color: "#9B7EB0" },
  { key: "lulucf", label: "Land Use Change", color: P.teal },
];

export default function Environment() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ghgView, setGhgView] = useState("stacked");
  const [airView, setAirView] = useState("pm25");

  const ghgFrom2008 = useMemo(() => {
    if (!data?.ghgEmissions) return [];
    return data.ghgEmissions.filter((d) => d.year >= 2008);
  }, [data]);

  useEffect(() => {
    fetchDataset("environment.json")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Environment</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading environment data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Environment</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const ghg = data.ghgEmissions;
  const latest = ghg[ghg.length - 1];
  const baseline = ghg[0]; // 1990
  const reductionPct = (((baseline.total - latest.total) / baseline.total) * 100).toFixed(1);

  const pm25 = data.pm25;
  const latestPM = pm25[pm25.length - 1];
  const no2 = data.no2;
  const latestNO2 = no2[no2.length - 1];

  const ulev = data.ulevRegistrations;
  const latestULEV = ulev[ulev.length - 1];
  const prevULEV = ulev[ulev.length - 2];
  const ulevGrowth = prevULEV ? (((latestULEV.total - prevULEV.total) / prevULEV.total) * 100).toFixed(0) : "--";

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Environment</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          DESNZ &middot; DEFRA &middot; DfT
        </span>
      </div>

      {/* ═══ SECTION 1 — GREENHOUSE GAS EMISSIONS ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Greenhouse Gas Emissions</h3>
        <p style={SECTION_NOTE}>
          Territorial greenhouse gas emissions — all gases weighted by global warming potential
          (CO2 equivalent). Covers electricity, transport, buildings, industry, agriculture,
          waste and land use. 2024 figures are provisional estimates based on energy statistics.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Total GHG Emissions"
            value={`${latest.total} MtCO2e`}
            change={`${reductionPct}% below 1990 (${baseline.total} Mt)`}
            up={false}
            color={P.teal}
            delay={0.1}
          />
          <MetricCard
            label="Electricity Supply"
            value={`${latest.electricity} Mt`}
            change={`down from ${baseline.electricity} Mt in 1990`}
            up={false}
            color={P.yellow}
            delay={0.18}
          />
          <MetricCard
            label="Transport"
            value={`${latest.transport} Mt`}
            change={`down from ${baseline.transport} Mt in 1990`}
            up={false}
            color={P.sienna}
            delay={0.26}
          />
          <MetricCard
            label="Industry"
            value={`${latest.industry} Mt`}
            change={`down from ${baseline.industry} Mt in 1990`}
            up={false}
            color={P.navy}
            delay={0.34}
          />
        </div>

        <ChartCard
          label={ghgView === "stacked" ? "GHG emissions by sector (MtCO2e)" : "Total GHG emissions (MtCO2e)"}
          yearRange={ghgView === "stacked" ? "2008–2024" : "1990–2024"}
          views={["stacked", "total"]}
          viewLabels={{ stacked: "By Sector", total: "Total" }}
          activeView={ghgView}
          onViewChange={setGhgView}
        >
          {ghgView === "stacked" && <GHGStackedChart data={ghgFrom2008} />}
          {ghgView === "total" && <GHGTotalChart data={ghg} />}
        </ChartCard>

        {ghgView === "stacked" && <Legend items={GHG_SECTORS} />}
      </div>

      {/* ═══ SECTION 2 — AIR QUALITY ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Air Quality</h3>
        <p style={SECTION_NOTE}>
          Annual mean concentrations at urban background monitoring sites. PM2.5 (fine particulate
          matter) data available from 2009; NO2 (nitrogen dioxide) from 1990. The WHO guideline
          for PM2.5 annual mean is 5 &#181;g/m&#179;.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="PM2.5 (Urban)"
            value={`${latestPM.mean} µg/m³`}
            change={`WHO guideline: 5 µg/m³ (${latestPM.year})`}
            up={latestPM.mean > 5}
            color={latestPM.mean > 5 ? P.sienna : P.teal}
            delay={0.1}
          />
          <MetricCard
            label="NO2 (Urban)"
            value={`${latestNO2.mean} µg/m³`}
            change={`WHO guideline: 10 µg/m³ (${latestNO2.year})`}
            up={latestNO2.mean > 10}
            color={latestNO2.mean > 10 ? P.sienna : P.teal}
            delay={0.18}
          />
        </div>

        <ChartCard
          label={airView === "pm25" ? "PM2.5 annual mean — urban background (µg/m³)" : "NO2 annual mean — urban background (µg/m³)"}
          yearRange={airView === "pm25" ? `${pm25[0].year}–${latestPM.year}` : `${no2[0].year}–${latestNO2.year}`}
          views={["pm25", "no2"]}
          viewLabels={{ pm25: "PM2.5", no2: "NO₂" }}
          activeView={airView}
          onViewChange={setAirView}
        >
          {airView === "pm25" && <PM25Chart data={pm25} />}
          {airView === "no2" && <NO2Chart data={no2} />}
        </ChartCard>
      </div>

      {/* ═══ SECTION 3 — EV UPTAKE ═══ */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={SECTION_HEADING}>Ultra Low Emission Vehicles</h3>
        <p style={SECTION_NOTE}>
          New ULEV registrations per year. Includes battery electric (BEV), plug-in hybrid (PHEV),
          and other ultra low emission vehicles (range-extended, fuel cell). UK data from 2015.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="ULEV Registrations"
            value={latestULEV.total.toLocaleString()}
            change={`+${ulevGrowth}% vs ${prevULEV?.year ?? "–"} (${latestULEV.year})`}
            up={false}
            color={P.teal}
            delay={0.1}
          />
          <MetricCard
            label="Battery Electric"
            value={latestULEV.bev.toLocaleString()}
            change={`${((latestULEV.bev / latestULEV.total) * 100).toFixed(0)}% of ULEV registrations`}
            up={false}
            color={P.navy}
            delay={0.18}
          />
          <MetricCard
            label="Plug-in Hybrid"
            value={latestULEV.phev.toLocaleString()}
            change={`${((latestULEV.phev / latestULEV.total) * 100).toFixed(0)}% of ULEV registrations`}
            up={false}
            color={P.yellow}
            delay={0.26}
          />
        </div>

        <ChartCard
          label="New ULEV registrations (UK)"
          yearRange={`${ulev[0].year}–${latestULEV.year}`}
        >
          <ULEVChart data={ulev} />
        </ChartCard>

        <Legend items={[
          { key: "bev", label: "Battery Electric", color: P.navy },
          { key: "phev", label: "Plug-in Hybrid", color: P.yellow },
          { key: "other", label: "Other ULEV", color: P.grey },
        ]} />
      </div>

      {/* Source citations */}
      <div style={{ ...SOURCE_TEXT, marginBottom: 20 }}>
        SOURCES:{" "}
        <a href="https://www.gov.uk/government/statistics/provisional-uk-greenhouse-gas-emissions-national-statistics-2024" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          DESNZ Provisional GHG Emissions 2024
        </a>
        {" "}&middot;{" "}
        <a href="https://www.gov.uk/government/statistics/air-quality-statistics" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          DEFRA Air Quality Statistics
        </a>
        {" "}&middot;{" "}
        <a href="https://www.gov.uk/government/statistical-data-sets/vehicle-licensing-statistics-data-tables" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          DfT Vehicle Licensing Statistics (VEH0171)
        </a>
      </div>

      <AnalysisBox color={P.navy} label="Context">
        UK territorial GHG emissions: {latest.total} MtCO2e in {latest.year} (provisional), {reductionPct}% below 1990 levels.
        {" "}Electricity supply emissions fell from {baseline.electricity} Mt to {latest.electricity} Mt ({((1 - latest.electricity / baseline.electricity) * 100).toFixed(0)}% reduction).
        {" "}Transport remains the largest emitting sector at {latest.transport} Mt.
        {" "}Urban PM2.5: {latestPM.mean} &#181;g/m&#179; ({latestPM.year}), above the WHO guideline of 5 &#181;g/m&#179;.
        {" "}Urban NO2: {latestNO2.mean} &#181;g/m&#179; ({latestNO2.year}), above the WHO guideline of 10 &#181;g/m&#179;.
        {" "}{latestULEV.total.toLocaleString()} ULEVs registered in {latestULEV.year}, of which {((latestULEV.bev / latestULEV.total) * 100).toFixed(0)}% were battery electric.
      </AnalysisBox>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────

function ChartCard({ label, yearRange, views, viewLabels, activeView, onViewChange, children }) {
  return (
    <ShareableChart title={label}>
    <div style={{ ...CHART_CARD, marginBottom: 16, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
      <div style={{ marginBottom: 10 }}>
        <div style={CHART_TITLE}>{label}</div>
        <div style={CHART_SUBTITLE}>{yearRange}</div>
      </div>
      {views && onViewChange && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
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
        </div>
      )}
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

// ─── Charts ───────────────────────────────────────────────────────────

function GHGStackedChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={AXIS_TICK_MONO}
          axisLine={false} tickLine={false}
          label={yAxisLabel("Emissions (MtCO2e)")}
        />
        <Tooltip content={<CustomTooltip />} />
        {GHG_SECTORS.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="1" stroke={s.color} fill={s.color} fillOpacity={0.8} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function GHGTotalChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={4} />
        <YAxis
          tick={AXIS_TICK_MONO}
          axisLine={false} tickLine={false} domain={[0, 900]}
          label={yAxisLabel("Total GHG emissions (MtCO2e)")}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="total" name="Total GHG (MtCO2e)" stroke={P.teal} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PM25Chart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={AXIS_TICK_MONO}
          axisLine={false} tickLine={false} domain={[0, 16]}
          label={yAxisLabel("PM2.5 concentration (µg/m³)")}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={5} stroke={P.red} strokeDasharray="6 3" label={{ value: "WHO guideline (5)", position: "right", style: { fontSize: 10, fill: P.red, fontFamily: "'DM Mono', monospace" } }} />
        <Line type="monotone" dataKey="mean" name="PM2.5 (µg/m³)" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function NO2Chart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={4} />
        <YAxis
          tick={AXIS_TICK_MONO}
          axisLine={false} tickLine={false} domain={[0, 60]}
          label={yAxisLabel("NO2 concentration (µg/m³)")}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={10} stroke={P.red} strokeDasharray="6 3" label={{ value: "WHO guideline (10)", position: "right", style: { fontSize: 10, fill: P.red, fontFamily: "'DM Mono', monospace" } }} />
        <Line type="monotone" dataKey="mean" name="NO2 (µg/m³)" stroke={P.navy} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ULEVChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis
          tick={AXIS_TICK_MONO}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          label={yAxisLabel("New ULEV registrations")}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="bev" name="Battery Electric" stackId="1" fill={P.navy} opacity={0.85} />
        <Bar dataKey="phev" name="Plug-in Hybrid" stackId="1" fill={P.yellow} opacity={0.85} />
        <Bar dataKey="other" name="Other ULEV" stackId="1" fill={P.grey} opacity={0.85} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
