import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

export default function Broadband() {
  const { data, loading, error, raw } = useJsonDataset("infrastructure.json");
  const [bbView, setBbView] = useState("coverage");

  const coverageSeries = useMemo(() => {
    if (!data) return [];
    const map = {};
    for (const r of data.broadband.fttp) {
      map[r.year] = { year: r.year, fttp: r.pct };
    }
    for (const r of data.broadband.gigabit) {
      if (!map[r.year]) map[r.year] = { year: r.year };
      map[r.year].gigabit = r.pct;
    }
    return Object.values(map).sort((a, b) => a.year - b.year);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Broadband</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Broadband</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestFttp = data.broadband.fttp[data.broadband.fttp.length - 1];
  const latestGigabit = data.broadband.gigabit[data.broadband.gigabit.length - 1];
  const latestSpeed = data.broadband.speeds[data.broadband.speeds.length - 1];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Broadband</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Digital connectivity, coverage and speeds
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard label="FTTP coverage" value={`${latestFttp.pct}%`} sub={`${latestFttp.premises}m premises (${latestFttp.date})`} />
        <MetricCard label="Gigabit-capable" value={`${latestGigabit.pct}%`} sub={latestGigabit.date} />
        <MetricCard label="Download speed" value={`${latestSpeed.medianDown} Mb/s`} sub={`median (${latestSpeed.year})`} />
      </div>

      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Broadband & Digital Connectivity</h3>
        <p style={SECTION_NOTE}>
          {bbView === "coverage"
            ? "Full-fibre (FTTP) and gigabit-capable broadband coverage as a percentage of UK premises. FTTP has grown from 6% in 2018 to 78% in 2025."
            : bbView === "speeds"
              ? "Median download and upload speeds in Mbit/s from Ofcom UK Home Broadband Performance reports."
              : "4G geographic coverage as a percentage of UK landmass (all operators combined)."}
        </p>

        {bbView === "coverage" && (
          <ChartCard
            title="Broadband Coverage (FTTP & Gigabit)"
            subtitle="% of UK premises with full fibre / gigabit"
            source={sourceFrom(raw, "broadband.fttp")}
            views={["coverage", "speeds", "mobile"]}
            viewLabels={{ coverage: "Coverage", speeds: "Speeds", mobile: "Mobile 4G" }}
            activeView={bbView}
            onViewChange={setBbView}
            legend={[
              { key: "fttp", label: "Full Fibre (FTTP)", color: P.teal },
              { key: "gigabit", label: "Gigabit (non-FTTP)", color: P.grey },
            ]}
            height={340}
          >
            <AreaChart data={coverageSeries}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} label={yAxisLabel("Broadband coverage (% of premises)")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="gigabit" stackId="1" stroke={P.grey} fill={P.grey} fillOpacity={0.3} name="Gigabit (non-FTTP)" />
              <Area type="monotone" dataKey="fttp" stackId="0" stroke={P.teal} fill={P.teal} fillOpacity={0.4} name="Full Fibre (FTTP)" />
            </AreaChart>
          </ChartCard>
        )}

        {bbView === "speeds" && (
          <ChartCard
            title="Broadband Speeds"
            subtitle="Average download speeds, UK (Mbit/s)"
            source={sourceFrom(raw, "broadband.speeds")}
            views={["coverage", "speeds", "mobile"]}
            viewLabels={{ coverage: "Coverage", speeds: "Speeds", mobile: "Mobile 4G" }}
            activeView={bbView}
            onViewChange={setBbView}
            legend={[
              { key: "down", label: "Download", color: P.teal },
              { key: "up", label: "Upload", color: P.sienna },
            ]}
            height={340}
          >
            <LineChart data={data.broadband.speeds}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} Mb/s`} label={yAxisLabel("Download speed (Mbit/s)")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v} Mbit/s`} />} />
              <Line type="monotone" dataKey="medianDown" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="Download" />
              <Line type="monotone" dataKey="medianUp" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="Upload" />
            </LineChart>
          </ChartCard>
        )}

        {bbView === "mobile" && (
          <ChartCard
            title="Mobile 4G Coverage"
            subtitle="% geographic coverage by operator, UK"
            source={sourceFrom(raw, "broadband.mobile4g")}
            views={["coverage", "speeds", "mobile"]}
            viewLabels={{ coverage: "Coverage", speeds: "Speeds", mobile: "Mobile 4G" }}
            activeView={bbView}
            onViewChange={setBbView}
            height={340}
          >
            <BarChart data={data.broadband.mobile4g}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[80, 100]} label={yAxisLabel("4G coverage (% of landmass)")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Bar dataKey="landmassPct" fill={P.teal} name="4G landmass coverage" isAnimationActive={false} />
            </BarChart>
          </ChartCard>
        )}
      </section>
    </div>
  );
}
