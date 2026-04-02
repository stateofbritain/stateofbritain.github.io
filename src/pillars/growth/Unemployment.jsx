import { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
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

export default function Unemployment() {
  const { data, loading, error, raw } = useJsonDataset("unemployment.json");
  const isMobile = useIsMobile();
  const [rateView, setRateView] = useState("rates");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Unemployment</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Unemployment</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;
  const quarterly = data.quarterly ?? [];
  const inactivity = data.inactivityReasons ?? [];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Unemployment</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Labour market rates and economic inactivity
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Unemployment rate"
          value={`${s.unemploymentRate}%`}
          change={s.latestQuarter}
          color={P.red}
          delay={0.1}
        />
        <MetricCard
          label="Employment rate"
          value={`${s.employmentRate}%`}
          change="aged 16-64"
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Inactivity rate"
          value={`${s.inactivityRate}%`}
          change="aged 16-64"
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="Unemployed"
          value={`${(s.unemployedThousands / 1000).toFixed(1)}m`}
          change={s.latestQuarter}
          color={P.navy}
          delay={0.34}
        />
      </div>

      {/* ── Section 1: Labour Market Rates ─────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Labour Market Rates</h3>
        <p style={SECTION_NOTE}>
          {rateView === "rates"
            ? "Quarterly unemployment rate (aged 16+), employment rate (aged 16-64), and economic inactivity rate (aged 16-64), seasonally adjusted, from 1992. The unemployment rate measures the share of the economically active population without work. The inactivity rate captures those not seeking work, including students, long-term sick, and retirees."
            : `Number of unemployed people (thousands, aged 16+, seasonally adjusted) from 1992. The level peaked at 2.7 million in 1993 and again at 2.7 million in 2011. The latest figure is ${(s.unemployedThousands / 1000).toFixed(1)} million (${s.latestQuarter}).`}
        </p>

        {rateView === "rates" && quarterly.length > 0 && (
          <ChartCard
            title="Labour Market Rates"
            subtitle="%, seasonally adjusted, UK"
            source={sourceFrom(raw, "quarterly")}
            views={["rates", "level"]}
            viewLabels={{ rates: "Rates (%)", level: "Level (000s)" }}
            activeView={rateView}
            onViewChange={setRateView}
            legend={[
              { key: "employmentRate", label: "Employment (16-64)", color: P.teal },
              { key: "inactivityRate", label: "Inactivity (16-64)", color: P.sienna },
              { key: "unemploymentRate", label: "Unemployment (16+)", color: P.red },
            ]}
            height={380}
          >
            <LineChart data={quarterly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 80]} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={v => `${v.toFixed(1)}%`} />} />
              <Line type="monotone" dataKey="employmentRate" stroke={P.teal} strokeWidth={2} dot={false} name="Employment (16-64)" />
              <Line type="monotone" dataKey="inactivityRate" stroke={P.sienna} strokeWidth={1.5} dot={false} name="Inactivity (16-64)" />
              <Line type="monotone" dataKey="unemploymentRate" stroke={P.red} strokeWidth={2} dot={false} name="Unemployment (16+)" />
            </LineChart>
          </ChartCard>
        )}

        {rateView === "level" && quarterly.length > 0 && (
          <ChartCard
            title="Number Unemployed"
            subtitle="Thousands, aged 16+, seasonally adjusted, UK"
            source={sourceFrom(raw, "quarterly")}
            views={["rates", "level"]}
            viewLabels={{ rates: "Rates (%)", level: "Level (000s)" }}
            activeView={rateView}
            onViewChange={setRateView}
            height={380}
          >
            <AreaChart data={quarterly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}m` : `${v}k`} domain={[0, "auto"]} label={yAxisLabel("thousands")} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1000).toFixed(2)}m (${Math.round(v).toLocaleString()}k)`} />} />
              <Area type="monotone" dataKey="unemployedThousands" stroke={P.red} fill={P.red} fillOpacity={0.15} strokeWidth={2} name="Unemployed" />
            </AreaChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 2: Economic Inactivity Reasons ─────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Economic Inactivity</h3>
        <p style={SECTION_NOTE}>
          Key reasons for economic inactivity among 16-64 year olds, quarterly from 1993. Long-term sickness has risen from {inactivity[0] ? `${Math.round(inactivity[0].longTermSick).toLocaleString()}k` : "—"} to {inactivity.length > 0 ? `${Math.round(inactivity[inactivity.length - 1].longTermSick).toLocaleString()}k` : "—"}, while the student population has also grown substantially. These are the two largest categories of economic inactivity.
        </p>

        <ChartCard
          title="Inactivity by Reason (16-64)"
          subtitle="Thousands, seasonally adjusted, UK"
          source={sourceFrom(raw, "inactivityReasons")}
          legend={[
            { key: "longTermSick", label: "Long-term sick", color: P.red },
            { key: "students", label: "Students", color: P.navy },
          ]}
          height={380}
        >
          <LineChart data={inactivity} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}m` : `${v}k`} domain={[0, "auto"]} label={yAxisLabel("thousands")} />
            <Tooltip content={<CustomTooltip formatter={v => `${Math.round(v).toLocaleString()}k`} />} />
            <Line type="monotone" dataKey="longTermSick" stroke={P.red} strokeWidth={2} dot={false} name="Long-term sick" />
            <Line type="monotone" dataKey="students" stroke={P.navy} strokeWidth={2} dot={false} name="Students" />
          </LineChart>
        </ChartCard>
      </section>
    </div>
  );
}
