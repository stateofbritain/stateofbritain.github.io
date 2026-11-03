import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area, Cell, LabelList, ReferenceLine,
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
const quarterLabel = q => `${q.slice(5)} ${q.slice(0, 4)}`;
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
  const provisionalNote = `Months from ${monthLabel(snap.provisionalFrom)} are incomplete: ${Math.round(snap.publishedWithin60Pct)}% of decisions are published within 60 days of being made and ${Math.round(snap.publishedWithin180Pct)}% within 180 days.`;
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

        <ChartCard
          style={{ marginTop: 24 }}
          title="Time From Decision to Publication"
          subtitle={`England, % of decisions published on the register within each period, decisions dated ${monthLabel(snap.publicationCohortFrom)} to ${monthLabel(snap.publicationCohortTo)}`}
          source={source}
          height={280}
        >
          <BarChart data={data.publicationLag} margin={{ top: 20, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="days" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={v => `${v} days`} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} label={yAxisLabel("% published")} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pct" name="% published" fill={P.teal} radius={[2, 2, 0, 0]}>
              <LabelList dataKey="pct" position="top" formatter={v => `${Math.round(v)}%`} style={{ ...AXIS_TICK_MONO, fill: P.text }} />
            </Bar>
          </BarChart>
        </ChartCard>
        <p style={{ ...SECTION_NOTE, fontSize: "12px", marginTop: 8 }}>
          Decisions appear on the register some time after they are made, so counts for recent months rise as
          more are published. This chart uses decisions made at least a year ago, nearly all of which have now been
          published, to show how long publication takes. On that basis, months from {monthLabel(snap.provisionalFrom)} in
          the chart above are incomplete and are shaded lighter.
        </p>
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

      {/* ═══ SECTION 4 — TIME TO DECISION ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Time to Decision</h3>
        <p style={SECTION_NOTE}>
          Most decisions state the date the tenant referred the landlord's notice to the tribunal. For decisions
          dated {snap.decisionsPrevYearFrom}, the median time from referral to decision was{" "}
          {snap.medianWaitDaysPrevYear} days; for decisions dated since {snap.decisionsSinceRraFrom} it
          is {snap.medianWaitDaysSinceRra} days. These figures cover decided cases only and do not show how long
          open cases have been waiting. The Ministry of Justice's{" "}
          <a href="https://www.gov.uk/government/collections/tribunals-statistics" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>quarterly
          tribunal statistics</a> show the open caseload for all residential property cases rising since 2025.
        </p>
        <ChartCard
          title="Time From Referral to Decision"
          subtitle={`England, days, by quarter of decision, ${quarterLabel(data.timeToDecision[0].quarter)} to ${quarterLabel(data.timeToDecision.at(-1).quarter)}`}
          source={source}
          legend={[
            { key: "m", label: "Median", color: P.navy },
            { key: "r", label: "IQR", color: "rgba(28,43,69,0.15)" },
          ]}
          height={320}
        >
          <ComposedChart data={data.timeToDecision} margin={{ top: 20, right: 30, left: isMobile ? 0 : 10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={isMobile ? q => `${q.slice(5)} '${q.slice(2, 4)}` : quarterLabel} interval={isMobile ? 1 : 0} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, "auto"]} label={yAxisLabel("Days")} />
            <Tooltip content={<CustomTooltip />} />
            <Area dataKey={d => [d.p25Days, d.p75Days]} name="IQR (days)" fill={P.navy} fillOpacity={0.12} stroke="none" isAnimationActive={false} />
            <Line type="monotone" dataKey="medianDays" name="Median (days)" stroke={P.navy} strokeWidth={2} dot={{ r: 3 }} />
            {breakLines(getBreaks(raw, "timeToDecision"))}
          </ComposedChart>
        </ChartCard>
        <p style={{ ...SECTION_NOTE, fontSize: "12px", marginTop: 8 }}>
          IQR is the interquartile range: the middle 50% of decisions by time taken.
          Referral dates could be read for {snap.waitDatedPct}% of decisions since {snap.decisionsSinceRraFrom}.
          Before {quarterLabel(data.timeToDecision.find(q => q.quarter >= "2026-Q2")?.quarter ?? "2026-Q2")}, each quarter's figure
          rests on {Math.min(...data.timeToDecision.filter(q => q.quarter < "2026-Q2").map(q => q.decisions))} to{" "}
          {Math.max(...data.timeToDecision.filter(q => q.quarter < "2026-Q2").map(q => q.decisions))} decisions.
          {" "}{quarterLabel(data.timeToDecision.find(q => q.provisional)?.quarter ?? data.timeToDecision.at(-1).quarter)} is
          incomplete because many of its decisions are not yet published.
        </p>
      </div>

      <AnalysisBox color={P.navy} label="About this data">
        Figures are built from the full text of decisions on the GOV.UK residential property tribunal decisions
        register, in the "Market rent" category. Rents are read automatically from each decision and converted to
        monthly amounts; {snap.classifiedPct}% of decisions since {snap.decisionsSinceRraFrom} could be classified,
        and the rest are excluded from the outcome and increase figures. Only decisions that reach the tribunal
        and are published are counted: most rent increases are agreed without an application, and many
        applications are settled or withdrawn before a hearing.
        {" "}The number of rent applications waiting to be decided is not currently published. The Ministry of
        Justice's <a href="https://www.gov.uk/government/collections/tribunals-statistics" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>quarterly
        tribunal statistics</a> report open cases for residential property tribunals as a whole, without a breakdown
        by case type.
      </AnalysisBox>
    </div>
  );
}
