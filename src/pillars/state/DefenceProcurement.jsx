import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  PieChart, Pie, Sector, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell } from "recharts";
import useIsMobile from "../../hooks/useIsMobile";
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
  P.navy, P.teal, P.sienna, P.yellow, P.grey, P.red, "#607DAA", "#8B6F47", "#7B4B8A", "#5B7FA5",
];

// Generate shades from a hex colour — lighter to darker
function shades(hex, count) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    // range from 30% lighter to 20% darker
    const f = 1.3 - t * 0.5;
    const clamp = v => Math.min(255, Math.max(0, Math.round(v * f)));
    return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
  });
}

export default function DefenceProcurement() {
  const isMobile = useIsMobile();
  const { data, loading, error, raw } = useJsonDataset("defence.json");
  const [compView, setCompView] = useState("trend");
  const [costView, setCostView] = useState("pct");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [openProgrammes, setOpenProgrammes] = useState({});

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

      {/* Equipment Plan breakdown pie — interactive drill-down */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Equipment Plan Breakdown</h3>
        <p style={SECTION_NOTE}>
          The MoD's 10-year Equipment Plan sets out planned spending across major capability areas.
          Click a segment to see the programmes within it.
        </p>
        <ChartCard
          title="Equipment Plan by Category"
          subtitle={`10-year plan, £${data.equipmentPlan.reduce((s, d) => s + d.value, 0).toFixed(1)}bn total`}
          source={sourceFrom(raw, "equipmentPlan")}
        >
          {/* Breadcrumb */}
          <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: P.textMuted, marginBottom: 10 }}>
            {selectedCategory ? (
              <>
                <span style={{ cursor: "pointer", textDecoration: "underline", color: P.teal }} onClick={() => { setSelectedCategory(null); setHoveredSlice(null); }}>
                  All categories
                </span>
                {" → "}
                <span style={{ color: P.text, fontWeight: 500 }}>{selectedCategory.category} (£{selectedCategory.value}bn)</span>
              </>
            ) : (
              <span>All categories</span>
            )}
          </div>
          {(() => {
            const pieData = selectedCategory ? selectedCategory.programmes : data.equipmentPlan;
            const parentIdx = selectedCategory ? data.equipmentPlan.indexOf(selectedCategory) : -1;
            const parentColor = parentIdx >= 0 ? SUPPLIER_COLORS[parentIdx % SUPPLIER_COLORS.length] : null;
            const cellColors = selectedCategory
              ? shades(parentColor, pieData.length)
              : SUPPLIER_COLORS;
            const renderActiveShape = (props) => {
              const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
              return (
                <g>
                  <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
                  <Sector cx={cx} cy={cy} innerRadius={outerRadius + 2} outerRadius={outerRadius + 5} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
                </g>
              );
            };
            return (
              <>
                <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey={selectedCategory ? "name" : "category"}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 60 : 90}
                      outerRadius={isMobile ? 120 : 160}
                      paddingAngle={1}
                      isAnimationActive={!hasInteracted}
                      activeIndex={hoveredSlice}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, idx) => setHoveredSlice(idx)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      onClick={(_, idx) => {
                        if (selectedCategory) return;
                        const cat = data.equipmentPlan[idx];
                        if (cat?.programmes) { setHasInteracted(true); setSelectedCategory(cat); setHoveredSlice(null); }
                      }}
                      style={{ cursor: selectedCategory ? "default" : "pointer" }}
                      label={selectedCategory && !isMobile ? ({ name, value, cx, cy, midAngle, outerRadius: or }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = or + 30;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
                            style={{ fontSize: 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
                            {name} £{value}bn
                          </text>
                        );
                      } : false}
                      labelLine={selectedCategory && !isMobile ? { stroke: P.border, strokeWidth: 1 } : false}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={d.name || d.category} fill={cellColors[i % cellColors.length]} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    {selectedCategory && (
                      <text
                        x="50%" y="50%"
                        textAnchor="middle" dominantBaseline="middle"
                        style={{ fontSize: 11, fill: P.textLight, fontFamily: "'DM Mono', monospace", cursor: "pointer" }}
                        onClick={() => { setSelectedCategory(null); setHoveredSlice(null); }}
                      >
                        ← Back
                      </text>
                    )}
                    <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
                  </PieChart>
                </ResponsiveContainer>
                {(!selectedCategory || isMobile) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", marginTop: 8 }}>
                    {pieData.map((d, i) => (
                      <div
                        key={d.name || d.category}
                        style={{ display: "flex", alignItems: "center", gap: 4, cursor: !selectedCategory && d.programmes ? "pointer" : "default" }}
                        onClick={() => { if (!selectedCategory && d.programmes) { setHasInteracted(true); setSelectedCategory(d); setHoveredSlice(null); } }}
                      >
                        <span style={{ width: 10, height: 6, borderRadius: 1, background: cellColors[i % cellColors.length], display: "inline-block" }} />
                        <span style={{ fontSize: "10px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>{d.name || d.category} £{d.value}bn</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </ChartCard>
      </section>

      {/* Major programme cost growth */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Major Programme Cost & Schedule</h3>
        <p style={SECTION_NOTE}>
          Cost growth across major defence programmes, measured as the percentage increase from original approved
          cost to the latest estimate. Most programmes have experienced both cost increases and schedule delays
          from their original in-service dates.
        </p>

        {/* Programme cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.majorProgrammes.map((p) => {
            const isOpen = !!openProgrammes[p.programme];
            return (
              <div key={p.programme} style={{
                background: P.bgCard, border: `1px solid ${isOpen ? P.navy : P.border}`,
                borderRadius: 4, overflow: "hidden", transition: "border-color 0.15s",
              }}>
                <button
                  onClick={() => setOpenProgrammes(prev => ({ ...prev, [p.programme]: !prev[p.programme] }))}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: "none", border: "none", padding: "12px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: P.text, fontFamily: "'Playfair Display', serif" }}>
                      {p.programme}
                    </div>
                    <div style={{ fontSize: "11px", color: P.textMuted, fontFamily: "'DM Mono', monospace", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {p.quantity && <span>{p.quantity}</span>}
                      <span>£{p.originalCost}bn → £{p.currentCost}bn</span>
                      <span style={{ color: p.costGrowth > 50 ? P.red : p.costGrowth > 0 ? P.sienna : P.teal, fontWeight: 600 }}>
                        {p.costGrowth > 0 ? `+${p.costGrowth}%` : "On budget"}
                      </span>
                      <span style={{ color: p.status === "Paused" || p.status === "Under review" ? P.red : P.textMuted }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: "14px", color: P.textLight, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none", flexShrink: 0 }}>
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.programme}
                        style={{ width: 200, height: 140, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'Playfair Display', serif", lineHeight: 1.7, margin: "0 0 12px" }}>
                        {p.description}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
                        {p.quantity && <><div><span style={{ color: P.textLight }}>Quantity</span></div>
                        <div style={{ color: P.text }}>{p.quantity}</div></>}
                        <div><span style={{ color: P.textLight }}>Original cost</span></div>
                        <div style={{ color: P.text }}>£{p.originalCost}bn</div>
                        <div><span style={{ color: P.textLight }}>Current cost</span></div>
                        <div style={{ color: P.text, fontWeight: 600 }}>£{p.currentCost}bn</div>
                        <div><span style={{ color: P.textLight }}>Original in-service date</span></div>
                        <div style={{ color: P.text }}>{p.originalISD}</div>
                        <div><span style={{ color: P.textLight }}>Current in-service date</span></div>
                        <div style={{ color: P.text }}>{p.currentISD}</div>
                      </div>
                      {p.imageCredit && (
                        <div style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>
                          Image: {p.imageCredit}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cost growth bar chart */}
        <div style={{ marginTop: 18 }}>
          <ChartCard
            title={costView === "pct" ? "Cost Growth by Programme" : "Original vs Current Cost"}
            subtitle={costView === "pct" ? "% increase from original to current estimate" : "£bn, original estimate vs current estimate"}
            views={["pct", "abs"]}
            viewLabels={{ pct: "% Growth", abs: "£bn" }}
            activeView={costView}
            onViewChange={setCostView}
            source={sourceFrom(raw, "majorProgrammes")}
            height={Math.max(280, programmesByCostGrowth.length * 38)}
          >
            {costView === "pct" ? (
              <BarChart data={programmesByCostGrowth} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="programme" tick={{ fontSize: 10, fill: P.textMuted }} width={180} />
                <Tooltip content={<CustomTooltip formatter={(v) => `+${v}%`} />} />
                <Bar dataKey="costGrowth" name="Cost growth (%)" radius={[0, 3, 3, 0]}>
                  {programmesByCostGrowth.map((d, i) => (
                    <Cell key={i} fill={d.costGrowth > 50 ? P.red : P.sienna} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={programmesByCostGrowth} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `£${v}bn`} />
                <YAxis type="category" dataKey="programme" tick={{ fontSize: 10, fill: P.textMuted }} width={180} />
                <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
                <Bar dataKey="originalCost" name="Original estimate" fill={P.navy} fillOpacity={0.5} radius={[0, 3, 3, 0]} />
                <Bar dataKey="currentCost" name="Current estimate" fill={P.red} fillOpacity={0.7} radius={[0, 3, 3, 0]} />
              </BarChart>
            )}
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
          rose to 45%, driven by nuclear submarine and combat air programmes. The large "other/unknown"
          category (47% in 2024-25) covers expenditure where the MoD's financial system does not record
          competition status, including collaborative international programmes, government-to-government
          purchases, and contracts processed through legacy systems. This category grew from 33% to 51%
          after the MoD migrated to a new financial platform in late 2016.
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
        <h3 style={SECTION_HEADING}>Small & Medium Enterprise Participation</h3>
        <p style={SECTION_NOTE}>
          Direct MoD expenditure with small and medium-sized enterprises has remained around 3.5-5% of
          total spending since 2016-17. When indirect expenditure through prime contractors is included,
          total small and medium enterprise share reached 25.5% in 2021-22. The government set a target of 25% small and medium enterprise share in 2019.
        </p>
        <ChartCard
          title="Small & Medium Enterprise Share of MoD Procurement"
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

      {/* Emerging technologies */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Emerging Technologies</h3>
        <p style={SECTION_NOTE}>
          Defence R&D spending reached £{s.defenceRnD}bn ({s.defenceRnDPct}% of the defence budget) in {s.defenceRnDYear},
          with a target of {s.defenceRnDTarget}% by 2030. The 2025 Strategic Defence Review committed several billion
          to autonomous systems, directed energy weapons, and digital capabilities over this Parliament.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
          <MetricCard label="Defence R&D" value={`£${s.defenceRnD}bn`} change={`${s.defenceRnDPct}% of budget, ${s.defenceRnDYear}`} color={P.teal} />
          <MetricCard label="R&D Target" value={`${s.defenceRnDTarget}%`} change="of defence budget by ~2030" color={P.navy} />
          <MetricCard label="Innovation Fund" value="£400m" change="UK Defence Innovation, per year from 2025" color={P.sienna} />
        </div>

        <ChartCard
          title="Defence R&D Spending"
          subtitle={`£bn and % of defence budget, ${data.defenceRnD[0].year} to ${data.defenceRnD[data.defenceRnD.length - 1].year}`}
          source={<>SOURCE: <a href="https://www.gov.uk/government/statistics/defence-departmental-resources-2025" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>MoD Departmental Resources 2025</a></>}
          legend={[
            { key: "rd", label: "R&D spending (£bn)", color: P.teal },
            { key: "pct", label: "% of defence budget", color: P.navy },
          ]}
          height={280}
        >
          <ComposedChart data={data.defenceRnD} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" tick={{ ...AXIS_TICK, fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis yAxisId="bn" tick={AXIS_TICK} domain={[0, 4]} tickFormatter={(v) => `£${v}bn`} label={yAxisLabel("£bn")} />
            <YAxis yAxisId="pct" orientation="right" tick={AXIS_TICK} domain={[0, 8]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%", { angle: 90, position: "insideRight" })} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="bn" dataKey="rdBn" name="R&D (£bn)" fill={P.teal} fillOpacity={0.6} radius={[3, 3, 0, 0]} />
            <Line yAxisId="pct" type="monotone" dataKey="rdPct" name="% of budget" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
            <ReferenceLine yAxisId="pct" y={7} stroke={P.red} strokeDasharray="4 4" label={{ value: "7% target", fontSize: 10, fill: P.red, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
          </ComposedChart>
        </ChartCard>

        <div style={{ marginTop: 18 }}>
          <ChartCard
            title="Emerging Technology Commitments"
            subtitle="Parliamentary and programme-level allocations"
            source={<>SOURCE: <a href="https://www.gov.uk/government/publications/the-strategic-defence-review-2025-making-britain-safer-secure-at-home-strong-abroad" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>Strategic Defence Review 2025</a> &middot; MoD announcements</>}
            height={Math.max(250, data.emergingTech.length * 38)}
          >
            <BarChart data={data.emergingTech} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `£${v}bn`} />
              <YAxis type="category" dataKey="area" tick={{ fontSize: 10, fill: P.textMuted }} width={isMobile ? 120 : 200} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
              <Bar dataKey="value" name="Allocation (£bn)" fill={P.teal} fillOpacity={0.7} radius={[0, 3, 3, 0]}>
                {data.emergingTech.map((d, i) => (
                  <Cell key={i} fill={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>
      </section>

      {/* Equipment Plan affordability */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Equipment Plan Affordability</h3>
        <p style={SECTION_NOTE}>
          The National Audit Office assesses the MoD's Equipment Plan for affordability each year. The Plan was assessed as
          broadly affordable between 2012 and 2014, but has been found unaffordable in most years since. The
          2023-33 Plan had a £16.9bn funding gap, the largest since reporting began in 2012.
        </p>
        <ChartCard
          title="Equipment Plan Affordability Gap"
          subtitle="National Audit Office assessed funding shortfall, £bn, 10-year plan periods"
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

      {/* Analysis */}
      <AnalysisBox>
        The MoD's Equipment Plan has been assessed as unaffordable in most years since 2015, with the
        2023-33 plan showing the largest funding gap (£{s.equipPlanGap}bn) since reporting began. Major
        programmes have experienced significant cost growth: the Type 26 frigate programme has more than
        doubled in cost, and Ajax has risen 77% while remaining on hold following safety concerns.
        Industry concentration is increasing, with BAE Systems accounting for a record {s.baeSharePct}% of
        procurement spend. Competitive procurement has fallen to {s.nonCompetitivePct > 0 ? `8%` : "8%"} of
        expenditure, while non-competitive contracts, particularly for nuclear and combat air programmes,
        now represent {s.nonCompetitivePct}% of spending. Direct small and medium enterprise engagement with MoD remains low at
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
