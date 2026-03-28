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
        of {ov.perCapitaPeak} litres per person in the {ov.perCapitaPeakDecade} to {ov.perCapitaLitres2020s} litres
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
          value={`${ov.perCapitaLitres2020s} L`}
          change={`Peak: ${ov.perCapitaPeak} L (${ov.perCapitaPeakDecade})`}
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
          subtitle="United Kingdom, major reservoirs (>25 Ml capacity), 1850s–2020s"
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
          subtitle="United Kingdom, billion litres, 1850s–2020s"
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
              domain={[1850, 2020]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => `${v}s`}
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
              labelFormatter={(l) => `${l}s`}
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
          peaking at {ov.perCapitaPeak} litres per person in the {ov.perCapitaPeakDecade}. With no
          new capacity being added and the UK population growing by approximately 12 million
          since 1990, per-capita storage has fallen to {ov.perCapitaLitres2020s} litres, a decline
          of {Math.round((1 - ov.perCapitaLitres2020s / ov.perCapitaPeak) * 100)}% from the peak.
        </p>

        <ChartCard
          title="Reservoir Storage per Capita"
          subtitle="United Kingdom, litres per person, 1850s–2020s"
          source={sourceFrom(raw, "cumulativeCapacity")}
          legend={[
            { key: "perCapita", label: "Per-capita storage (litres)", color: P.sienna },
          ]}
          height={300}
        >
          <LineChart data={cumulative} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1850, 2020]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => `${v}s`}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 120]}
              label={yAxisLabel("Litres / person")}
            />
            <Tooltip content={<CustomTooltip
              formatter={(v, name) => {
                if (name === "perCapitaL") return [`${v} litres`, "Per capita"];
                return [v, name];
              }}
              labelFormatter={(l) => `${l}s`}
            />} />
            <ReferenceLine
              y={ov.perCapitaPeak}
              stroke={P.grey}
              strokeDasharray="4 4"
              label={{
                value: `Peak: ${ov.perCapitaPeak} L`,
                fontSize: 10,
                fill: P.grey,
                position: "insideTopRight",
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="perCapitaL"
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
                  ? `${(r.capacityMl / 1000000).toFixed(1)} bn L`
                  : `${(r.capacityMl / 1000).toFixed(0)} mn L`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <AnalysisBox>
        The UK's reservoir infrastructure was largely built between 1950 and 1980, a period in
        which total storage capacity more than tripled. Since water privatisation in 1989, almost
        no new reservoir capacity has been added. The Environment Agency projects a freshwater
        shortfall of nearly 5 billion litres per day by 2055, and revised Water Resources
        Management Plans include proposals for several new reservoirs, but none are yet under
        construction. Meanwhile, the population has grown by over 12 million since the last
        major water supply reservoir was completed, reducing per-capita storage
        from {ov.perCapitaPeak} to {ov.perCapitaLitres2020s} litres per person.
      </AnalysisBox>
    </div>
  );
}
