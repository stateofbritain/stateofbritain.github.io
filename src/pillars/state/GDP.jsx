import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

export default function GDP() {
  const { data, loading, error, raw } = useJsonDataset("gdp.json");
  const isMobile = useIsMobile();
  const [gdpView, setGdpView] = useState("level");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>GDP</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>GDP</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;
  const quarterly = data.quarterly ?? [];
  const firstYear = quarterly[0]?.quarter?.slice(0, 4) ?? "";
  const lastYear = quarterly[quarterly.length - 1]?.quarter?.slice(0, 4) ?? "";

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>GDP</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Gross domestic product in real terms
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Real GDP"
          value={`£${s.gdpRealBn}bn`}
          change={s.latestQuarter}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="GDP per capita"
          value={`£${s.gdpPerCapita.toLocaleString()}`}
          change={s.latestQuarter}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="QoQ growth"
          value={`${s.qoqGrowth >= 0 ? "+" : ""}${s.qoqGrowth}%`}
          change={s.latestQuarter}
          color={P.sienna}
          delay={0.26}
        />
      </div>

      {/* -- Section 1: Real GDP ----------------------------------------- */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Real GDP</h3>
        <p style={SECTION_NOTE}>
          {gdpView === "level"
            ? `Quarterly real GDP (chained volume measure) for the UK from ${firstYear} to ${lastYear}. Values are in constant prices, removing the effect of inflation. The series covers ${quarterly.length} quarters.`
            : `Quarter-on-quarter percentage change in real GDP from ${firstYear} to ${lastYear}. Positive values indicate expansion, negative values indicate contraction. The COVID-19 period in 2020 produced unusually large swings.`}
        </p>

        {gdpView === "level" && quarterly.length > 0 && (
          <ChartCard
            title="Real GDP"
            subtitle={`£ billion, chained volume measure, UK, ${firstYear}-${lastYear}`}
            source={sourceFrom(raw, "quarterly")}
            views={["level", "growth"]}
            viewLabels={{ level: "Level", growth: "Growth" }}
            activeView={gdpView}
            onViewChange={setGdpView}
            height={380}
          >
            <LineChart data={quarterly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="quarter"
                tick={AXIS_TICK_MONO}
                tickLine={false}
                tickFormatter={v => v.slice(0, 4)}
                interval={isMobile ? 15 : 7}
              />
              <YAxis
                tick={AXIS_TICK_MONO}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `£${v}bn`}
                domain={[0, "auto"]}
                label={yAxisLabel("£ billion")}
              />
              <Tooltip content={<CustomTooltip formatter={v => `£${v.toFixed(1)}bn`} />} />
              <Line type="monotone" dataKey="gdpBn" stroke={P.navy} strokeWidth={2} dot={false} name="Real GDP" />
            </LineChart>
          </ChartCard>
        )}

        {gdpView === "growth" && quarterly.length > 0 && (
          <ChartCard
            title="GDP Growth Rate"
            subtitle={`Quarter-on-quarter % change, UK, ${firstYear}-${lastYear}`}
            source={sourceFrom(raw, "quarterly")}
            views={["level", "growth"]}
            viewLabels={{ level: "Level", growth: "Growth" }}
            activeView={gdpView}
            onViewChange={setGdpView}
            height={380}
          >
            <BarChart data={quarterly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="quarter"
                tick={AXIS_TICK_MONO}
                tickLine={false}
                tickFormatter={v => v.slice(0, 4)}
                interval={isMobile ? 15 : 7}
              />
              <YAxis
                tick={AXIS_TICK_MONO}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                label={yAxisLabel("% change")}
              />
              <Tooltip content={<CustomTooltip formatter={v => `${v.toFixed(1)}%`} />} />
              <ReferenceLine y={0} stroke={P.grey} strokeWidth={1} />
              <Bar dataKey="qoqGrowth" name="QoQ growth" radius={[1, 1, 0, 0]}>
                {quarterly.map((d, i) => (
                  <Cell key={i} fill={d.qoqGrowth >= 0 ? P.teal : P.red} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        )}
      </section>

      {/* -- Section 2: GDP per Capita ----------------------------------- */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>GDP per Capita</h3>
        <p style={SECTION_NOTE}>
          Real GDP divided by estimated population, from {firstYear} to {lastYear}. This measure adjusts for population growth, providing a per-person indicator of economic output. Values are in constant prices.
        </p>

        <ChartCard
          title="GDP per Capita"
          subtitle={`£ per person, chained volume measure, UK, ${firstYear}-${lastYear}`}
          source={sourceFrom(raw, "quarterly")}
          height={380}
        >
          <LineChart data={quarterly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="quarter"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={v => v.slice(0, 4)}
              interval={isMobile ? 15 : 7}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `£${v.toLocaleString()}`}
              domain={[0, "auto"]}
              label={yAxisLabel("£ per person")}
            />
            <Tooltip content={<CustomTooltip formatter={v => `£${v.toLocaleString()}`} />} />
            <Line type="monotone" dataKey="perCapita" stroke={P.teal} strokeWidth={2} dot={false} name="GDP per capita" />
          </LineChart>
        </ChartCard>
      </section>
    </div>
  );
}
