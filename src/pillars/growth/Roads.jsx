import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend } from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, CHART_TITLE, CHART_SUBTITLE, AXIS_TICK, yAxisLabel, GRID_PROPS, toggleBtn } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ShareableChart from "../../components/ShareableChart";
import { useJsonDataset } from "../../hooks/useDataset";

export default function Roads() {
  const { data, loading, error } = useJsonDataset("infrastructure.json");
  const [roadView, setRoadView] = useState("traffic");
  const [netView, setNetView] = useState("change");

  const roadTraffic = useMemo(() => {
    if (!data?.roads?.traffic) return [];
    return data.roads.traffic.filter((r) => r.year >= 2000);
  }, [data]);

  const networkChange = useMemo(() => {
    if (!data?.roads?.length) return [];
    const roadMap = Object.fromEntries(data.roads.length.map((r) => [r.year, r]));
    const KM_TO_MI = 0.621371;
    return data.roads.length
      .filter((r) => r.year >= 1991)
      .sort((a, b) => a.year - b.year)
      .map((r) => {
        const prev = roadMap[r.year - 1];
        return {
          year: r.year,
          roadChangeMi: prev ? Math.round((r.allMajorKm - prev.allMajorKm) * KM_TO_MI) : null,
          roadTotalMi: Math.round(r.allMajorKm * KM_TO_MI),
        };
      })
      .filter((r) => r.roadChangeMi !== null);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Roads</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Roads</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestTraffic = data.roads.traffic[data.roads.traffic.length - 1];
  const latestCondition = data.roads.condition[data.roads.condition.length - 1];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Roads</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Traffic volumes, road condition and maintenance
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Road traffic" value={`${latestTraffic.totalBnMiles}bn mi`} sub={`${latestTraffic.year}`} />
        <MetricCard label="A roads poor" value={`${latestCondition.aRoadsPoor}%`} sub={`${latestCondition.year}`} />
        <MetricCard label="Unclassified poor" value={`${latestCondition.unclassifiedPoor}%`} sub={`${latestCondition.year}`} />
      </div>

      {/* Traffic, Condition, Potholes */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Road Traffic & Condition</h3>
        <p style={SECTION_NOTE}>
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
          <ShareableChart title="Road Traffic Volume">
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Road Traffic Volume</div>
              <div style={CHART_SUBTITLE}>Billion vehicle miles, Great Britain</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={roadTraffic}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}bn`} label={yAxisLabel("Bn vehicle miles")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}bn miles`} />} />
                <Area type="monotone" dataKey="cars" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.4} name="Cars & taxis" />
                <Area type="monotone" dataKey="lcvs" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.4} name="Light commercial" />
                <Area type="monotone" dataKey="buses" stackId="1" stroke={P.yellow} fill={P.yellow} fillOpacity={0.4} name="Buses & coaches" />
                <Area type="monotone" dataKey="hgvs" stackId="1" stroke={P.navy} fill={P.navy} fillOpacity={0.4} name="HGVs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </ShareableChart>
        )}

        {roadView === "condition" && (
          <ShareableChart title="Road Condition">
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Road Condition</div>
              <div style={CHART_SUBTITLE}>% of roads in need of maintenance, England</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={data.roads.condition}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} domain={[0, 25]} label={yAxisLabel("% needing maintenance")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                <Line type="monotone" dataKey="aRoadsPoor" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="A roads" />
                <Line type="monotone" dataKey="bAndcPoor" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="B & C roads" />
                <Line type="monotone" dataKey="unclassifiedPoor" stroke={P.red} strokeWidth={2} dot={{ r: 3 }} name="Unclassified" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </ShareableChart>
        )}

        {roadView === "potholes" && data.roads.potholes && (
          <ShareableChart title="Potholes & Maintenance Backlog">
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Potholes & Maintenance Backlog</div>
              <div style={CHART_SUBTITLE}>Local authority road repair backlog</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={data.roads.potholes}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis yAxisId="left" tick={AXIS_TICK} domain={[0, 3]} tickFormatter={(v) => `${v}m`} label={yAxisLabel("Potholes filled (m)")} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} domain={[0, 20]} tickFormatter={(v) => `£${v}bn`} label={yAxisLabel("Backlog (£bn)", { angle: 90, position: "insideRight" })} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="filled" fill={P.sienna} fillOpacity={0.7} name="Potholes filled (millions)" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="backlogBn" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} name="Maintenance backlog (£bn)" />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          </ShareableChart>
        )}
      </section>

      {/* Network Length */}
      {networkChange.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Road Network Length</h3>
          <p style={SECTION_NOTE}>
            {netView === "change"
              ? "Year-on-year change in major road network length in miles. Negative values indicate net closures or reclassification."
              : "Total major road network length in miles (motorways + A roads) in England."}
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button style={toggleBtn(netView === "change")} onClick={() => setNetView("change")}>Annual change</button>
            <button style={toggleBtn(netView === "total")} onClick={() => setNetView("total")}>Total network</button>
          </div>

          {netView === "change" && (
            <ShareableChart title="Road Network Length (Annual Change)">
            <div>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Road Network Length (Annual Change)</div>
                <div style={CHART_SUBTITLE}>Year-on-year change in major road network, England (miles)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={networkChange}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} label={yAxisLabel("Miles (annual change)")} />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v} mi`} />} />
                  <ReferenceLine y={0} stroke={P.textLight} />
                  <Bar dataKey="roadChangeMi" fill={P.teal} name="Major roads" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </ShareableChart>
          )}

          {netView === "total" && (
            <ShareableChart title="Total Road Network Length">
            <div>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Total Road Network Length</div>
                <div style={CHART_SUBTITLE}>Major roads (motorways + A roads), England (miles)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={networkChange}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Miles")} />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()} mi`} />} />
                  <Line type="monotone" dataKey="roadTotalMi" stroke={P.teal} strokeWidth={2} dot={false} name="Major roads" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </ShareableChart>
          )}
        </section>
      )}

      <div style={{ marginTop: 24, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://www.gov.uk/government/statistical-data-sets/road-traffic-statistics-tra" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          DfT TRA0101, RDL0203 & RDC0120
        </a>
      </div>
    </div>
  );
}
