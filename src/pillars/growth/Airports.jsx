import { useMemo } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import useIsMobile from "../../hooks/useIsMobile";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

export default function Airports() {
  const { data, loading, error, raw } = useJsonDataset("airports.json");
  const isMobile = useIsMobile();

  const top15 = useMemo(() => {
    if (!data?.passengersByAirport) return [];
    return data.passengersByAirport
      .slice(0, 15)
      .map(d => ({
        airport: d.airport.replace(/ \(.*\)/, "").split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" "),
        passengers: d.passengers,
      }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Airports</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Airports</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Airports</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          UK aviation traffic and capacity
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total Passengers"
          value={`${Math.round(s.totalPassengers / 1e6)}m`}
          change="2024"
          up={true}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Flights per Day"
          value={s.flightsPerDay?.toLocaleString()}
          change="2024"
          up={true}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Airports"
          value={s.numAirports}
          change="reporting to CAA"
          up={false}
          color={P.sienna}
          delay={0.26}
        />
      </div>

      {/* ── Section 1: Total Passengers ───────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Total Passengers</h3>
        <p style={SECTION_NOTE}>
          UK airports handled {Math.round(s.totalPassengers / 1e6)} million terminal passengers
          in {s.totalPassengersYear}, approaching the pre-pandemic peak of {Math.round(s.prePandemicPeak / 1e6)} million
          in {s.prePandemicPeakYear}. Traffic collapsed to 74 million in 2020 and 64 million in 2021
          before recovering strongly from 2022.
        </p>

        {data.annualPassengers?.length > 0 && (
          <ChartCard
            title="UK Airport Passengers"
            subtitle="Total terminal passengers, all UK airports, annual"
            source={sourceFrom(raw, "annualPassengers")}
            height={340}
          >
            <AreaChart data={data.annualPassengers} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1e6)}m`} label={yAxisLabel("Passengers")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1e6).toFixed(1)}m`} />} />
              <ReferenceLine x={2020} stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "COVID-19", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              <Area type="monotone" dataKey="passengers" name="Passengers" stroke={P.navy} fill={P.navy} fillOpacity={0.12} strokeWidth={2.5} />
            </AreaChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 2: Passengers by Airport ──────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Passengers by Airport</h3>
        <p style={SECTION_NOTE}>
          Heathrow dominates UK aviation with {Math.round(s.heathrowPassengers / 1e6)} million passengers
          in {s.totalPassengersYear}, accounting for {Math.round(s.heathrowPassengers / s.totalPassengers * 100)}% of
          all UK airport traffic. The six London airports (Heathrow, Gatwick, Stansted, Luton,
          London City, Southend) together handle over 60% of UK passengers. {s.numAirports} airports
          reported commercial passenger traffic to the CAA in {s.totalPassengersYear}.
        </p>

        {top15.length > 0 && (
          <ChartCard
            title="Top 15 UK Airports by Passengers"
            subtitle={`Million passengers, ${s.totalPassengersYear}`}
            source={sourceFrom(raw, "passengersByAirport")}
            height={420}
          >
            <BarChart data={top15} layout="vertical" margin={{ top: 5, right: 10, left: isMobile ? 60 : 90, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={v => `${Math.round(v / 1e6)}m`} domain={[0, "auto"]} />
              <YAxis type="category" dataKey="airport" tick={{ ...AXIS_TICK_MONO, fontSize: 10 }} axisLine={false} tickLine={false} width={isMobile ? 55 : 85} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1e6).toFixed(1)}m`} />} />
              <Bar dataKey="passengers" name="Passengers" fill={P.teal} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartCard>
        )}
      </section>
    </div>
  );
}
