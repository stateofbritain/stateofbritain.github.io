import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE,
  AXIS_TICK, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const EQUIP_COLORS = [
  P.navy, P.teal, P.sienna, "#4A7A58", P.yellow, P.grey, P.red, "#607DAA",
];

export default function DefenceSpending() {
  const { data, loading, error, raw } = useJsonDataset("defence.json");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Defence Spending</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Defence Spending</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Defence Spending
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        UK defence spending trends, the NATO commitment, and how the equipment budget is allocated.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Defence spending" value={`${s.spendingPctGdp}% GDP`} change={`£${s.spendingBn}bn, ${s.spendingYear}`} color={P.navy} />
        <MetricCard label="NATO guideline" value="2.0%" change={`UK at ${s.spendingPctGdp}%`} color={P.teal} />
        <MetricCard label="New NATO target" value={`${s.newTarget}%`} change={`Set at 2025 summit`} up color={P.red} />
      </div>

      {/* Section 1: Spending % GDP */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Defence Spending (% GDP)</h3>
        <p style={SECTION_NOTE}>
          UK defence spending fell from 3.8% of GDP at the end of the Cold War to a low of 2.0%
          in 2015-16. The NATO 2% guideline has only recently been met consistently, and has now
          been raised to 2.5%.
        </p>
        <ChartCard
          title="UK Defence Spending as % of GDP"
          subtitle="% of GDP, UK"
          source={sourceFrom(raw, "spendingPctGdp")}
          height={320}
        >
            <AreaChart data={data.spendingPctGdp}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[1.5, 4.2]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("% of GDP")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}% GDP`} />} />
              <ReferenceLine y={2.0} stroke={P.grey} strokeDasharray="4 4" label={{ value: "NATO 2%", fontSize: 10, fill: P.grey, position: "right" }} />
              <ReferenceLine y={2.5} stroke={P.red} strokeDasharray="4 4" label={{ value: "New 2.5% target", fontSize: 10, fill: P.red, position: "right" }} />
              <Area type="monotone" dataKey="pct" stroke={P.navy} fill={P.navy} fillOpacity={0.12} strokeWidth={2.5} name="% GDP" dot={{ r: 2, fill: P.navy }} />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 2: Real spending */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Defence Spending (Real Terms)</h3>
        <p style={SECTION_NOTE}>
          In 2023-24 prices, defence spending fell from £46bn in 2009 to £38bn by 2016 before
          recovering. Recent increases have pushed spending to £{s.spendingBn}bn, including military
          aid to Ukraine.
        </p>
        <ChartCard
          title="UK Defence Spending in Real Terms"
          subtitle="£bn, 2023-24 prices"
          source={sourceFrom(raw, "spendingReal")}
          height={280}
        >
            <AreaChart data={data.spendingReal}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[35, 58]} tickFormatter={(v) => `£${v}bn`} label={yAxisLabel("£bn")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
              <Area type="monotone" dataKey="value" stroke={P.teal} fill={P.teal} fillOpacity={0.12} strokeWidth={2.5} name="Real spending (£bn)" dot={{ r: 2, fill: P.teal }} />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 3: Equipment plan */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Equipment Plan (10-Year)</h3>
        <p style={SECTION_NOTE}>
          The MoD's equipment plan covers £60bn over 10 years. Submarines and the nuclear
          deterrent represent the single largest commitment, reflecting the Dreadnought programme.
        </p>
        <ChartCard
          title="Defence Equipment Plan (10-Year)"
          subtitle="10-year spend by category, £bn"
          source={sourceFrom(raw, "equipmentPlan")}
          height={340}
        >
            <BarChart data={data.equipmentPlan} layout="vertical">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => `£${v}bn`} />
              <YAxis type="category" dataKey="category" tick={AXIS_TICK} width={150} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
              <Bar dataKey="value" name="10-year spend (£bn)" radius={[0, 3, 3, 0]}>
                {data.equipmentPlan.map((_, i) => (
                  <Cell key={i} fill={EQUIP_COLORS[i % EQUIP_COLORS.length]} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
        </ChartCard>
      </section>

      {/* Section 4: NATO comparison */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>NATO Spending Comparison</h3>
        <p style={SECTION_NOTE}>
          Defence spending as a share of GDP across NATO allies. Poland leads at 3.9%
          following its rapid build-up. Several major allies remain below the 2% guideline.
        </p>
        <ChartCard
          title="NATO Defence Spending Comparison"
          subtitle="Defence spending as % of GDP, NATO allies"
          source={sourceFrom(raw, "intlComparison")}
          height={340}
        >
            <BarChart data={data.intlComparison} layout="vertical">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tick={AXIS_TICK} domain={[0, 4.5]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="country" tick={AXIS_TICK} width={70} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}% GDP`} />} />
              <ReferenceLine x={2.0} stroke={P.grey} strokeDasharray="4 4" />
              <Bar dataKey="pct" name="% GDP" radius={[0, 3, 3, 0]}>
                {data.intlComparison.map((d, i) => (
                  <Cell key={i} fill={d.country === "UK" ? P.sienna : d.pct >= 2.0 ? P.navy : P.grey} fillOpacity={d.country === "UK" ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
        </ChartCard>
      </section>

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
