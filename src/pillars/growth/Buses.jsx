import { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
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

export default function Buses() {
  const { data, loading, error, raw } = useJsonDataset("buses.json");
  const isMobile = useIsMobile();
  const [journeyView, setJourneyView] = useState("regional");

  // Compute outside-London total for the metric card
  const outsideLondon = useMemo(() => {
    if (!data?.journeysByRegion) return null;
    const latest = data.journeysByRegion[data.journeysByRegion.length - 1];
    if (!latest) return null;
    return Math.round((latest.total - latest.london) * 10) / 10;
  }, [data]);

  // Compute fare growth vs CPI for metric card
  const fareGrowth = useMemo(() => {
    if (!data?.faresIndex?.length) return null;
    const latest = data.faresIndex[data.faresIndex.length - 1];
    return {
      gb: Math.round(latest.gb - 100),
      cpi: Math.round(latest.cpi - 100),
    };
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Buses</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Buses</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;
  const regional = data.journeysByRegion ?? [];
  const historical = data.journeysHistorical ?? [];
  const fares = data.faresIndex ?? [];
  const fleet = data.fleetSize ?? [];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Buses</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Passenger journeys, fares, and fleet size
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total journeys (GB)"
          value={`${(s.latestTotal / 1000).toFixed(1)}bn`}
          change={s.latestYear}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="London"
          value={`${(s.latestLondon / 1000).toFixed(1)}bn`}
          change={`${Math.round(s.latestLondon / s.latestTotal * 100)}% of total`}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Outside London"
          value={outsideLondon ? `${(outsideLondon / 1000).toFixed(1)}bn` : "—"}
          change={s.latestYear}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="Fleet size (GB)"
          value={s.latestFleet.toLocaleString()}
          change="buses"
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* ── Section 1: Passenger Journeys ─────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Passenger Journeys</h3>
        <p style={SECTION_NOTE}>
          {journeyView === "regional"
            ? `Bus passenger journeys by area from 2004/05 to ${s.latestYear}. London accounts for ${Math.round(s.latestLondon / s.latestTotal * 100)}% of all GB bus journeys. Outside London, patronage in English metropolitan and non-metropolitan areas, Scotland, and Wales has declined since the mid-2000s.`
            : `Long-run bus patronage in Great Britain from 1949/50 to 2004/05. Bus use peaked at over 13 billion journeys in the mid-1950s and declined steadily through the second half of the 20th century, driven by rising car ownership.`}
        </p>

        {journeyView === "regional" && regional.length > 0 && (
          <ChartCard
            title="Passenger Journeys by Area"
            subtitle="Millions, Great Britain"
            source={sourceFrom(raw, "journeysByRegion")}
            views={["regional", "historical"]}
            viewLabels={{ regional: "By area", historical: "Since 1950" }}
            activeView={journeyView}
            onViewChange={setJourneyView}
            legend={[
              { key: "london", label: "London", color: P.navy },
              { key: "englishMetro", label: "English metro", color: P.sienna },
              { key: "englishNonMetro", label: "English non-metro", color: P.teal },
              { key: "scotland", label: "Scotland", color: P.red },
              { key: "wales", label: "Wales", color: P.yellow },
            ]}
            height={380}
          >
            <AreaChart data={regional} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}m`} domain={[0, "auto"]} label={yAxisLabel("millions")} />
              <Tooltip content={<CustomTooltip formatter={v => `${v.toFixed(1)}m`} />} />
              <Area type="monotone" dataKey="london" stackId="1" stroke={P.navy} fill={P.navy} fillOpacity={0.3} name="London" />
              <Area type="monotone" dataKey="englishMetro" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.3} name="English metro" />
              <Area type="monotone" dataKey="englishNonMetro" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.3} name="English non-metro" />
              <Area type="monotone" dataKey="scotland" stackId="1" stroke={P.red} fill={P.red} fillOpacity={0.3} name="Scotland" />
              <Area type="monotone" dataKey="wales" stackId="1" stroke={P.yellow} fill={P.yellow} fillOpacity={0.3} name="Wales" />
            </AreaChart>
          </ChartCard>
        )}

        {journeyView === "historical" && historical.length > 0 && (
          <ChartCard
            title="Bus Patronage Since 1950"
            subtitle="Millions of journeys, Great Britain"
            source={sourceFrom(raw, "journeysHistorical")}
            views={["regional", "historical"]}
            viewLabels={{ regional: "By area", historical: "Since 1950" }}
            activeView={journeyView}
            onViewChange={setJourneyView}
            height={380}
          >
            <AreaChart data={historical} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} interval={isMobile ? 8 : 4} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}bn`} domain={[0, "auto"]} label={yAxisLabel("billions")} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1000).toFixed(1)}bn`} />} />
              <Area type="monotone" dataKey="total" stroke={P.navy} fill={P.navy} fillOpacity={0.15} strokeWidth={2} name="GB total" />
            </AreaChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 2: Fares vs Inflation ─────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Bus Fares vs Inflation</h3>
        <p style={SECTION_NOTE}>
          Quarterly bus fares index (March 2005 = 100) compared with CPI general inflation. Since 2005, bus fares across Great Britain have risen {fareGrowth ? `${fareGrowth.gb}%` : "—"} compared with {fareGrowth ? `${fareGrowth.cpi}%` : "—"} for general prices. Fares outside London have risen faster than in London.
        </p>

        <ChartCard
          title="Bus Fares Index"
          subtitle="Index (March 2005 = 100), quarterly"
          source={sourceFrom(raw, "faresIndex")}
          legend={[
            { key: "englandOutsideLondon", label: "England outside London", color: P.red },
            { key: "london", label: "London", color: P.navy },
            { key: "cpi", label: "CPI (all items)", color: P.grey },
          ]}
          height={380}
        >
          <LineChart data={fares} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[80, "auto"]} label={yAxisLabel("index")} />
            <Tooltip content={<CustomTooltip formatter={v => v.toFixed(1)} />} />
            <Line type="monotone" dataKey="englandOutsideLondon" stroke={P.red} strokeWidth={2} dot={false} name="England outside London" />
            <Line type="monotone" dataKey="london" stroke={P.navy} strokeWidth={2} dot={false} name="London" />
            <Line type="monotone" dataKey="cpi" stroke={P.grey} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="CPI" />
          </LineChart>
        </ChartCard>
      </section>

      {/* ── Section 3: Fleet Size ─────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Fleet Size</h3>
        <p style={SECTION_NOTE}>
          Number of buses registered in Great Britain by area, from 2004/05 to {s.latestYear}. The total fleet fell from {fleet[0] ? fleet[0].total.toLocaleString() : "—"} to {s.latestFleet.toLocaleString()} over the period. London's fleet has remained broadly stable while fleets outside London have contracted.
        </p>

        <ChartCard
          title="Bus Fleet by Area"
          subtitle="Number of vehicles, Great Britain"
          source={sourceFrom(raw, "fleetSize")}
          legend={[
            { key: "london", label: "London", color: P.navy },
            { key: "englishMetro", label: "English metro", color: P.sienna },
            { key: "englishNonMetro", label: "English non-metro", color: P.teal },
            { key: "scotland", label: "Scotland", color: P.red },
            { key: "wales", label: "Wales", color: P.yellow },
          ]}
          height={380}
        >
          <AreaChart data={fleet} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} interval={isMobile ? 4 : 2} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} domain={[0, "auto"]} label={yAxisLabel("vehicles")} />
            <Tooltip content={<CustomTooltip formatter={v => v.toLocaleString()} />} />
            <Area type="monotone" dataKey="london" stackId="1" stroke={P.navy} fill={P.navy} fillOpacity={0.3} name="London" />
            <Area type="monotone" dataKey="englishMetro" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.3} name="English metro" />
            <Area type="monotone" dataKey="englishNonMetro" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.3} name="English non-metro" />
            <Area type="monotone" dataKey="scotland" stackId="1" stroke={P.red} fill={P.red} fillOpacity={0.3} name="Scotland" />
            <Area type="monotone" dataKey="wales" stackId="1" stroke={P.yellow} fill={P.yellow} fillOpacity={0.3} name="Wales" />
          </AreaChart>
        </ChartCard>
      </section>
    </div>
  );
}
