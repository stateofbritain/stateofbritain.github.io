import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, Cell } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE,
  AXIS_TICK, yAxisLabel, GRID_PROPS,
  withFyNum, fyTickFormatter } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const SERVICE_COLORS = {
  army: P.sienna,
  navy: P.navy,
  raf: P.teal,
};

export default function DefencePersonnel() {
  const { data, loading, error, raw } = useJsonDataset("defence.json");
  const [outflowView, setOutflowView] = useState("overall");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Defence Personnel</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Defence Personnel</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Defence Personnel
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Armed forces strength by service, manning targets, recruitment pipeline, and retention trends.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Trained strength" value={`${s.totalPersonnel}k`} change={`${s.personnelDecline}% below ${s.personnelPeakYear}`} up color={P.red} />
        <MetricCard label="Below target" value={`${s.overallDeficit}%`} change={`8,590 personnel, ${s.overallDeficitYear}`} up color={P.red} />
        <MetricCard label="Voluntary outflow" value={`${s.voluntaryOutflow}%`} change={`${s.voluntaryOutflowYear}`} color={P.navy} />
        <MetricCard label="Reserves" value={`${s.reserveStrength}k`} change={`Trained, ${s.reserveYear}`} color={P.teal} />
      </div>

      {/* Section 1: Personnel by service */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Armed Forces Personnel</h3>
        <p style={SECTION_NOTE}>
          UK regular forces have contracted from {s.personnelPeak}k in {s.personnelPeakYear} to {s.totalPersonnel}k
          in {s.personnelYear}. The Army has been reduced from 110k to 70k. All three services are below
          their target manning levels.
        </p>
        <ChartCard
          title="UK Armed Forces Personnel"
          subtitle="Trained regular forces by service, thousands"
          source={sourceFrom(raw, "personnel")}
          legend={[
            { key: "army", label: "Army", color: SERVICE_COLORS.army },
            { key: "navy", label: "Royal Navy", color: SERVICE_COLORS.navy },
            { key: "raf", label: "RAF", color: SERVICE_COLORS.raf },
          ]}
          height={320}
        >
            <AreaChart data={data.personnel}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[0, 220]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("thousands")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <Area type="monotone" dataKey="raf" stackId="1" stroke={SERVICE_COLORS.raf} fill={SERVICE_COLORS.raf} fillOpacity={0.5} name="RAF" />
              <Area type="monotone" dataKey="navy" stackId="1" stroke={SERVICE_COLORS.navy} fill={SERVICE_COLORS.navy} fillOpacity={0.5} name="Royal Navy" />
              <Area type="monotone" dataKey="army" stackId="1" stroke={SERVICE_COLORS.army} fill={SERVICE_COLORS.army} fillOpacity={0.5} name="Army" />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 2: Trained strength vs requirement */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Trained Strength vs Requirement</h3>
        <p style={SECTION_NOTE}>
          All three services are below their target manning levels set in the 2021 Defence Command Paper.
          The RAF has the largest proportional shortfall at 13%, followed by the Royal Navy at 8% and
          the Army at 3%.
        </p>
        <ChartCard
          title="Trained Strength vs Requirement"
          subtitle="Thousands, 1 April 2025"
          source={sourceFrom(raw, "strengthVsRequirement")}
          legend={[
            { key: "trained", label: "Trained strength", color: P.navy },
            { key: "requirement", label: "Requirement", color: P.grey },
          ]}
          height={260}
        >
            <BarChart data={data.strengthVsRequirement}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="service" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[0, 80]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("thousands")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <Bar dataKey="requirement" name="Requirement" fill={P.grey} fillOpacity={0.3} radius={[3, 3, 0, 0]} />
              <Bar dataKey="trained" name="Trained strength" fill={P.navy} fillOpacity={0.75} radius={[3, 3, 0, 0]} />
            </BarChart>
        </ChartCard>
      </section>

      {/* Section 3: Intake vs outflow */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Recruitment & Retention</h3>
        <p style={SECTION_NOTE}>
          In 2024-25, 13,450 individuals joined the UK Regular Forces while 14,600 left, a net
          loss of 1,150. Intake has risen 19% year-on-year and outflow has fallen 7%, narrowing
          the gap. In most years since 2000, outflow has exceeded intake.
        </p>
        <ChartCard
          title="UK Armed Forces Intake vs Outflow"
          subtitle="Thousands, UK Regular Forces, financial year"
          source={sourceFrom(raw, "intakeOutflow")}
          legend={[
            { key: "intake", label: "Intake (joining)", color: P.teal },
            { key: "outflow", label: "Outflow (leaving)", color: P.red },
          ]}
          height={300}
        >
            <BarChart data={withFyNum(data.intakeOutflow, "year")}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} domain={[0, 20]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("thousands")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <Bar dataKey="intake" name="Intake" fill={P.teal} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
              <Bar dataKey="outflow" name="Outflow" fill={P.red} fillOpacity={0.5} radius={[3, 3, 0, 0]} />
            </BarChart>
        </ChartCard>
      </section>

      {/* Section 4: Voluntary outflow rate */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Voluntary Outflow Rate</h3>
        <p style={SECTION_NOTE}>
          The voluntary outflow rate measures the proportion of trained personnel who leave before
          the end of their engagement. It peaked at 6.4% in 2023-24 and has since fallen to 5.9%.
          The Army consistently has the highest rate.
        </p>
        <ChartCard
          title="Voluntary Outflow Rate"
          subtitle="% of trained strength leaving voluntarily, 12m to March"
          source={sourceFrom(raw, "voluntaryOutflow")}
          views={["overall", "byService"]}
          viewLabels={{ overall: "Overall", byService: "By Service" }}
          activeView={outflowView}
          onViewChange={setOutflowView}
          legend={outflowView === "byService" ? [
            { key: "army", label: "Army", color: SERVICE_COLORS.army },
            { key: "navy", label: "RN/RM", color: SERVICE_COLORS.navy },
            { key: "raf", label: "RAF", color: SERVICE_COLORS.raf },
          ] : undefined}
          height={280}
        >
          {outflowView === "overall" ? (
            <LineChart data={withFyNum(data.voluntaryOutflow, "year")}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} domain={[3, 7.5]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="overall" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2.5, fill: P.navy }} name="Overall" />
            </LineChart>
          ) : (
            <LineChart data={withFyNum(data.voluntaryOutflow, "year")}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} domain={[3, 7.5]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="army" stroke={SERVICE_COLORS.army} strokeWidth={2} dot={{ r: 2, fill: SERVICE_COLORS.army }} name="Army" />
              <Line type="monotone" dataKey="navy" stroke={SERVICE_COLORS.navy} strokeWidth={2} dot={{ r: 2, fill: SERVICE_COLORS.navy }} name="RN/RM" />
              <Line type="monotone" dataKey="raf" stroke={SERVICE_COLORS.raf} strokeWidth={2} dot={{ r: 2, fill: SERVICE_COLORS.raf }} name="RAF" />
            </LineChart>
          )}
        </ChartCard>
      </section>

      {/* Section 5: Reserves */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Reserve Forces</h3>
        <p style={SECTION_NOTE}>
          Trained reserve strength peaked at 30.7k in 2022 but declined to 26k in 2024. The 2013
          "Future Reserves" plan aimed for 30k trained reservists to offset regular force reductions.
          Reserve strength recovered to {s.reserveStrength}k in {s.reserveYear}.
        </p>
        <ChartCard
          title="UK Reserve Forces Strength"
          subtitle="Trained reserve strength, thousands"
          source={sourceFrom(raw, "reserves")}
          height={260}
        >
            <LineChart data={data.reserves}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[18, 34]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("thousands")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <ReferenceLine y={30} stroke={P.grey} strokeDasharray="4 4" label={{ value: "30k target", fontSize: 10, fill: P.grey, position: "right" }} />
              <Line type="monotone" dataKey="strength" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2.5, fill: P.navy }} name="Trained reserves (thousands)" />
            </LineChart>
        </ChartCard>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        UK regular forces stand at {s.totalPersonnel}k, {s.personnelDecline}% below their {s.personnelPeakYear} level
        of {s.personnelPeak}k. All three services are below their target strength, with the RAF
        furthest from its requirement at 13% below. Voluntary outflow peaked at 6.4% in 2023-24 and
        has since improved to {s.voluntaryOutflow}%, though the Army's rate remains higher than the
        other services. Recruitment showed improvement in 2024-25, with intake rising 19%
        year-on-year, though outflow still exceeded intake in most recent years. Reserve trained
        strength has recovered to {s.reserveStrength}k after dipping from its 2022 peak.
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
