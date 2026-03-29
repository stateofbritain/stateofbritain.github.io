import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, GRID_PROPS, yAxisLabel,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

export default function Reservoirs() {
  const isMobile = useIsMobile();
  const { data, loading, error, raw } = useJsonDataset("reservoirs.json");

  const construction = useMemo(() => {
    if (!data?.constructionByDecade) return [];
    return data.constructionByDecade;
  }, [data]);

  const cumulative = useMemo(() => {
    if (!data?.cumulativeCapacity) return [];
    return data.cumulativeCapacity;
  }, [data]);

  const projected = useMemo(() => {
    if (!data?.projectedCapacity) return [];
    return data.projectedCapacity;
  }, [data]);

  const sesroTimeline = useMemo(() => {
    if (!data?.sesroTimeline) return [];
    return data.sesroTimeline;
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Reservoirs</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading reservoir data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Reservoirs</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const ov = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(26px, 4vw, 36px)",
        fontWeight: 600,
        color: P.text,
        margin: "0 0 6px",
      }}>
        Reservoirs
      </h2>
      <p style={{ ...SECTION_NOTE, margin: "0 0 24px", maxWidth: 720 }}>
        The UK's 273 major reservoirs hold approximately {(ov.totalCapacityBnLitres / 1000).toFixed(1)} trillion
        litres of water, covering around 90% of total UK reservoir storage. No major water supply
        reservoir has been built since Carsington in 1991. With the population growing and capacity
        fixed, per-capita reservoir storage has fallen from a peak
        of {ov.perCapitaPeakKL} kilolitres per person in the {ov.perCapitaPeakDecade} to {ov.perCapitaKL} kilolitres
        today.
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 36 }}>
        <MetricCard
          label="Major reservoirs"
          value={ov.totalMajorReservoirs}
          change="~90% of UK storage"
          color={P.teal}
          delay={0}
        />
        <MetricCard
          label="Total capacity"
          value={`${(ov.totalCapacityBnLitres / 1000).toFixed(1)}tn L`}
          change={`${(ov.totalCapacityBnLitres).toLocaleString()} bn litres`}
          color={P.navy}
          delay={0.05}
        />
        <MetricCard
          label="Per-capita storage"
          value={`${ov.perCapitaKL} kL`}
          change={`Peak: ${ov.perCapitaPeakKL} kL (${ov.perCapitaPeakDecade})`}
          up={false}
          color={P.red}
          delay={0.1}
        />
        <MetricCard
          label="Years since last major"
          value={ov.yearsSinceLastMajor}
          change={ov.lastMajorWaterSupplyReservoir}
          color={P.sienna}
          delay={0.15}
        />
      </div>

      {/* Construction by decade */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Reservoir Construction by Decade</h3>
        <p style={SECTION_NOTE}>
          Major reservoir construction peaked in the 1950s and 1960s, when 67 reservoirs were
          built adding over 3.5 trillion litres of capacity. Construction slowed sharply after
          privatisation of the water industry in 1989. Only three reservoirs in this inventory
          have been completed since 1990, and none for water supply since 1991.
        </p>

        <ChartCard
          title="Reservoirs Built per Decade"
          subtitle="United Kingdom, major reservoirs (>25 Ml capacity), 1850s–2025"
          source={sourceFrom(raw, "constructionByDecade")}
          height={320}
        >
          <BarChart data={construction} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="decade"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              interval={isMobile ? 2 : 1}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              label={yAxisLabel("Reservoirs")}
            />
            <Tooltip content={<CustomTooltip
              formatter={(v, name) => {
                if (name === "built") return [`${v} reservoirs`, "Built"];
                return [v, name];
              }}
            />} />
            <ReferenceLine
              x="1990s"
              stroke={P.grey}
              strokeDasharray="4 4"
              label={{
                value: "Privatisation (1989)",
                fontSize: 10,
                fill: P.grey,
                position: "insideTopRight",
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Bar dataKey="built" fill={P.teal} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartCard>
      </section>

      {/* Cumulative capacity */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Cumulative Storage Capacity</h3>
        <p style={SECTION_NOTE}>
          Total UK reservoir storage rose from under 1 trillion litres in the mid-19th century
          to over 6 trillion litres by 1980. It has remained essentially flat since then, while
          the population has grown by over 10 million.
        </p>

        <ChartCard
          title="Cumulative Reservoir Capacity"
          subtitle="United Kingdom, billion litres, 1850s–2025"
          source={sourceFrom(raw, "cumulativeCapacity")}
          legend={[
            { key: "capacity", label: "Cumulative capacity (bn L)", color: P.teal },
            { key: "count", label: "Cumulative reservoir count", color: P.navy },
          ]}
          height={340}
        >
          <ComposedChart data={cumulative} margin={{ top: 10, right: 50, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1850, 2025]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => v >= 2020 ? `${v}` : `${v}s`}
            />
            <YAxis
              yAxisId="capacity"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 7000]}
              label={yAxisLabel("bn litres")}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 280]}
              label={{
                value: "Reservoirs",
                angle: 90,
                position: "insideRight",
                offset: 10,
                style: { fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" },
              }}
            />
            <Tooltip content={<CustomTooltip
              formatter={(v, name) => {
                if (name === "capacityBnL") return [`${v.toLocaleString()} bn L`, "Capacity"];
                if (name === "cumulativeCount") return [v, "Reservoirs"];
                return [v, name];
              }}
              labelFormatter={(l) => l >= 2020 ? `${l}` : `${l}s`}
            />} />
            <Area
              yAxisId="capacity"
              type="monotone"
              dataKey="capacityBnL"
              stroke={P.teal}
              strokeWidth={2}
              fill={P.teal}
              fillOpacity={0.08}
              name="capacityBnL"
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="cumulativeCount"
              stroke={P.navy}
              strokeWidth={2}
              dot={{ r: 3, fill: P.navy, stroke: "#fff", strokeWidth: 1.5 }}
              name="cumulativeCount"
            />
          </ComposedChart>
        </ChartCard>
      </section>

      {/* Per-capita storage */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Per-Capita Storage</h3>
        <p style={SECTION_NOTE}>
          Reservoir storage per person rose rapidly through the post-war construction programme,
          peaking at {ov.perCapitaPeakKL} kL per person in the {ov.perCapitaPeakDecade}. With no
          new capacity being added and the UK population growing by approximately 12 million
          since 1990, per-capita storage has fallen to {ov.perCapitaKL} kL, a decline
          of {Math.round((1 - ov.perCapitaKL / ov.perCapitaPeakKL) * 100)}% from the peak.
        </p>

        <ChartCard
          title="Reservoir Storage per Capita"
          subtitle="United Kingdom, kilolitres per person, 1850s–2025"
          source={sourceFrom(raw, "cumulativeCapacity")}
          legend={[
            { key: "perCapita", label: "Per-capita storage (kL)", color: P.sienna },
          ]}
          height={300}
        >
          <LineChart data={cumulative} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1850, 2025]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => v >= 2020 ? `${v}` : `${v}s`}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 120]}
              label={yAxisLabel("kL / person")}
            />
            <Tooltip content={<CustomTooltip
              formatter={(v, name) => {
                if (name === "perCapitaKL") return [`${v} kL`, "Per capita"];
                return [v, name];
              }}
              labelFormatter={(l) => l >= 2020 ? `${l}` : `${l}s`}
            />} />
            <ReferenceLine
              y={ov.perCapitaPeakKL}
              stroke={P.grey}
              strokeDasharray="4 4"
              label={{
                value: `Peak: ${ov.perCapitaPeakKL} kL`,
                fontSize: 10,
                fill: P.grey,
                position: "insideTopRight",
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="perCapitaKL"
              stroke={P.sienna}
              strokeWidth={2.5}
              dot={{ r: 4, fill: P.sienna, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: P.sienna, strokeWidth: 2 }}
              name="perCapitaL"
            />
          </LineChart>
        </ChartCard>
      </section>

      {/* Largest reservoirs */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Largest UK Reservoirs</h3>
        <p style={SECTION_NOTE}>
          The ten largest UK reservoirs by storage volume. Scottish hydro-electric lochs
          dominate the top of the list; Kielder Water (1981) is the largest purpose-built
          water supply reservoir in England.
        </p>

        <div style={{
          background: P.bgCard,
          border: `1px solid ${P.border}`,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
        }}>
          {data.largest.map((r, i) => (
            <div
              key={r.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: isMobile ? "10px 14px" : "10px 20px",
                borderBottom: i < data.largest.length - 1 ? `1px solid ${P.border}` : "none",
                animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
                <span style={{
                  fontSize: "11px", color: P.textLight,
                  fontFamily: "'DM Mono', monospace", minWidth: 20, textAlign: "right",
                }}>
                  {i + 1}.
                </span>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "14px", fontWeight: 600, color: P.text,
                }}>
                  {r.name}
                </span>
                <span style={{
                  fontSize: "10px", color: P.textLight,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {r.completionYear} · {r.use}
                </span>
              </div>
              <span style={{
                fontSize: "13px", fontWeight: 600, color: P.teal,
                fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap",
              }}>
                {r.capacityMl >= 1000000
                  ? `${(r.capacityMl / 1000000).toFixed(1)} tn L`
                  : `${(r.capacityMl / 1000).toFixed(0)} bn L`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Planned reservoirs */}
      {data.planned?.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Planned Reservoirs</h3>
          <p style={SECTION_NOTE}>
            Six major reservoirs are in various stages of planning or construction across England,
            representing the first significant investment in new reservoir capacity since the early
            1990s. Only Havant Thicket is under construction; the remainder are at pre-application
            stage. Combined, they would add approximately {Math.round(
              data.planned.reduce((s, r) => s + r.capacityMl, 0) / 1000
            ).toLocaleString()} billion litres of capacity at an estimated cost
            of over £{Math.round(
              data.planned.reduce((s, r) => s + (r.costMn || 0), 0) / 1000
            )}bn.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.planned.map((r, i) => {
              const isDelayed = r.expectedOperational > r.originalOperational;
              return (
                <div
                  key={r.name}
                  style={{
                    background: P.bgCard,
                    border: `1px solid ${P.border}`,
                    borderLeft: `3px solid ${r.status === "Under construction" ? P.teal : P.navy}`,
                    borderRadius: 3,
                    padding: isMobile ? "14px" : "16px 20px",
                    boxShadow: "0 1px 4px rgba(28,43,69,0.04)",
                    animation: `fadeSlideIn 0.3s ease ${i * 0.06}s both`,
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    gap: 8, flexWrap: "wrap", marginBottom: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: isMobile ? "15px" : "16px", fontWeight: 600, color: P.text,
                      }}>
                        {r.name}
                      </span>
                      <span style={{
                        fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em",
                        fontFamily: "'DM Mono', monospace", fontWeight: 500,
                        color: r.status === "Under construction" ? P.teal : P.navy,
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "14px", fontWeight: 600, color: P.teal,
                      fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap",
                    }}>
                      {r.capacityMl >= 1000000
                        ? `${(r.capacityMl / 1000000).toFixed(1)} tn L`
                        : r.capacityMl >= 1000
                          ? `${(r.capacityMl / 1000).toFixed(0)} bn L`
                          : `${r.capacityMl} Ml`}
                    </span>
                  </div>

                  {/* Key stats row */}
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 18,
                    fontSize: "11px", fontFamily: "'DM Mono', monospace", color: P.textMuted,
                    marginBottom: 8,
                  }}>
                    <span>{r.location}</span>
                    <span>{r.developer}</span>
                    {r.supplyMld && <span>{r.supplyMld} Ml/day supply</span>}
                  </div>

                  {/* Cost and timeline */}
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 18,
                    fontSize: "12px", fontFamily: "'DM Mono', monospace",
                  }}>
                    {r.costMn && (
                      <span style={{ color: P.text, fontWeight: 600 }}>
                        {"\u00A3"}{r.costMn >= 1000 ? `${(r.costMn / 1000).toFixed(1)}bn` : `${r.costMn}m`}
                      </span>
                    )}
                    <span style={{ color: isDelayed ? P.red : P.textMuted }}>
                      {isDelayed
                        ? `${r.originalOperational} \u2192 ${r.expectedOperational}`
                        : `Expected ${r.expectedOperational}`}
                      {isDelayed && (
                        <span style={{
                          fontSize: "10px", marginLeft: 4,
                          color: P.red, fontWeight: 500,
                        }}>
                          (+{r.expectedOperational - r.originalOperational}y)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Status detail */}
                  <p style={{
                    fontSize: "11px", lineHeight: 1.6, color: P.textLight,
                    fontFamily: "'DM Mono', monospace", margin: "8px 0 0",
                  }}>
                    {r.statusDetail}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Projected capacity */}
      {projected.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Projected Capacity</h3>
          <p style={SECTION_NOTE}>
            If all six planned reservoirs are delivered on their current timelines, total UK
            reservoir capacity would rise from {(6274.6 / 1000).toFixed(1)} to {(6556.6 / 1000).toFixed(1)} trillion
            litres by 2040, an increase of approximately 4.5%. Per-capita storage would recover
            from {ov.perCapitaKL} kL to around 90 kL by 2040, roughly back to today's level.
            Without new reservoirs, per-capita storage would continue to fall to around 86 kL
            as the population grows. Population projections are from the ONS 2022-based
            principal projection.
          </p>

          <ChartCard
            title="Projected Per-Capita Reservoir Storage"
            subtitle="United Kingdom, kilolitres per person, 2020–2040 (projected)"
            source={sourceFrom(raw, "projectedCapacity")}
            legend={[
              { key: "withPlanned", label: "With planned reservoirs", color: P.teal },
              { key: "noNew", label: "No new reservoirs", color: P.textLight },
            ]}
            height={300}
          >
            <LineChart data={projected} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="year"
                type="number"
                domain={[2020, 2040]}
                tick={AXIS_TICK_MONO}
                tickLine={false}
              />
              <YAxis
                tick={AXIS_TICK_MONO}
                tickLine={false}
                axisLine={false}
                domain={[80, 100]}
                label={yAxisLabel("kL / person")}
              />
              <Tooltip content={<CustomTooltip
                formatter={(v, name) => {
                  if (name === "perCapitaKL") return [`${v} kL`, "With planned"];
                  if (name === "perCapitaNoNewKL") return [`${v} kL`, "No new reservoirs"];
                  return [v, name];
                }}
              />} />
              <ReferenceLine
                x={2025}
                stroke={P.grey}
                strokeDasharray="4 4"
                label={{
                  value: "Today",
                  fontSize: 10,
                  fill: P.grey,
                  position: "insideTopLeft",
                  fontFamily: "'DM Mono', monospace",
                }}
              />
              <Line
                type="monotone"
                dataKey="perCapitaNoNewKL"
                stroke={P.textLight}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                name="perCapitaNoNewKL"
              />
              <Line
                type="monotone"
                dataKey="perCapitaKL"
                stroke={P.teal}
                strokeWidth={2.5}
                dot={false}
                name="perCapitaKL"
              />
            </LineChart>
          </ChartCard>
        </section>
      )}

      {/* SESRO spotlight */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Spotlight: SESRO (Abingdon Reservoir)</h3>
        <p style={SECTION_NOTE}>
          The South East Strategic Reservoir Option near Abingdon would be the largest new
          reservoir in England since Kielder Water in 1981 and the most expensive ever built in
          the UK. At 150 billion litres it would add approximately 2.4% to total UK reservoir
          capacity. The comparison with Kielder illustrates how the cost of building reservoir
          infrastructure has changed over four decades.
        </p>

        {/* SESRO timeline */}
        {sesroTimeline.length > 0 && (() => {
          const minY = sesroTimeline[0].year;
          const maxY = sesroTimeline[sesroTimeline.length - 1].year;
          const span = maxY - minY;
          const PHASE_COLORS = {
            planning: P.navy,
            rejected: P.red,
            revival: P.sienna,
            "pre-construction": P.teal,
            construction: P.teal,
          };
          return (
            <div style={{
              background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3,
              padding: isMobile ? "16px" : "24px 28px",
              boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
              marginBottom: 20,
              overflowX: isMobile ? "auto" : "visible",
            }}>
              <div style={{
                fontSize: "11px", fontFamily: "'DM Mono', monospace",
                color: P.textLight, marginBottom: 16,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Project timeline: 2006–2040 ({span} years)
              </div>

              {/* Horizontal track */}
              <div style={{ position: "relative", minWidth: isMobile ? 600 : "auto", height: 180 }}>
                {/* Main line */}
                <div style={{
                  position: "absolute", top: 40, left: 0, right: 0, height: 2,
                  background: P.border,
                }} />

                {/* Phase segments */}
                {sesroTimeline.map((m, i) => {
                  if (i === sesroTimeline.length - 1) return null;
                  const next = sesroTimeline[i + 1];
                  const left = ((m.year - minY) / span) * 100;
                  const width = ((next.year - m.year) / span) * 100;
                  return (
                    <div
                      key={`seg-${i}`}
                      style={{
                        position: "absolute", top: 38, height: 6, borderRadius: 3,
                        left: `${left}%`, width: `${width}%`,
                        background: PHASE_COLORS[m.phase] || P.textLight,
                        opacity: m.projected ? 0.4 : 0.7,
                      }}
                    />
                  );
                })}

                {/* Milestone nodes + labels */}
                {sesroTimeline.map((m, i) => {
                  const left = ((m.year - minY) / span) * 100;
                  const above = i % 2 === 0;
                  return (
                    <div key={m.year} style={{
                      position: "absolute",
                      left: `${left}%`,
                      top: 41,
                      transform: "translate(-50%, -50%)",
                    }}>
                      {/* Dot */}
                      <div style={{
                        width: m.phase === "rejected" ? 12 : 10,
                        height: m.phase === "rejected" ? 12 : 10,
                        borderRadius: "50%",
                        background: PHASE_COLORS[m.phase] || P.textLight,
                        border: `2px solid ${P.bgCard}`,
                        opacity: m.projected ? 0.5 : 1,
                        margin: "0 auto",
                      }} />

                      {/* Stem */}
                      <div style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 1,
                        height: above ? 20 : 20,
                        background: P.border,
                        ...(above
                          ? { bottom: "100%", marginBottom: 1 }
                          : { top: "100%", marginTop: 1 }
                        ),
                      }} />

                      {/* Label */}
                      <div style={{
                        position: "absolute",
                        left: "50%",
                        transform: i === 0 ? "translateX(-10%)" :
                                   i === sesroTimeline.length - 1 ? "translateX(-90%)" :
                                   "translateX(-50%)",
                        width: isMobile ? 110 : 130,
                        textAlign: i === 0 ? "left" :
                                   i === sesroTimeline.length - 1 ? "right" : "center",
                        ...(above
                          ? { bottom: "100%", marginBottom: 22 }
                          : { top: "100%", marginTop: 22 }
                        ),
                      }}>
                        <div style={{
                          fontSize: "12px", fontWeight: 600,
                          fontFamily: "'DM Mono', monospace",
                          color: PHASE_COLORS[m.phase] || P.textLight,
                          marginBottom: 2,
                        }}>
                          {m.year}{m.projected ? "*" : ""}
                        </div>
                        <div style={{
                          fontSize: "10px", lineHeight: 1.4,
                          fontFamily: "'DM Mono', monospace",
                          color: P.textMuted,
                        }}>
                          {m.event}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase legend */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8,
                fontSize: "10px", fontFamily: "'DM Mono', monospace", color: P.textLight,
              }}>
                {[
                  { label: "Planning", color: P.navy },
                  { label: "Rejected", color: P.red },
                  { label: "Revival", color: P.sienna },
                  { label: "Pre-construction / Construction", color: P.teal },
                ].map(l => (
                  <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: l.color, display: "inline-block",
                    }} />
                    {l.label}
                  </span>
                ))}
                <span style={{ marginLeft: 4 }}>* Projected</span>
              </div>
            </div>
          );
        })()}

        <div style={{
          background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3,
          padding: isMobile ? "16px" : "24px 28px",
          boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
        }}>
          {/* Comparison table */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "140px 1fr 1fr",
            gap: 0,
          }}>
            {/* Header row */}
            <div style={{ padding: "8px 0", borderBottom: `1px solid ${P.border}` }} />
            {[
              { name: "Kielder Water", year: "1981", color: P.navy },
              { name: "SESRO", year: "2040 est.", color: P.teal },
            ].map(h => (
              <div key={h.name} style={{
                padding: "8px 12px",
                borderBottom: `1px solid ${P.border}`,
                borderLeft: isMobile ? "none" : `1px solid ${P.border}`,
              }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "15px", fontWeight: 600, color: h.color,
                }}>
                  {h.name}
                </span>
                <span style={{
                  fontSize: "10px", color: P.textLight,
                  fontFamily: "'DM Mono', monospace", marginLeft: 8,
                }}>
                  {h.year}
                </span>
              </div>
            ))}

            {/* Data rows */}
            {[
              { label: "Capacity", kielder: "199 bn L", sesro: "150 bn L" },
              { label: "Cost (nominal)", kielder: "£167m (1981)", sesro: "£5.7bn (2025)" },
              { label: "Cost (2025 prices)", kielder: "~£700m", sesro: "£5.7–7.5bn" },
              { label: "Cost per bn litre", kielder: "~£3.5m", sesro: "£38–50m" },
              { label: "Share of UK capacity", kielder: "3.0%", sesro: "2.4%" },
              { label: "Construction", kielder: "6 years (1975–1981)", sesro: "~11 years (2029–2040)" },
              { label: "Planning to operation", kielder: "~10 years", sesro: "34+ years (2006–2040)" },
              { label: "Serves", kielder: "North East England", sesro: "South East (15m people)" },
            ].map((row, i) => (
              <div key={row.label} style={{ display: "contents" }}>
                <div style={{
                  padding: "8px 0", fontSize: "11px", color: P.textLight,
                  fontFamily: "'DM Mono', monospace", fontWeight: 500,
                  borderBottom: i < 7 ? `1px solid ${P.border}` : "none",
                  display: "flex", alignItems: "center",
                }}>
                  {row.label}
                </div>
                <div style={{
                  padding: "8px 12px", fontSize: "12px", color: P.text,
                  fontFamily: "'DM Mono', monospace", fontWeight: 500,
                  borderBottom: i < 7 ? `1px solid ${P.border}` : "none",
                  borderLeft: isMobile ? "none" : `1px solid ${P.border}`,
                }}>
                  {row.kielder}
                </div>
                <div style={{
                  padding: "8px 12px", fontSize: "12px", color: P.text,
                  fontFamily: "'DM Mono', monospace", fontWeight: 500,
                  borderBottom: i < 7 ? `1px solid ${P.border}` : "none",
                  borderLeft: isMobile ? "none" : `1px solid ${P.border}`,
                }}>
                  {row.sesro}
                </div>
              </div>
            ))}
          </div>

          <p style={{
            fontSize: "12px", lineHeight: 1.7, color: P.textMuted,
            fontFamily: "'Playfair Display', serif", margin: "18px 0 0",
          }}>
            In inflation-adjusted terms, SESRO costs roughly 8–11 times more than Kielder per
            litre of storage capacity. Kielder was built on sparsely populated upland in
            Northumberland; SESRO sits in the Thames Valley where land values are high, planning
            constraints are extensive, and the project was first proposed in 2006, rejected in
            2011, and revived in 2023. The cost estimate has risen from approximately £2.2bn at
            early market engagement to a government range of £5.5–7.5bn before construction has
            started.
          </p>
        </div>
      </section>

      <AnalysisBox>
        The UK's reservoir infrastructure was largely built between 1950 and 1980, a period in
        which total storage capacity more than tripled. Since water privatisation in 1989, almost
        no new reservoir capacity has been added. The Environment Agency projects a freshwater
        shortfall of nearly 5 billion litres per day by 2055. Six new reservoirs are now in
        planning or construction, but only Havant Thicket is under way. Even if all six are
        delivered on their current timelines at a combined cost of over £12bn, per-capita
        storage in 2040 would only recover to approximately today's level as population growth
        absorbs the new capacity. The cost of building reservoir infrastructure has increased
        by roughly an order of magnitude in real terms since the last major programme in the
        1970s and 1980s.
      </AnalysisBox>
    </div>
  );
}
