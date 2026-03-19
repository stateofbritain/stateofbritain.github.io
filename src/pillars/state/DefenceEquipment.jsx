import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, Cell } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE,
  AXIS_TICK, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const PLATFORM_COLORS = {
  tornado: P.grey,
  harrier: "#607DAA",
  typhoon: P.navy,
  f35: P.teal,
};

const FLEET_COLORS = {
  frigates: P.navy,
  destroyers: P.teal,
};

const COUNTRY_HIGHLIGHT = (d) =>
  d.country === "UK" ? P.sienna : P.navy;

export default function DefenceEquipment() {
  const { data, loading, error, raw } = useJsonDataset("defence.json");
  const [comparisonMetric, setComparisonMetric] = useState("fighters");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Equipment & Capability</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Equipment & Capability</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  // Group current equipment by category for the inventory table
  const landEquipment = data.currentEquipment.filter(e => e.category === "Land");
  const airEquipment = data.currentEquipment.filter(e => e.category === "Air");
  const navalEquipment = data.currentEquipment.filter(e => e.category === "Naval");

  // Prepare international comparison data based on selected metric
  const comparisonLabels = {
    fighters: "Fighter/Attack Aircraft",
    tanks: "Main Battle Tanks",
    submarines: "Submarines",
    frigates: "Frigates & Destroyers",
    attackHeli: "Attack Helicopters",
  };

  const comparisonData = data.intlEquipment
    .map(d => ({
      country: d.country,
      value: comparisonMetric === "frigates"
        ? (d.frigates + d.destroyers)
        : d[comparisonMetric],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Equipment & Capability
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Current UK military equipment inventory, fleet size trends, and how the UK compares with
        comparable middle powers.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Tanks" value={s.tanks} change={`Challenger 2, ${s.tanksYear}`} color={P.sienna} />
        <MetricCard label="Combat aircraft" value={s.combatAircraft} change={`Typhoon + F-35, ${s.combatAircraftYear}`} color={P.navy} />
        <MetricCard label="Escorts" value={s.escorts} change={`Frigates + destroyers, ${s.escortsYear}`} color={P.teal} />
        <MetricCard label="Submarines" value={s.submarines} change={`SSN + SSBN, ${s.submarinesYear}`} color={P.navy} />
      </div>

      {/* Section 1: Equipment inventory */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Current Equipment Inventory</h3>
        <p style={SECTION_NOTE}>
          Major platforms in service as at 1 April 2025. Inventory counts include platforms
          in all states — operational, in maintenance, and in storage. Not all are combat-ready
          at any given time.
        </p>

        {/* Equipment table */}
        {[
          { title: "Land", items: landEquipment, color: P.sienna },
          { title: "Air", items: airEquipment, color: P.teal },
          { title: "Naval", items: navalEquipment, color: P.navy },
        ].map(({ title, items, color }) => (
          <div key={title} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: "12px", fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.12em", color, fontFamily: "'DM Mono', monospace",
              marginBottom: 8, borderBottom: `2px solid ${color}`, paddingBottom: 4,
              display: "inline-block",
            }}>
              {title}
            </div>
            <div style={{
              background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3,
              overflow: "hidden",
            }}>
              {items.map((item, i) => (
                <div key={item.platform} style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 1fr",
                  padding: "10px 16px", gap: 12,
                  borderBottom: i < items.length - 1 ? `1px solid ${P.border}` : "none",
                  alignItems: "center",
                }}>
                  <div style={{ fontSize: "13px", fontFamily: "'Playfair Display', serif", color: P.text }}>
                    {item.platform}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, textAlign: "right" }}>
                    {item.count}
                  </div>
                  <div style={{ fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginTop: 4, letterSpacing: "0.06em" }}>
          {sourceFrom(raw, "currentEquipment")}
        </div>
      </section>

      {/* Section 2: Escort fleet trend */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Escort Fleet (Frigates & Destroyers)</h3>
        <p style={SECTION_NOTE}>
          The combined frigate and destroyer fleet has contracted from 48 ships in 1990 to 13 in
          2025. The Type 23 frigates are being replaced by Type 26 and Type 31 programmes, which
          will bring the frigate force back up to 13 ships once fully delivered in the mid-2030s.
        </p>
        <ChartCard
          title="Royal Navy Escort Fleet"
          subtitle="Frigates and destroyers in service"
          source={sourceFrom(raw, "escortFleet")}
          legend={[
            { key: "frigates", label: "Frigates", color: FLEET_COLORS.frigates },
            { key: "destroyers", label: "Destroyers", color: FLEET_COLORS.destroyers },
          ]}
          height={300}
        >
            <AreaChart data={data.escortFleet}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[0, 55]} label={yAxisLabel("ships")} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="frigates" stackId="1" stroke={FLEET_COLORS.frigates} fill={FLEET_COLORS.frigates} fillOpacity={0.5} name="Frigates" />
              <Area type="monotone" dataKey="destroyers" stackId="1" stroke={FLEET_COLORS.destroyers} fill={FLEET_COLORS.destroyers} fillOpacity={0.5} name="Destroyers" />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 3: Combat aircraft trend */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Combat Aircraft Fleet</h3>
        <p style={SECTION_NOTE}>
          The combat-capable fast jet fleet stood at 250 aircraft in 2000 across Tornado, Harrier,
          and early Typhoons. The Harrier was retired in 2010 and the Tornado in 2019. F-35B
          deliveries began in 2018, with 41 in service by 2025. The total fleet now stands at
          170 aircraft.
        </p>
        <ChartCard
          title="UK Combat Aircraft Fleet"
          subtitle="Fast jet platforms by type"
          source={sourceFrom(raw, "combatAircraft")}
          legend={[
            { key: "typhoon", label: "Typhoon", color: PLATFORM_COLORS.typhoon },
            { key: "f35", label: "F-35B Lightning", color: PLATFORM_COLORS.f35 },
            { key: "tornado", label: "Tornado", color: PLATFORM_COLORS.tornado },
            { key: "harrier", label: "Harrier", color: PLATFORM_COLORS.harrier },
          ]}
          height={300}
        >
            <AreaChart data={data.combatAircraft}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[0, 280]} label={yAxisLabel("aircraft")} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="harrier" stackId="1" stroke={PLATFORM_COLORS.harrier} fill={PLATFORM_COLORS.harrier} fillOpacity={0.4} name="Harrier" />
              <Area type="monotone" dataKey="tornado" stackId="1" stroke={PLATFORM_COLORS.tornado} fill={PLATFORM_COLORS.tornado} fillOpacity={0.4} name="Tornado" />
              <Area type="monotone" dataKey="f35" stackId="1" stroke={PLATFORM_COLORS.f35} fill={PLATFORM_COLORS.f35} fillOpacity={0.5} name="F-35B Lightning" />
              <Area type="monotone" dataKey="typhoon" stackId="1" stroke={PLATFORM_COLORS.typhoon} fill={PLATFORM_COLORS.typhoon} fillOpacity={0.5} name="Typhoon" />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 4: International equipment comparison */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>International Equipment Comparison</h3>
        <p style={SECTION_NOTE}>
          How the UK's equipment inventory compares with comparable middle powers. These are total
          inventory figures from GlobalFirepower and IISS; they include all held platforms, not
          only those that are operational.
        </p>
        <ChartCard
          title="Equipment Comparison — Peer Nations"
          subtitle={comparisonLabels[comparisonMetric]}
          source={sourceFrom(raw, "intlEquipment")}
          views={["fighters", "tanks", "submarines", "frigates", "attackHeli"]}
          viewLabels={{
            fighters: "Aircraft",
            tanks: "Tanks",
            submarines: "Subs",
            frigates: "Escorts",
            attackHeli: "Heli",
          }}
          activeView={comparisonMetric}
          onViewChange={setComparisonMetric}
          height={320}
        >
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tick={AXIS_TICK} />
              <YAxis type="category" dataKey="country" tick={AXIS_TICK} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={comparisonLabels[comparisonMetric]} radius={[0, 3, 3, 0]}>
                {comparisonData.map((d, i) => (
                  <Cell key={i} fill={COUNTRY_HIGHLIGHT(d)} fillOpacity={d.country === "UK" ? 1 : 0.5} />
                ))}
              </Bar>
            </BarChart>
        </ChartCard>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        The UK maintains {s.combatAircraft} combat aircraft ({s.combatAircraftYear}), {s.tanks} main
        battle tanks, {s.escorts} frigates and destroyers, and {s.submarines} submarines. The escort
        fleet has contracted from 48 ships in 1990 to 13, though the Type 26 and Type 31 programmes
        will restore frigate numbers to 13 once delivered. The combat aircraft fleet has shrunk from
        250 to 170 as older types were retired faster than replacements arrived. Among comparable
        middle powers, the UK fields fewer tanks than France, Germany, or Japan, though its carrier
        capability and nuclear submarine fleet remain distinctive. South Korea and Turkey maintain
        substantially larger land forces, reflecting their continental security positions.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        {data.meta.sources.map((src, i) => (
          <span key={i}>
            {i > 0 && " · "}
            <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>{src.name}</a>
          </span>
        ))}
      </div>
    </div>
  );
}
