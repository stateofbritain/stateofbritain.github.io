import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
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

export default function Infrastructure() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bbView, setBbView] = useState("coverage");
  const [railView, setRailView] = useState("journeys");
  const [roadView, setRoadView] = useState("traffic");

  useEffect(() => {
    fetch("/data/infrastructure.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Merge FTTP + gigabit into one series for coverage chart
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

  // Rail journeys from 2000
  const railJourneys = useMemo(() => {
    if (!data?.rail?.journeys) return [];
    return data.rail.journeys.filter((r) => r.year >= 2000);
  }, [data]);

  // Road traffic from 2000
  const roadTraffic = useMemo(() => {
    if (!data?.roads?.traffic) return [];
    return data.roads.traffic.filter((r) => r.year >= 2000);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Infrastructure & Connectivity</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Infrastructure & Connectivity</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestFttp = data.broadband.fttp[data.broadband.fttp.length - 1];
  const latestGigabit = data.broadband.gigabit[data.broadband.gigabit.length - 1];
  const latestSpeed = data.broadband.speeds[data.broadband.speeds.length - 1];
  const latest4g = data.broadband.mobile4g[data.broadband.mobile4g.length - 1];
  const latestPunct = data.rail.punctuality[data.rail.punctuality.length - 1];
  const latestJourneys = data.rail.journeys[data.rail.journeys.length - 1];
  const prePandemic = data.rail.journeys.find((r) => r.year === 2018);
  const recoveryPct = prePandemic
    ? ((latestJourneys.journeysMn / prePandemic.journeysMn) * 100).toFixed(0)
    : null;
  const latestTraffic = data.roads.traffic[data.roads.traffic.length - 1];
  const latestCondition = data.roads.condition[data.roads.condition.length - 1];

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Infrastructure & Connectivity
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Digital connectivity, rail network usage and reliability, and road network condition and traffic volumes.
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard label="FTTP coverage" value={`${latestFttp.pct}%`} sub={`${latestFttp.premises}m premises (${latestFttp.date})`} />
        <MetricCard label="Gigabit-capable" value={`${latestGigabit.pct}%`} sub={latestGigabit.date} />
        <MetricCard label="Rail journeys" value={`${(latestJourneys.journeysMn / 1000).toFixed(2)}bn`} sub={`${latestJourneys.fy} (${recoveryPct}% of pre-Covid)`} />
        <MetricCard label="Rail PPM" value={`${latestPunct.ppm}%`} sub={`On time: ${latestPunct.onTime}% (${latestPunct.fy})`} />
        <MetricCard label="Road traffic" value={`${latestTraffic.totalBnMiles}bn mi`} sub={`${latestTraffic.year}`} />
      </div>

      {/* Section 1: Broadband & Digital */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Broadband & Digital Connectivity</h3>
        <p style={sectionNote}>
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
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={coverageSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="gigabit" stackId="1" stroke={P.grey} fill={P.grey} fillOpacity={0.3} name="Gigabit (non-FTTP)" />
              <Area type="monotone" dataKey="fttp" stackId="0" stroke={P.teal} fill={P.teal} fillOpacity={0.4} name="Full Fibre (FTTP)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {bbView === "speeds" && (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.broadband.speeds}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v} Mb/s`} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v} Mbit/s`} />} />
              <Line type="monotone" dataKey="medianDown" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="Download" />
              <Line type="monotone" dataKey="medianUp" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="Upload" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {bbView === "mobile" && (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.broadband.mobile4g}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[80, 100]} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Bar dataKey="landmassPct" fill={P.teal} name="4G landmass coverage" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Section 2: Rail */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Rail Network</h3>
        <p style={sectionNote}>
          {railView === "journeys"
            ? "Annual passenger journeys in Great Britain (millions). Collapsed during Covid-19 (2020-21: 388m) and has recovered to 1,729m in 2024-25."
            : "Public Performance Measure (PPM): % of trains arriving within 5 minutes (commuter) or 10 minutes (long-distance) of schedule. On Time: within 1 minute."}
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(railView === "journeys")} onClick={() => setRailView("journeys")}>Passenger journeys</button>
          <button style={toggleBtn(railView === "punctuality")} onClick={() => setRailView("punctuality")}>Punctuality</button>
        </div>

        {railView === "journeys" && (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={railJourneys}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: P.textMuted }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}bn`} />
              <Tooltip content={<CustomTooltip labelFormatter={(l) => `FY ${l}`} formatter={(v) => `${v.toLocaleString()}m`} />} />
              <Area type="monotone" dataKey="journeysMn" stroke={P.teal} fill={P.teal} fillOpacity={0.3} name="Journeys (millions)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {railView === "punctuality" && (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.rail.punctuality}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[50, 100]} />
              <Tooltip content={<CustomTooltip labelFormatter={(l) => `FY ${l}`} formatter={(v) => v !== null ? `${v}%` : "n/a"} />} />
              <Line type="monotone" dataKey="ppm" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="PPM" />
              <Line type="monotone" dataKey="onTime" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="On Time" connectNulls />
              <ReferenceLine y={92.5} stroke={P.textLight} strokeDasharray="4 4" label={{ value: "Historic target 92.5%", fontSize: 10, fill: P.textLight, position: "top" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Section 3: Roads */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Road Network</h3>
        <p style={sectionNote}>
          {roadView === "traffic"
            ? "Total road traffic in Great Britain (billion vehicle miles per year). LCV growth reflects e-commerce; car traffic has broadly plateaued since 2019."
            : "Percentage of roads in England where maintenance should be considered, by road classification. Unclassified roads have deteriorated steadily since 2013."}
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(roadView === "traffic")} onClick={() => setRoadView("traffic")}>Traffic volume</button>
          <button style={toggleBtn(roadView === "condition")} onClick={() => setRoadView("condition")}>Road condition</button>
        </div>

        {roadView === "traffic" && (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={roadTraffic}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}bn`} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}bn miles`} />} />
              <Area type="monotone" dataKey="cars" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.4} name="Cars & taxis" />
              <Area type="monotone" dataKey="lcvs" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.4} name="Light commercial" />
              <Area type="monotone" dataKey="buses" stackId="1" stroke={P.yellow} fill={P.yellow} fillOpacity={0.4} name="Buses & coaches" />
              <Area type="monotone" dataKey="hgvs" stackId="1" stroke={P.navy} fill={P.navy} fillOpacity={0.4} name="HGVs" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {roadView === "condition" && (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.roads.condition}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[0, 25]} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="aRoadsPoor" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="A roads" />
              <Line type="monotone" dataKey="bAndcPoor" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="B & C roads" />
              <Line type="monotone" dataKey="unclassifiedPoor" stroke={P.red} strokeWidth={2} dot={{ r: 3 }} name="Unclassified" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Context */}
      <AnalysisBox>
        UK full-fibre broadband coverage reached {latestFttp.pct}% of premises ({latestFttp.premises}m) by {latestFttp.date},
        up from 6% in 2018. Gigabit-capable coverage stands at {latestGigabit.pct}%.
        Median download speeds rose from 37 Mbit/s (2018) to {latestSpeed.medianDown} Mbit/s ({latestSpeed.year}).
        {" "}Rail passenger journeys reached {(latestJourneys.journeysMn / 1000).toFixed(2)} billion in {latestJourneys.fy},
        {recoveryPct && ` ${recoveryPct}% of the pre-pandemic peak.`}
        {" "}PPM punctuality was {latestPunct.ppm}% in {latestPunct.fy}.
        {" "}Road traffic totalled {latestTraffic.totalBnMiles} billion vehicle miles in {latestTraffic.year}.
        {" "}Unclassified road condition continues to deteriorate: {latestCondition.unclassifiedPoor}% now require maintenance
        consideration, up from 14% in 2010.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://www.ofcom.org.uk/research-and-data/telecoms-research/connected-nations" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          Ofcom Connected Nations 2018-2025
        </a>
        {" · "}
        <a href="https://dataportal.orr.gov.uk/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          ORR Data Portal (Table 1220, Rail Performance)
        </a>
        {" · "}
        <a href="https://www.gov.uk/government/statistical-data-sets/road-traffic-statistics-tra" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          DfT TRA0101 & RDC0120
        </a>
      </div>
    </div>
  );
}
