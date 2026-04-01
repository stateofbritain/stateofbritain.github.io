import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, CHART_TITLE, CHART_SUBTITLE, AXIS_TICK, yAxisLabel, GRID_PROPS, toggleBtn } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ShareableChart from "../../components/ShareableChart";
import { useJsonDataset } from "../../hooks/useDataset";

export default function Broadband() {
  const { data, loading, error } = useJsonDataset("infrastructure.json");
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
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(bbView === "coverage")} onClick={() => setBbView("coverage")}>Coverage</button>
          <button style={toggleBtn(bbView === "speeds")} onClick={() => setBbView("speeds")}>Speeds</button>
          <button style={toggleBtn(bbView === "mobile")} onClick={() => setBbView("mobile")}>Mobile 4G</button>
        </div>

        {bbView === "coverage" && (
          <ShareableChart title="Broadband Coverage (FTTP & Gigabit)">
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Broadband Coverage (FTTP & Gigabit)</div>
              <div style={CHART_SUBTITLE}>% of UK premises with full fibre / gigabit</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={coverageSeries}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} domain={[0, 100]} label={yAxisLabel("Broadband coverage (% of premises)")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                <Area type="monotone" dataKey="gigabit" stackId="1" stroke={P.grey} fill={P.grey} fillOpacity={0.3} name="Gigabit (non-FTTP)" />
                <Area type="monotone" dataKey="fttp" stackId="0" stroke={P.teal} fill={P.teal} fillOpacity={0.4} name="Full Fibre (FTTP)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </ShareableChart>
        )}

        {bbView === "speeds" && (
          <ShareableChart title="Broadband Speeds">
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Broadband Speeds</div>
              <div style={CHART_SUBTITLE}>Average download speeds, UK (Mbit/s)</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={data.broadband.speeds}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v} Mb/s`} label={yAxisLabel("Download speed (Mbit/s)")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} Mbit/s`} />} />
                <Line type="monotone" dataKey="medianDown" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="Download" />
                <Line type="monotone" dataKey="medianUp" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="Upload" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </ShareableChart>
        )}

        {bbView === "mobile" && (
          <ShareableChart title="Mobile 4G Coverage">
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Mobile 4G Coverage</div>
              <div style={CHART_SUBTITLE}>% geographic coverage by operator, UK</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={data.broadband.mobile4g}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} domain={[80, 100]} label={yAxisLabel("4G coverage (% of landmass)")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                <Bar dataKey="landmassPct" fill={P.teal} name="4G landmass coverage" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </ShareableChart>
        )}
      </section>

      <div style={{ marginTop: 24, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://www.ofcom.org.uk/research-and-data/telecoms-research/connected-nations" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          Ofcom Connected Nations 2018-2025
        </a>
      </div>
    </div>
  );
}
