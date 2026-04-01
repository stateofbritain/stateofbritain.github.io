import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine } from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

export default function Rail() {
  const { data, loading, error, raw } = useJsonDataset("infrastructure.json");
  const [railView, setRailView] = useState("journeys");
  const [netView, setNetView] = useState("change");

  const railJourneys = useMemo(() => {
    if (!data?.rail?.journeys) return [];
    return data.rail.journeys.filter((r) => r.year >= 2000);
  }, [data]);

  const networkChange = useMemo(() => {
    if (!data?.rail?.infrastructure) return [];
    const railMap = Object.fromEntries(data.rail.infrastructure.map((r) => [r.year, r]));
    const KM_TO_MI = 0.621371;
    return data.rail.infrastructure
      .filter((r) => r.year >= 1991)
      .sort((a, b) => a.year - b.year)
      .map((r) => {
        const prev = railMap[r.year - 1];
        return {
          year: r.year,
          railChangeMi: prev ? Math.round((r.routeKm - prev.routeKm) * KM_TO_MI) : null,
          railTotalMi: Math.round(r.routeKm * KM_TO_MI),
          railElectMi: r.electRouteKm ? Math.round(r.electRouteKm * KM_TO_MI) : null,
        };
      })
      .filter((r) => r.railChangeMi !== null);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Rail</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Rail</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestPunct = data.rail.punctuality[data.rail.punctuality.length - 1];
  const latestJourneys = data.rail.journeys[data.rail.journeys.length - 1];
  const prePandemic = data.rail.journeys.find((r) => r.year === 2018);
  const recoveryPct = prePandemic
    ? ((latestJourneys.journeysMn / prePandemic.journeysMn) * 100).toFixed(0)
    : null;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Rail</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Passenger journeys, punctuality and network
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Rail journeys" value={`${(latestJourneys.journeysMn / 1000).toFixed(2)}bn`} sub={`${latestJourneys.fy} (${recoveryPct}% of pre-Covid)`} />
        <MetricCard label="Rail PPM" value={`${latestPunct.ppm}%`} sub={latestPunct.fy} />
      </div>

      {/* Journeys & Punctuality */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Passenger Traffic & Punctuality</h3>
        <p style={SECTION_NOTE}>
          {railView === "journeys"
            ? "Annual passenger journeys in Great Britain (millions). Collapsed during Covid-19 (2020-21: 388m) and has recovered to 1,729m in 2024-25."
            : "Public Performance Measure (PPM): weighted average across all operators. A train meets PPM if it arrives within 5 minutes (commuter) or 10 minutes (long-distance) of schedule."}
        </p>

        {railView === "journeys" && (
          <ChartCard
            title="Rail Passenger Journeys"
            subtitle="Annual passenger journeys, Great Britain (billions)"
            source={sourceFrom(raw, "rail.journeys")}
            views={["journeys", "punctuality"]}
            viewLabels={{ journeys: "Passenger journeys", punctuality: "Punctuality" }}
            activeView={railView}
            onViewChange={setRailView}
            height={340}
          >
            <AreaChart data={railJourneys}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fy" tick={AXIS_TICK_MONO} tickLine={false} interval={2} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}bn`} label={yAxisLabel("Passenger journeys (bn)")} />
              <Tooltip content={<CustomTooltip labelFormatter={(l) => `FY ${l}`} formatter={(v) => `${v.toLocaleString()}m`} />} />
              <Area type="monotone" dataKey="journeysMn" stroke={P.teal} fill={P.teal} fillOpacity={0.3} name="Journeys (millions)" />
            </AreaChart>
          </ChartCard>
        )}

        {railView === "punctuality" && (
          <ChartCard
            title="Rail Punctuality (PPM)"
            subtitle="Public performance measure, Great Britain"
            source={sourceFrom(raw, "rail.punctuality")}
            views={["journeys", "punctuality"]}
            viewLabels={{ journeys: "Passenger journeys", punctuality: "Punctuality" }}
            activeView={railView}
            onViewChange={setRailView}
            height={340}
          >
            <LineChart data={data.rail.punctuality}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fy" tick={AXIS_TICK_MONO} tickLine={false} interval={2} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[70, 100]} label={yAxisLabel("% on time (PPM)")} />
              <Tooltip content={<CustomTooltip labelFormatter={(l) => `FY ${l}`} formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="ppm" stroke={P.teal} strokeWidth={2} dot={false} name="PPM" />
              <ReferenceLine y={92.5} stroke={P.textLight} strokeDasharray="4 4" label={{ value: "Historic target 92.5%", fontSize: 11, fill: P.textLight, position: "top" }} />
            </LineChart>
          </ChartCard>
        )}
      </section>

      {/* Network Length */}
      {networkChange.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Rail Network</h3>
          <p style={SECTION_NOTE}>
            {netView === "change"
              ? "Year-on-year change in rail route length in miles. Negative values indicate net closures."
              : "Total rail route open for traffic in Great Britain (miles), and electrified route length."}
          </p>

          {netView === "change" && (
            <ChartCard
              title="Rail Network Length (Annual Change)"
              subtitle="Year-on-year change in rail route, Great Britain (miles)"
              source={sourceFrom(raw, "rail.infrastructure")}
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
                <Bar dataKey="railChangeMi" fill={P.sienna} name="Rail route" isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}

          {netView === "total" && (
            <ChartCard
              title="Total Rail Network"
              subtitle="Route open for traffic, Great Britain (miles)"
              source={sourceFrom(raw, "rail.infrastructure")}
              views={["change", "total"]}
              viewLabels={{ change: "Annual change", total: "Total network" }}
              activeView={netView}
              onViewChange={setNetView}
              legend={[
                { key: "rail", label: "Rail route", color: P.sienna },
                { key: "elect", label: "Electrified", color: P.yellow },
              ]}
              height={340}
            >
              <LineChart data={networkChange}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Miles")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()} mi`} />} />
                <Line type="monotone" dataKey="railTotalMi" stroke={P.sienna} strokeWidth={2} dot={false} name="Rail route" />
                <Line type="monotone" dataKey="railElectMi" stroke={P.yellow} strokeWidth={2} dot={false} name="Electrified" connectNulls />
              </LineChart>
            </ChartCard>
          )}
        </section>
      )}
    </div>
  );
}
