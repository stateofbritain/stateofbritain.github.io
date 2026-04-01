import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend } from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

export default function Roads() {
  const { data, loading, error, raw } = useJsonDataset("infrastructure.json");
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

        {roadView === "traffic" && (
          <ChartCard
            title="Road Traffic Volume"
            subtitle="Billion vehicle miles, Great Britain"
            source={sourceFrom(raw, "roads.traffic")}
            views={["traffic", "condition", "potholes"]}
            viewLabels={{ traffic: "Traffic volume", condition: "Road condition", potholes: "Potholes" }}
            activeView={roadView}
            onViewChange={setRoadView}
            legend={[
              { key: "cars", label: "Cars & taxis", color: P.teal },
              { key: "lcvs", label: "Light commercial", color: P.sienna },
              { key: "buses", label: "Buses & coaches", color: P.yellow },
              { key: "hgvs", label: "HGVs", color: P.navy },
            ]}
            height={340}
          >
            <AreaChart data={roadTraffic}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}bn`} label={yAxisLabel("Bn vehicle miles")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}bn miles`} />} />
              <Area type="monotone" dataKey="cars" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.4} name="Cars & taxis" />
              <Area type="monotone" dataKey="lcvs" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.4} name="Light commercial" />
              <Area type="monotone" dataKey="buses" stackId="1" stroke={P.yellow} fill={P.yellow} fillOpacity={0.4} name="Buses & coaches" />
              <Area type="monotone" dataKey="hgvs" stackId="1" stroke={P.navy} fill={P.navy} fillOpacity={0.4} name="HGVs" />
            </AreaChart>
          </ChartCard>
        )}

        {roadView === "condition" && (
          <ChartCard
            title="Road Condition"
            subtitle="% of roads in need of maintenance, England"
            source={sourceFrom(raw, "roads.condition")}
            views={["traffic", "condition", "potholes"]}
            viewLabels={{ traffic: "Traffic volume", condition: "Road condition", potholes: "Potholes" }}
            activeView={roadView}
            onViewChange={setRoadView}
            legend={[
              { key: "a", label: "A roads", color: P.teal },
              { key: "bc", label: "B & C roads", color: P.sienna },
              { key: "u", label: "Unclassified", color: P.red },
            ]}
            height={340}
          >
            <LineChart data={data.roads.condition}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 25]} label={yAxisLabel("% needing maintenance")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="aRoadsPoor" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} name="A roads" />
              <Line type="monotone" dataKey="bAndcPoor" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="B & C roads" />
              <Line type="monotone" dataKey="unclassifiedPoor" stroke={P.red} strokeWidth={2} dot={{ r: 3 }} name="Unclassified" />
            </LineChart>
          </ChartCard>
        )}

        {roadView === "potholes" && data.roads.potholes && (
          <ChartCard
            title="Potholes & Maintenance Backlog"
            subtitle="Local authority road repair backlog, England"
            source={sourceFrom(raw, "roads.potholes")}
            views={["traffic", "condition", "potholes"]}
            viewLabels={{ traffic: "Traffic volume", condition: "Road condition", potholes: "Potholes" }}
            activeView={roadView}
            onViewChange={setRoadView}
          >
            <div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data.roads.potholes}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} domain={[0, 3]} tickFormatter={(v) => `${v}m`} label={yAxisLabel("Potholes filled (m)")} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} domain={[0, 20]} tickFormatter={(v) => `£${v}bn`} label={yAxisLabel("Backlog (£bn)", { angle: 90, position: "insideRight" })} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="filled" fill={P.sienna} fillOpacity={0.7} name="Potholes filled (millions)" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="backlogBn" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} name="Maintenance backlog (£bn)" />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
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

          {netView === "change" && (
            <ChartCard
              title="Road Network Length (Annual Change)"
              subtitle="Year-on-year change in major road network, England (miles)"
              source={sourceFrom(raw, "roads.length")}
              views={["change", "total"]}
              viewLabels={{ change: "Annual change", total: "Total network" }}
              activeView={netView}
              onViewChange={setNetView}
              height={340}
            >
              <BarChart data={networkChange}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} label={yAxisLabel("Miles (annual change)")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} mi`} />} />
                <ReferenceLine y={0} stroke={P.textLight} />
                <Bar dataKey="roadChangeMi" fill={P.teal} name="Major roads" isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}

          {netView === "total" && (
            <ChartCard
              title="Total Road Network Length"
              subtitle="Major roads (motorways + A roads), England (miles)"
              source={sourceFrom(raw, "roads.length")}
              views={["change", "total"]}
              viewLabels={{ change: "Annual change", total: "Total network" }}
              activeView={netView}
              onViewChange={setNetView}
              height={340}
            >
              <LineChart data={networkChange}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Miles")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()} mi`} />} />
                <Line type="monotone" dataKey="roadTotalMi" stroke={P.teal} strokeWidth={2} dot={false} name="Major roads" />
              </LineChart>
            </ChartCard>
          )}
        </section>
      )}
    </div>
  );
}
