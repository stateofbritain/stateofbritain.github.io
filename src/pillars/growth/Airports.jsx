import { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line,
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
import UKMap from "../../components/UKMap";
import useIsMobile from "../../hooks/useIsMobile";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const AIRPORT_COLORS = {
  heathrow: P.navy,
  gatwick: P.teal,
  manchester: P.sienna,
  stansted: P.red,
  edinburgh: "#7B4B8A",
  luton: P.yellow,
  birmingham: P.grey,
  bristol: "#5B8C5A",
};

function AirportCountTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: P.navy, color: "#fff", padding: "8px 12px", borderRadius: 4,
      fontSize: 12, fontFamily: "'DM Mono', monospace", lineHeight: 1.6, maxWidth: 260,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
      <div>{d.count} airports</div>
      {d.opened && <div style={{ color: P.teal }}>Opened: {d.opened}</div>}
      {d.closed && <div style={{ color: "#ff9b8a" }}>Closed: {d.closed}</div>}
    </div>
  );
}

export default function Airports() {
  const { data, loading, error, raw } = useJsonDataset("airports.json");
  const isMobile = useIsMobile();
  const [trafficView, setTrafficView] = useState("passengers");
  const [capacityView, setCapacityView] = useState("airportCount");

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
  const atmPctOfPeak = ((s.totalATM / s.peakATM) * 100).toFixed(0);

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
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Flights per Day"
          value={s.flightsPerDay?.toLocaleString()}
          change={`${atmPctOfPeak}% of 2007 peak`}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Heathrow Utilisation"
          value={`${s.heathrowUtilPct}%`}
          change={`${Math.round(s.heathrowATM / 1e3)}k of ${Math.round(s.heathrowCap / 1e3)}k cap`}
          color={P.red}
          delay={0.26}
        />
        <MetricCard
          label="Active Airports"
          value={s.numAirports}
          change="reporting to CAA"
          color={P.sienna}
          delay={0.34}
        />
      </div>

      {/* ── Section 1: Traffic over time ──────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Traffic Over Time</h3>
        <p style={SECTION_NOTE}>
          {trafficView === "passengers"
            ? `UK airports handled ${Math.round(s.totalPassengers / 1e6)} million terminal passengers in ${s.totalPassengersYear}, approaching the pre-pandemic peak of ${Math.round(s.prePandemicPeak / 1e6)} million in ${s.prePandemicPeakYear}. Traffic collapsed to 74 million in 2020 before recovering strongly from 2022.`
            : trafficView === "movements"
              ? `Air transport movements peaked at ${(s.peakATM / 1e6).toFixed(2)} million in ${s.peakATMYear} and have not returned to that level. In ${s.totalPassengersYear}, UK airports recorded ${(s.totalATM / 1e6).toFixed(2)} million movements, ${atmPctOfPeak}% of the ${s.peakATMYear} peak. No major new runway capacity has been added.`
              : "Passengers per air transport movement shows aircraft getting larger and fuller over time. In 2005, each flight carried an average of 101 passengers; by 2024 this had risen to 145, reflecting higher load factors and larger aircraft types."}
        </p>

        {trafficView === "passengers" && data.annualPassengers?.length > 0 && (
          <ChartCard
            title="UK Airport Passengers"
            subtitle="Total terminal passengers, all UK airports, annual"
            source={sourceFrom(raw, "annualPassengers")}
            views={["passengers", "movements", "paxPerFlight"]}
            viewLabels={{ passengers: "Passengers", movements: "Flights", paxPerFlight: "Pax / flight" }}
            activeView={trafficView}
            onViewChange={setTrafficView}
            height={340}
          >
            <AreaChart data={data.annualPassengers} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1e6)}m`} label={yAxisLabel("Passengers")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1e6).toFixed(1)}m`} />} />
              <ReferenceLine x={2020} stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "COVID-19", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              <Area type="monotone" dataKey="passengers" name="Passengers" stroke={P.navy} fill={P.navy} fillOpacity={0.12} strokeWidth={2.5} />
            </AreaChart>
          </ChartCard>
        )}

        {trafficView === "movements" && data.annualMovements?.length > 0 && (
          <ChartCard
            title="Air Transport Movements"
            subtitle="Aircraft landings and take-offs, UK airports, annual"
            source={sourceFrom(raw, "annualMovements")}
            views={["passengers", "movements", "paxPerFlight"]}
            viewLabels={{ passengers: "Passengers", movements: "Flights", paxPerFlight: "Pax / flight" }}
            activeView={trafficView}
            onViewChange={setTrafficView}
            height={340}
          >
            <AreaChart data={data.annualMovements} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1e6).toFixed(1)}m`} label={yAxisLabel("Movements")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1e6).toFixed(2)}m (${Math.round(v / 365).toLocaleString()}/day)`} />} />
              <ReferenceLine x={2007} stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "2007 peak", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              <ReferenceLine x={2020} stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "COVID-19", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              <Area type="monotone" dataKey="movements" name="Air transport movements" stroke={P.sienna} fill={P.sienna} fillOpacity={0.12} strokeWidth={2.5} />
            </AreaChart>
          </ChartCard>
        )}

        {trafficView === "paxPerFlight" && data.paxPerFlight?.length > 0 && (
          <ChartCard
            title="Passengers per Flight"
            subtitle="Average passengers per air transport movement, UK"
            source={sourceFrom(raw, "paxPerFlight")}
            views={["passengers", "movements", "paxPerFlight"]}
            viewLabels={{ passengers: "Passengers", movements: "Flights", paxPerFlight: "Pax / flight" }}
            activeView={trafficView}
            onViewChange={setTrafficView}
            height={340}
          >
            <LineChart data={data.paxPerFlight} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, "auto"]} label={yAxisLabel("Passengers per flight")} />
              <Tooltip content={<CustomTooltip formatter={v => `${v} passengers`} />} />
              <ReferenceLine x={2020} stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "COVID-19", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              <Line type="monotone" dataKey="paxPerFlight" name="Pax per flight" stroke={P.teal} strokeWidth={2.5} dot={{ r: 2.5 }} />
            </LineChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 2: Airport Capacity ───────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Airport Capacity</h3>
        <p style={SECTION_NOTE}>
          {capacityView === "airportCount"
            ? "The number of UK airports reporting commercial air transport movements has declined from a peak of 64 in 2005 to 55 in 2024. Recent closures include Doncaster Sheffield (2022), Cambridge and Coventry (2017), and Manston (2014). The only significant opening since 2000 was Doncaster Sheffield in 2005, which itself closed 17 years later."
            : `Movements at the eight busiest UK airports (2014-2024). Heathrow operates at ${s.heathrowUtilPct}% of its declared capacity of ${Math.round(s.heathrowCap / 1e3)}k movements per year, effectively at its two-runway ceiling. No major new runway has been built in the UK in over two decades.`}
        </p>

        {capacityView === "byAirport" && data.airportMovementsTrend?.length > 0 && (
          <ChartCard
            title="Movements by Airport"
            subtitle="Air transport movements at major UK airports, annual (thousands)"
            source={sourceFrom(raw, "airportMovementsTrend")}
            views={["airportCount", "byAirport"]}
            viewLabels={{ airportCount: "Airport count", byAirport: "By airport" }}
            activeView={capacityView}
            onViewChange={setCapacityView}
            legend={[
              { key: "heathrow", label: "Heathrow", color: AIRPORT_COLORS.heathrow },
              { key: "gatwick", label: "Gatwick", color: AIRPORT_COLORS.gatwick },
              { key: "manchester", label: "Manchester", color: AIRPORT_COLORS.manchester },
              { key: "stansted", label: "Stansted", color: AIRPORT_COLORS.stansted },
              { key: "edinburgh", label: "Edinburgh", color: AIRPORT_COLORS.edinburgh },
              { key: "luton", label: "Luton", color: AIRPORT_COLORS.luton },
              { key: "birmingham", label: "Birmingham", color: AIRPORT_COLORS.birmingham },
              { key: "bristol", label: "Bristol", color: AIRPORT_COLORS.bristol },
            ]}
            height={380}
          >
            <LineChart data={data.airportMovementsTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={[2014, 2024]} tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={v => String(v)} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1e3)}k`} label={yAxisLabel("Movements (thousands)")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `${Math.round(v / 1e3).toLocaleString()}k`} />} />
              <ReferenceLine y={s.heathrowCap} stroke={P.red} strokeDasharray="4 4"
                label={{ value: "Heathrow declared cap (480k)", fontSize: 10, fill: P.red, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              {Object.entries(AIRPORT_COLORS).map(([key, color]) => (
                <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={key === "heathrow" ? 2.5 : 1.5} dot={false} name={key.charAt(0).toUpperCase() + key.slice(1)} />
              ))}
            </LineChart>
          </ChartCard>
        )}

        {capacityView === "airportCount" && data.activeAirports?.length > 0 && (
          <ChartCard
            title="Active UK Airports"
            subtitle="Airports reporting commercial air transport movements, 1990-2024"
            source={sourceFrom(raw, "activeAirports")}
            views={["airportCount", "byAirport"]}
            viewLabels={{ airportCount: "Airport count", byAirport: "By airport" }}
            activeView={capacityView}
            onViewChange={setCapacityView}
            height={340}
          >
            <BarChart data={data.activeAirports} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={[1989, 2025]} tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={v => String(v)} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 70]} label={yAxisLabel("Number of airports")} />
              <Tooltip content={<AirportCountTooltip />} />
              <Bar dataKey="count" fill={P.navy} name="Active airports" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 3: Passengers by Airport ──────────────────────────── */}
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

      {/* ── Section 4: Airport Map ───────────────────────────────────── */}
      {data.airportLocations?.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Airport Locations</h3>
          <p style={SECTION_NOTE}>
            Geographic distribution of UK airports by passenger traffic in {s.totalPassengersYear}. Circle
            size is proportional to annual passengers. Aviation capacity is concentrated in London
            and the South East, with six airports within 80km of central London handling over 60% of
            all UK passengers.
          </p>
          <ChartCard
            title="UK Airports by Passenger Traffic"
            subtitle={`Annual passengers, ${s.totalPassengersYear}`}
            source={sourceFrom(raw, "airportLocations")}
          >
            <UKMap
              locations={data.airportLocations}
              valueKey="passengers"
              color={P.teal}
              maxRadius={32}
              renderTooltip={({ location }) => {
                const fmtPax = location.passengers >= 1e6
                  ? `${(location.passengers / 1e6).toFixed(1)}m`
                  : `${Math.round(location.passengers / 1e3).toLocaleString()}k`;
                const fmtMov = location.movements >= 1e6
                  ? `${(location.movements / 1e6).toFixed(1)}m`
                  : `${Math.round(location.movements / 1e3).toLocaleString()}k`;
                return (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: P.parchment }}>
                      {location.airport}
                    </div>
                    <div>{fmtPax} passengers</div>
                    {location.movements > 0 && <div>{fmtMov} flights</div>}
                  </div>
                );
              }}
            />
          </ChartCard>
        </section>
      )}
    </div>
  );
}
