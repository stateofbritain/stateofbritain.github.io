import {
  BarChart, Bar, LineChart, Line, Cell, LabelList, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom, getBreaks } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

const OUTCOME_COLORS = {
  atProposed: P.sienna,
  between: P.navy,
  atCurrent: P.teal,
  belowCurrent: "#5FA394",
  aboveProposed: P.red,
  noDetermination: P.grey,
};

const monthLabel = m => new Date(`${m}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const shortMonth = m => new Date(`${m}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
// Break lines with the label to the left of the line, so it is not clipped at the right edge on phones
const breakLines = breaks => breaks.map(b => (
  <ReferenceLine key={b.at} x={b.at} stroke={P.red} strokeDasharray="4 4" strokeWidth={1.5}
    label={({ viewBox }) => (
      <text x={viewBox.x - 6} y={viewBox.y - 6} textAnchor="end" fontSize={10} fill={P.red} fontFamily="'DM Mono', monospace">
        {b.label}
      </text>
    )} />
));
const pctFmt = v => (v == null ? "–" : `${v}%`);

function Heading() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Rent Tribunal</h2>
      <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
        England &middot; First-tier Tribunal (Property Chamber)
      </span>
    </div>
  );
}

export default function RentTribunal() {
  const isMobile = useIsMobile();
  const { data, raw, loading, error } = useJsonDataset("rent-tribunal.json");

  if (loading || error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <Heading />
        <p style={{ fontSize: "13px", color: error ? P.red : P.textMuted, fontFamily: "'DM Mono', monospace" }}>
          {error ? `Failed to load data: ${error}` : "Loading rent tribunal data..."}
        </p>
      </div>
    );
  }

  const snap = data.snapshot;
  const source = sourceFrom(raw, "monthly");
  const firstMonth = data.monthly[0].month;
  const lastMonth = snap.latestMonth;
  const provisionalNote = `Months from ${monthLabel(snap.provisionalFrom)} are incomplete: decisions are published weeks or months after they are made.`;
  const outcomeTotal = data.outcomes.reduce((s, o) => s + o.decisions, 0);
  const outcomeLegend = data.outcomes.map(o => ({ key: o.key, label: o.label, color: OUTCOME_COLORS[o.key] }));
  const monthTicks = { tickFormatter: v => v.slice(0, 4), interval: isMobile ? 23 : 11 };

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <Heading />

      {/* ═══ METRICS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Market rent decisions"
          value={snap.decisionsSinceRra.toLocaleString("en-GB")}
          change={`${snap.decisionsSinceRraFrom} to ${monthLabel(lastMonth)}`}
          up={false} color={P.navy} delay={0.1}
        />
        <MetricCard
          label="Median increase proposed"
          value={`${snap.medianProposedPct}%`}
          change={`by landlords, decisions since ${snap.decisionsSinceRraFrom}`}
          up={false} color={P.sienna} delay={0.18}
        />
        <MetricCard
          label="Median increase determined"
          value={`${snap.medianDeterminedPct}%`}
          change={`by the tribunal, decisions since ${snap.decisionsSinceRraFrom}`}
          up={false} color={P.teal} delay={0.26}
        />
        <MetricCard
          label="Set below proposed rent"
          value={`${snap.belowProposedPct}%`}
          change={`of decisions since ${snap.decisionsSinceRraFrom}`}
          up={false} color={P.grey} delay={0.34}
        />
      </div>

      {/* ═══ SECTION 1 — DECISIONS PER MONTH ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Decisions per Month</h3>
        <p style={SECTION_NOTE}>
          A tenant can ask the First-tier Tribunal to set the rent when a landlord proposes an increase using a
          section 13 notice. The Renters' Rights Act 2025 changed the rules for these increases from 1 May 2026.
          The tribunal published {snap.decisionsPrevYear} market rent decisions dated {snap.decisionsPrevYearFrom},
          and {snap.decisionsSinceRra} dated {snap.decisionsSinceRraFrom} to {monthLabel(lastMonth)}.
        </p>
        <ChartCard
          title="Market Rent Decisions by Month"
          subtitle={`England, decisions by date of decision, ${monthLabel(firstMonth)} to ${monthLabel(lastMonth)}`}
          source={source}
          legend={[
            { key: "final", label: "Decisions", color: P.navy },
            { key: "prov", label: "Incomplete month", color: "rgba(28,43,69,0.3)" },
          ]}
          height={320}
        >
          <BarChart data={data.monthly} margin={{ top: 20, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} {...monthTicks} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, "auto"]} label={yAxisLabel("Decisions")} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="decisions" name="Decisions" radius={[2, 2, 0, 0]}>
              {data.monthly.map(r => <Cell key={r.month} fill={r.provisional ? "rgba(28,43,69,0.3)" : P.navy} />)}
            </Bar>
            {breakLines(getBreaks(raw, "monthly"))}
          </BarChart>
        </ChartCard>
        <p style={{ ...SECTION_NOTE, fontSize: "12px", marginTop: 8 }}>{provisionalNote}</p>
      </div>

      {/* ═══ SECTION 2 — OUTCOMES ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Outcomes</h3>
        <p style={SECTION_NOTE}>
          Each decision sets a market rent for the property, which the tribunal compares with the existing rent and
          the rent the landlord proposed. For notices served from 1 May 2026, the rent payable cannot exceed the
          landlord's proposal. Where the tribunal assessed the market rent above the proposal, the notice was
          served earlier, and in some of these decisions the rent payable is limited to the proposal. "No rent
          determined" covers applications that were withdrawn, struck out or made on an invalid notice.
        </p>
        <ChartCard
          title="Outcome of Market Rent Decisions"
          subtitle={`England, % of decisions dated ${snap.decisionsSinceRraFrom} to ${monthLabel(lastMonth)} (${outcomeTotal} decisions)`}
          source={source}
          height={isMobile ? 300 : 280}
        >
          <BarChart data={data.outcomes} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="label" tick={{ ...AXIS_TICK_MONO, fill: P.textMuted, fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} width={isMobile ? 130 : 230} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pct" name="Share of decisions" radius={[0, 3, 3, 0]}>
              {data.outcomes.map(o => <Cell key={o.key} fill={OUTCOME_COLORS[o.key]} />)}
              <LabelList dataKey="pct" position="right" formatter={pctFmt} style={{ ...AXIS_TICK_MONO, fill: P.text }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Outcomes by Month"
          subtitle={`England, % of decisions by outcome, ${monthLabel(data.outcomesByMonth[0].month)} to ${monthLabel(lastMonth)}`}
          source={source}
          legend={outcomeLegend}
          height={340}
        >
          <BarChart data={data.outcomesByMonth} margin={{ top: 20, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={shortMonth} interval={isMobile ? 3 : 1} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} label={yAxisLabel("% of decisions")} />
            <Tooltip content={<CustomTooltip />} />
            {data.outcomes.map(o => (
              <Bar key={o.key} dataKey={o.key} name={o.label} stackId="o" fill={OUTCOME_COLORS[o.key]} />
            ))}
            {breakLines(getBreaks(raw, "outcomesByMonth"))}
          </BarChart>
        </ChartCard>
        <p style={{ ...SECTION_NOTE, fontSize: "12px", marginTop: 8 }}>
          Before May 2026 the tribunal published between 15 and 50 decisions a month, so monthly shares before then
          rest on small numbers. {provisionalNote}
        </p>
      </div>

      {/* ═══ SECTION 3 — SIZE OF INCREASES ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Proposed and Determined Increases</h3>
        <p style={SECTION_NOTE}>
          The increase proposed is the landlord's proposed rent compared with the existing rent; the increase
          determined is the tribunal's rent compared with the same existing rent. Figures are medians across
          decisions where all three rents could be read from the published decision.
        </p>
        <ChartCard
          title="Median Rent Increase by Tribunal Region"
          subtitle={`England, % above existing rent, decisions dated ${snap.decisionsSinceRraFrom} to ${monthLabel(lastMonth)}`}
          source={source}
          legend={[
            { key: "p", label: "Proposed by landlord", color: P.sienna },
            { key: "d", label: "Determined by tribunal", color: P.teal },
          ]}
          height={320}
        >
          <BarChart data={data.byRegion} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, "auto"]} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="region" tick={{ ...AXIS_TICK_MONO, fill: P.textMuted }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="medianProposedPct" name="Proposed by landlord" fill={P.sienna} radius={[0, 3, 3, 0]}>
              <LabelList dataKey="medianProposedPct" position="right" formatter={pctFmt} style={{ ...AXIS_TICK_MONO, fill: P.text }} />
            </Bar>
            <Bar dataKey="medianDeterminedPct" name="Determined by tribunal" fill={P.teal} radius={[0, 3, 3, 0]}>
              <LabelList dataKey="medianDeterminedPct" position="right" formatter={pctFmt} style={{ ...AXIS_TICK_MONO, fill: P.text }} />
            </Bar>
          </BarChart>
        </ChartCard>
        <p style={{ ...SECTION_NOTE, fontSize: "12px", marginTop: 8 }}>
          Regions are the tribunal's five regional offices. Decisions with all three rents:{" "}
          {data.byRegion.map(r => `${r.region} ${r.decisions}`).join(", ")}.
        </p>

        <ChartCard
          title="Median Rent Increase by Month"
          subtitle={`England, % above existing rent, ${monthLabel(data.increasesByMonth[0].month)} to ${monthLabel(lastMonth)}`}
          source={source}
          legend={[
            { key: "p", label: "Proposed by landlord", color: P.sienna },
            { key: "d", label: "Determined by tribunal", color: P.teal },
          ]}
          height={320}
        >
          <LineChart data={data.increasesByMonth} margin={{ top: 20, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={shortMonth} interval={isMobile ? 3 : 1} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, "auto"]} tickFormatter={v => `${v}%`} label={yAxisLabel("% above existing rent")} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="medianProposedPct" name="Proposed by landlord" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="medianDeterminedPct" name="Determined by tribunal" stroke={P.teal} strokeWidth={2} dot={{ r: 3 }} />
            {breakLines(getBreaks(raw, "increasesByMonth"))}
          </LineChart>
        </ChartCard>
      </div>

      <AnalysisBox color={P.navy} label="About this data">
        Figures are built from the full text of decisions on the GOV.UK residential property tribunal decisions
        register, in the "Market rent" category. Rents are read automatically from each decision and converted to
        monthly amounts; {snap.classifiedPct}% of decisions since {snap.decisionsSinceRraFrom} could be classified,
        and the rest are excluded from the outcome and increase figures. Only decisions that reach the tribunal
        and are published are counted: most rent increases are agreed without an application, and many
        applications are settled or withdrawn before a hearing.
      </AnalysisBox>
    </div>
  );
}
