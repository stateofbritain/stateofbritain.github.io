import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
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
  const [netView, setNetView] = useState("change");

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

  // Network length year-on-year change (km added/removed)
  const networkChange = useMemo(() => {
    if (!data?.roads?.length || !data?.rail?.infrastructure) return [];
    const roadMap = Object.fromEntries(data.roads.length.map((r) => [r.year, r]));
    const railMap = Object.fromEntries(data.rail.infrastructure.map((r) => [r.year, r]));
    const years = [...new Set([...data.roads.length.map((r) => r.year), ...data.rail.infrastructure.map((r) => r.year)])]
      .filter((y) => y >= 1991)
      .sort();
    return years.map((y) => {
      const KM_TO_MI = 0.621371;
      const roadCurr = roadMap[y]?.allMajorKm;
      const roadPrev = roadMap[y - 1]?.allMajorKm;
      const railCurr = railMap[y]?.routeKm;
      const railPrev = railMap[y - 1]?.routeKm;
      return {
        year: y,
        roadChangeMi: roadCurr && roadPrev ? Math.round((roadCurr - roadPrev) * KM_TO_MI) : null,
        railChangeMi: railCurr && railPrev ? Math.round((railCurr - railPrev) * KM_TO_MI) : null,
        roadTotalMi: roadMap[y]?.allMajorKm ? Math.round(roadMap[y].allMajorKm * KM_TO_MI) : null,
        railTotalMi: railMap[y]?.routeKm ? Math.round(railMap[y].routeKm * KM_TO_MI) : null,
        railElectMi: railMap[y]?.electRouteKm ? Math.round(railMap[y].electRouteKm * KM_TO_MI) : null,
      };
    }).filter((r) => r.roadChangeMi !== null || r.railChangeMi !== null);
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
        <MetricCard label="Road traffic" value={`${latestTraffic.totalBnMiles}bn mi`} sub={`${latestTraffic.year}`} />
        <MetricCard label="Rail journeys" value={`${(latestJourneys.journeysMn / 1000).toFixed(2)}bn`} sub={`${latestJourneys.fy} (${recoveryPct}% of pre-Covid)`} />
        <MetricCard label="Rail PPM" value={`${latestPunct.ppm}%`} sub={latestPunct.fy} />
        <MetricCard label="FTTP coverage" value={`${latestFttp.pct}%`} sub={`${latestFttp.premises}m premises (${latestFttp.date})`} />
        <MetricCard label="Gigabit-capable" value={`${latestGigabit.pct}%`} sub={latestGigabit.date} />
      </div>

      {/* Section 1: Roads */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Road Network</h3>
        <p style={sectionNote}>
          {roadView === "traffic"
            ? "Total road traffic in Great Britain (billion vehicle miles per year). LCV growth reflects e-commerce; car traffic has broadly plateaued since 2019."
            : roadView === "condition"
              ? "Percentage of roads in England where maintenance should be considered, by road classification. Unclassified roads have deteriorated steadily since 2013."
              : "Potholes filled annually by English local authorities (millions) and the estimated maintenance backlog (£bn). Despite filling over 2m potholes a year, the backlog continues to grow."}
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(roadView === "traffic")} onClick={() => setRoadView("traffic")}>Traffic volume</button>
          <button style={toggleBtn(roadView === "condition")} onClick={() => setRoadView("condition")}>Road condition</button>
          <button style={toggleBtn(roadView === "potholes")} onClick={() => setRoadView("potholes")}>Potholes</button>
        </div>

        {roadView === "traffic" && (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={roadTraffic}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}bn`} label={{ value: "Bn vehicle miles", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
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
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[0, 25]} label={{ value: "% needing maintenance", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="aRoadsPoor" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="A roads" />
              <Line type="monotone" dataKey="bAndcPoor" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="B & C roads" />
              <Line type="monotone" dataKey="unclassifiedPoor" stroke={P.red} strokeWidth={2} dot={{ r: 3 }} name="Unclassified" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {roadView === "potholes" && data.roads.potholes && (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data.roads.potholes}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 3]} tickFormatter={(v) => `${v}m`} label={{ value: "Potholes filled (m)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 20]} tickFormatter={(v) => `£${v}bn`} label={{ value: "Backlog (£bn)", angle: 90, position: "insideRight", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="filled" fill={P.sienna} fillOpacity={0.7} name="Potholes filled (millions)" radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="backlogBn" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} name="Maintenance backlog (£bn)" />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Section 2: Network Length */}
      {networkChange.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={sectionHeading}>Network Length</h3>
          <p style={sectionNote}>
            {netView === "change"
              ? "Year-on-year change in road (major roads) and rail network length in miles. Negative values indicate net closures or reclassification."
              : "Total network length in miles: major roads (motorways + A roads) and rail route open for traffic in Great Britain."}
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button style={toggleBtn(netView === "change")} onClick={() => setNetView("change")}>Annual change (km)</button>
            <button style={toggleBtn(netView === "total")} onClick={() => setNetView("total")}>Total network</button>
          </div>

          {netView === "change" && (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={networkChange}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
                <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}`} label={{ value: "Miles (annual change)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} mi`} />} />
                <ReferenceLine y={0} stroke={P.textLight} />
                <Bar dataKey="roadChangeMi" fill={P.teal} name="Major roads" isAnimationActive={false} />
                <Bar dataKey="railChangeMi" fill={P.sienna} name="Rail route" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {netView === "total" && (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={networkChange}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
                <YAxis yAxisId="road" tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} label={{ value: "Major roads (miles)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
                <YAxis yAxisId="rail" orientation="right" tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} label={{ value: "Rail route (miles)", angle: 90, position: "insideRight", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()} mi`} />} />
                <Line yAxisId="road" type="monotone" dataKey="roadTotalMi" stroke={P.teal} strokeWidth={2} dot={false} name="Major roads (mi)" />
                <Line yAxisId="rail" type="monotone" dataKey="railTotalMi" stroke={P.sienna} strokeWidth={2} dot={false} name="Rail route (mi)" />
                <Line yAxisId="rail" type="monotone" dataKey="railElectMi" stroke={P.yellow} strokeWidth={2} dot={false} name="Electrified rail (mi)" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>
      )}

      {/* Section 3: Rail */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Rail Network</h3>
        <p style={sectionNote}>
          {railView === "journeys"
            ? "Annual passenger journeys in Great Britain (millions). Collapsed during Covid-19 (2020-21: 388m) and has recovered to 1,729m in 2024-25."
            : "Public Performance Measure (PPM): weighted average across all operators. A train meets PPM if it arrives within 5 minutes (commuter) or 10 minutes (long-distance) of schedule."}
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
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}bn`} label={{ value: "Journeys (bn)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip labelFormatter={(l) => `FY ${l}`} formatter={(v) => `${v.toLocaleString()}m`} />} />
              <Area type="monotone" dataKey="journeysMn" stroke={P.teal} fill={P.teal} fillOpacity={0.3} name="Journeys (millions)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {railView === "punctuality" && (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.rail.punctuality}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: P.textMuted }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[70, 100]} label={{ value: "% on time (PPM)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip labelFormatter={(l) => `FY ${l}`} formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="ppm" stroke={P.teal} strokeWidth={2} dot={false} name="PPM" />
              <ReferenceLine y={92.5} stroke={P.textLight} strokeDasharray="4 4" label={{ value: "Historic target 92.5%", fontSize: 10, fill: P.textLight, position: "top" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Section 3: Broadband & Digital */}
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
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} label={{ value: "% of premises", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
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
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v} Mb/s`} label={{ value: "Mbit/s", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
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
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[80, 100]} label={{ value: "% landmass", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Bar dataKey="landmassPct" fill={P.teal} name="4G landmass coverage" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Context */}
      <AnalysisBox>
        Road traffic totalled {latestTraffic.totalBnMiles} billion vehicle miles in {latestTraffic.year}.
        {" "}Unclassified road condition continues to deteriorate: {latestCondition.unclassifiedPoor}% now require maintenance
        consideration, up from 14% in 2010.
        {" "}Rail passenger journeys reached {(latestJourneys.journeysMn / 1000).toFixed(2)} billion in {latestJourneys.fy},
        {recoveryPct && ` ${recoveryPct}% of the pre-pandemic peak.`}
        {" "}PPM punctuality was {latestPunct.ppm}% in {latestPunct.fy}.
        {" "}UK full-fibre broadband coverage reached {latestFttp.pct}% of premises ({latestFttp.premises}m) by {latestFttp.date},
        up from 6% in 2018. Gigabit-capable coverage stands at {latestGigabit.pct}%.
        Median download speeds rose from 37 Mbit/s (2018) to {latestSpeed.medianDown} Mbit/s ({latestSpeed.year}).
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://www.ofcom.org.uk/research-and-data/telecoms-research/connected-nations" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          Ofcom Connected Nations 2018-2025
        </a>
        {" · "}
        <a href="https://dataportal.orr.gov.uk/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          ORR Data Portal (Tables 3103, 1220, 6320)
        </a>
        {" · "}
        <a href="https://www.gov.uk/government/statistical-data-sets/road-traffic-statistics-tra" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          DfT TRA0101, RDL0203 & RDC0120
        </a>
      </div>
    </div>
  );
}
