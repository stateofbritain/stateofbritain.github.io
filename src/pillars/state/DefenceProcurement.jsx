import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE,
  AXIS_TICK, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const SUPPLIER_COLORS = [
  P.navy, P.teal, P.sienna, "#4A7A58", P.yellow, P.grey, P.red, "#607DAA", "#8B6F47", "#5B7FA5",
];

export default function DefenceProcurement() {
  const { data, loading, error, raw } = useJsonDataset("defence.json");
  const [compView, setCompView] = useState("trend");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Procurement</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Procurement</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  // Sort major programmes by cost growth descending for the chart
  const programmesByCostGrowth = [...data.majorProgrammes]
    .filter(p => p.costGrowth > 0)
    .sort((a, b) => b.costGrowth - a.costGrowth);

  // Prepare competition rate stacked data
  const competitionData = data.competitionRate;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Procurement
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Equipment Plan affordability, major programme delivery, industry concentration,
        and competition rates in defence procurement.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Equipment Plan gap" value={`£${s.equipPlanGap}bn`} change={`${s.equipPlanGapYear} plan`} up color={P.red} />
        <MetricCard label="Non-competitive" value={`${s.nonCompetitivePct}%`} change={`Of procurement, ${s.nonCompetitiveYear}`} color={P.navy} />
        <MetricCard label="BAE Systems share" value={`${s.baeSharePct}%`} change={`Of MoD spend, ${s.baeShareYear}`} color={P.sienna} />
        <MetricCard label="Total procurement" value={`£${s.totalModProcurement}bn`} change={s.totalModProcurementYear} color={P.teal} />
      </div>

      {/* Section 1: Equipment Plan affordability */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Equipment Plan Affordability</h3>
        <p style={SECTION_NOTE}>
          The NAO assesses the MoD's Equipment Plan for affordability each year. The Plan was assessed as
          broadly affordable between 2012 and 2014, but has been found unaffordable in most years since. The
          2023-33 Plan had a £16.9bn funding gap, the largest since reporting began in 2012.
        </p>
        <ChartCard
          title="Equipment Plan Affordability Gap"
          subtitle="NAO-assessed funding shortfall, £bn, 10-year plan periods"
          source={sourceFrom(raw, "equipmentPlanAffordability")}
          height={300}
        >
            <BarChart data={data.equipmentPlanAffordability}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={{ ...AXIS_TICK, fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={AXIS_TICK} domain={[0, 20]} tickFormatter={(v) => `£${v}bn`} label={yAxisLabel("£bn")} />
              <Tooltip content={<CustomTooltip formatter={(v, name) => name === "gap" ? `£${v}bn` : v} />} />
              <Bar dataKey="gap" name="Funding gap (£bn)" radius={[3, 3, 0, 0]}>
                {data.equipmentPlanAffordability.map((d, i) => (
                  <Cell key={i} fill={d.gap > 10 ? P.red : d.gap > 0 ? P.sienna : P.teal} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
        </ChartCard>
      </section>

      {/* Section 2: Major programme cost growth */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Major Programme Cost & Schedule</h3>
        <p style={SECTION_NOTE}>
          Cost growth across major defence programmes, measured as the percentage increase from original approved
          cost to the latest estimate. Most programmes have experienced both cost increases and schedule delays
          from their original in-service dates.
        </p>

        {/* Programme table */}
        <ChartCard
          title="Major Programme Cost Growth"
          subtitle="Original vs current estimated cost, £bn"
          source={sourceFrom(raw, "majorProgrammes")}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse", fontSize: "13px",
              fontFamily: "'Playfair Display', serif",
            }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${P.borderStrong}` }}>
                  {["Programme", "Original", "Current", "Growth", "Orig. ISD", "Current ISD", "Status"].map((h) => (
                    <th key={h} style={{
                      padding: "8px 10px", textAlign: h === "Programme" || h === "Status" ? "left" : "right",
                      fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 600,
                      color: P.textLight, textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.majorProgrammes.map((p, i) => (
                  <tr key={p.programme} style={{ borderBottom: i < data.majorProgrammes.length - 1 ? `1px solid ${P.border}` : "none" }}>
                    <td style={{ padding: "10px", fontWeight: 600, color: P.text }}>{p.programme}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.textMuted }}>
                      £{p.originalCost}bn
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 600, color: P.text }}>
                      £{p.currentCost}bn
                    </td>
                    <td style={{
                      padding: "10px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: "12px",
                      fontWeight: 600, color: p.costGrowth > 50 ? P.red : p.costGrowth > 0 ? P.sienna : P.teal,
                    }}>
                      {p.costGrowth > 0 ? `+${p.costGrowth}%` : "0%"}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.textMuted }}>
                      {p.originalISD}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.text }}>
                      {p.currentISD}
                    </td>
                    <td style={{
                      padding: "10px", fontSize: "10px", fontFamily: "'DM Mono', monospace",
                      color: p.status === "Paused" || p.status === "Under review" ? P.red : P.textMuted,
                    }}>
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Cost growth bar chart */}
        <div style={{ marginTop: 18 }}>
          <ChartCard
            title="Cost Growth by Programme"
            subtitle="% increase from original to current estimate"
            source={sourceFrom(raw, "majorProgrammes")}
            height={280}
          >
              <BarChart data={programmesByCostGrowth} layout="vertical">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="programme" tick={AXIS_TICK} width={90} />
                <Tooltip content={<CustomTooltip formatter={(v) => `+${v}%`} />} />
                <Bar dataKey="costGrowth" name="Cost growth (%)" radius={[0, 3, 3, 0]}>
                  {programmesByCostGrowth.map((d, i) => (
                    <Cell key={i} fill={d.costGrowth > 50 ? P.red : P.sienna} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
          </ChartCard>
        </div>
      </section>

      {/* Section 3: Industry concentration */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Industry Concentration</h3>
        <p style={SECTION_NOTE}>
          MoD procurement expenditure by supplier in 2024-25. BAE Systems received 16.3% of total MoD
          procurement spend (£6.7bn), the highest recorded share for any single supplier since these
          figures were first published in 2007-08. The top 10 suppliers accounted for 39% of total
          expenditure.
        </p>
        <ChartCard
          title="MoD Expenditure by Supplier"
          subtitle="Top 10 suppliers, £bn, 2024-25"
          source={sourceFrom(raw, "industryConcentration")}
          height={360}
        >
            <BarChart data={data.industryConcentration} layout="vertical">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `£${v}bn`} />
              <YAxis type="category" dataKey="supplier" tick={{ ...AXIS_TICK, fontSize: 10 }} width={100} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
              <Bar dataKey="spend" name="MoD expenditure (£bn)" radius={[0, 3, 3, 0]}>
                {data.industryConcentration.map((d, i) => (
                  <Cell key={i} fill={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]} fillOpacity={i === 0 ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
        </ChartCard>
      </section>

      {/* Section 4: Competition rates */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Competition in Procurement</h3>
        <p style={SECTION_NOTE}>
          The share of MoD procurement expenditure awarded through competitive processes has declined
          from 31% in 2014-15 to 8% in 2024-25. Non-competitive (single source) procurement
          rose to 45%, driven by nuclear submarine and combat air programmes. The "other" category
          includes expenditure where competition status was not recorded, which increased after
          a system change in late 2016.
        </p>
        <ChartCard
          title="Procurement by Competition Status"
          subtitle="% of MoD in-year procurement expenditure"
          source={sourceFrom(raw, "competitionRate")}
          views={["trend", "stacked"]}
          viewLabels={{ trend: "Lines", stacked: "Stacked" }}
          activeView={compView}
          onViewChange={setCompView}
          legend={[
            { key: "competitive", label: "Competitive", color: P.teal },
            { key: "nonCompetitive", label: "Non-competitive", color: P.red },
            { key: "other", label: "Other/unknown", color: P.grey },
          ]}
          height={300}
        >
          {compView === "trend" ? (
            <LineChart data={competitionData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={{ ...AXIS_TICK, fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={AXIS_TICK} domain={[0, 65]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Line type="monotone" dataKey="competitive" stroke={P.teal} strokeWidth={2.5} dot={{ r: 2.5, fill: P.teal }} name="Competitive" />
              <Line type="monotone" dataKey="nonCompetitive" stroke={P.red} strokeWidth={2.5} dot={{ r: 2.5, fill: P.red }} name="Non-competitive" />
              <Line type="monotone" dataKey="other" stroke={P.grey} strokeWidth={2} dot={{ r: 2, fill: P.grey }} name="Other/unknown" />
            </LineChart>
          ) : (
            <AreaChart data={competitionData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={{ ...AXIS_TICK, fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={AXIS_TICK} domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="competitive" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.5} name="Competitive" />
              <Area type="monotone" dataKey="nonCompetitive" stackId="1" stroke={P.red} fill={P.red} fillOpacity={0.4} name="Non-competitive" />
              <Area type="monotone" dataKey="other" stackId="1" stroke={P.grey} fill={P.grey} fillOpacity={0.3} name="Other/unknown" />
            </AreaChart>
          )}
        </ChartCard>
      </section>

      {/* Section 5: SME share */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>SME Participation</h3>
        <p style={SECTION_NOTE}>
          Direct MoD expenditure with small and medium-sized enterprises has remained around 3.5-5% of
          total spending since 2016-17. When indirect expenditure through prime contractors is included,
          total SME share reached 25.5% in 2021-22. The government set a target of 25% SME share in 2019.
        </p>
        <ChartCard
          title="SME Share of MoD Procurement"
          subtitle="Direct MoD expenditure with SMEs, %"
          source={sourceFrom(raw, "smeShare")}
          height={260}
        >
            <BarChart data={data.smeShare}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={{ ...AXIS_TICK, fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={AXIS_TICK} domain={[0, 8]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={(v) => v !== null ? `${v}%` : "N/A"} />} />
              <Bar dataKey="directPct" name="Direct SME share (%)" fill={P.teal} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
        </ChartCard>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        The MoD's Equipment Plan has been assessed as unaffordable in most years since 2015, with the
        2023-33 plan showing the largest funding gap (£{s.equipPlanGap}bn) since reporting began. Major
        programmes have experienced significant cost growth: the Type 26 frigate programme has more than
        doubled in cost, and Ajax has risen 77% while remaining on hold following safety concerns.
        Industry concentration is increasing, with BAE Systems accounting for a record {s.baeSharePct}% of
        procurement spend. Competitive procurement has fallen to {s.nonCompetitivePct > 0 ? `8%` : "8%"} of
        expenditure, while non-competitive contracts, particularly for nuclear and combat air programmes,
        now represent {s.nonCompetitivePct}% of spending. Direct SME engagement with MoD remains low at
        around {s.smeDirectPct}%, though indirect spending through prime contractors raises total SME
        participation to approximately 25%.
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
