import { useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, GRID_PROPS, yAxisLabel,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import { useJsonDataset, sourceFrom, getBreaks } from "../../hooks/useDataset";
import MethodologyBreak from "../../components/MethodologyBreak";

export default function JobsSkills() {
  const { data, loading, error, raw } = useJsonDataset("jobs.json");

  const apprenticeshipStarts = useMemo(() => data?.apprenticeshipStarts ?? [], [data]);
  const apprenticeshipsByLevel = useMemo(() => data?.apprenticeshipsByLevel ?? [], [data]);
  const employerTraining = useMemo(() => data?.employerTraining ?? [], [data]);
  const workforceQuals = useMemo(() => data?.workforceQualifications ?? [], [data]);
  const empByQual = useMemo(() => data?.empRateByQualification ?? [], [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Skills & Training</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Skills & Training</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const ov = data.snapshot;
  const latestTraining = employerTraining[employerTraining.length - 1];
  const firstTraining = employerTraining[0];
  const trainingDecline = firstTraining && latestTraining
    ? Math.round((1 - latestTraining.spendPerEmployee / firstTraining.spendPerEmployee) * 100)
    : 0;

  // Latest qualifications data for "no qualifications" percentage
  const latestQuals = workforceQuals[workforceQuals.length - 1];
  const totalQuals = latestQuals
    ? latestQuals.degreeK + latestQuals.aLevelK + latestQuals.gcseK + latestQuals.otherK + latestQuals.noneK
    : 0;
  const noQualPct = totalQuals ? ((latestQuals?.noneK / totalQuals) * 100).toFixed(1) : "—";

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(26px, 4vw, 36px)",
        fontWeight: 600,
        color: P.text,
        margin: "0 0 6px",
      }}>
        Skills & Training
      </h2>
      <p style={{ ...SECTION_NOTE, margin: "0 0 24px", maxWidth: 720 }}>
        How Britain invests in the skills of its workforce: apprenticeships, employer
        training, and the qualification profile of the working-age population. The UK
        workforce is more formally educated than ever, but employer investment in training
        has declined for two decades and apprenticeship volumes fell sharply after the
        Apprenticeship Levy was introduced in 2017.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        <MetricCard
          label="Apprenticeship starts"
          value={`${ov.apprenticeshipStartsK}K`}
          change="England, 2023/24"
          color={P.sienna}
          delay={0}
        />
        <MetricCard
          label="Training spend / employee"
          value={`\u00A3${latestTraining?.spendPerEmployee?.toLocaleString()}`}
          change={`Down ${trainingDecline}% since ${firstTraining?.year} (real terms)`}
          color={P.red}
          delay={0.05}
        />
        <MetricCard
          label="No qualifications"
          value={`${noQualPct}%`}
          change="Working-age population"
          color={P.navy}
          delay={0.1}
        />
      </div>

      {/* Section 1: Apprenticeship Starts */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Apprenticeship Starts</h3>
        <p style={SECTION_NOTE}>
          Total apprenticeship starts and completions per academic year in England. The
          Apprenticeship Levy, introduced in April 2017, requires large employers (payroll
          over {"\u00A3"}3m) to contribute 0.5% of their pay bill. Starts fell from over 500,000
          to around 340,000 and have not recovered to pre-Levy levels.
        </p>

        <ChartCard
          title="Apprenticeship Starts & Completions"
          subtitle="England, thousands, 2010/11 - 2024/25 (academic years)"
          source={sourceFrom(raw, "apprenticeshipStarts")}
          legend={[
            { key: "startsK", label: "Starts", color: P.teal },
            { key: "completionsK", label: "Completions", color: P.sienna },
          ]}
          height={340}
        >
          <LineChart data={apprenticeshipStarts} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2010, 2024]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => `${v}/${(v + 1).toString().slice(-2)}`}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 600]}
              label={yAxisLabel("thousands")}
            />
            <Tooltip
              content={<CustomTooltip labelFormatter={(v) => `${v}/${(v + 1).toString().slice(-2)}`} />}
            />
            <MethodologyBreak breaks={getBreaks(raw, "apprenticeshipStarts")} />
            <Line type="monotone" dataKey="startsK" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3 }} name="Starts" />
            <Line type="monotone" dataKey="completionsK" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="Completions" />
          </LineChart>
        </ChartCard>
      </section>

      {/* Section 2: Apprenticeships by Level */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Apprenticeships by Level</h3>
        <p style={SECTION_NOTE}>
          The mix of apprenticeship starts has shifted toward higher levels since the Levy.
          Intermediate (Level 2) starts have fallen from 287,000 in 2014/15 to approximately
          75,000. Higher apprenticeships (Level 4+), including degree apprenticeships, have
          grown from 42,000 to 157,000, now accounting for nearly half of all starts.
        </p>

        <ChartCard
          title="Apprenticeship Starts by Level"
          subtitle="England, thousands, 2014/15 - 2024/25"
          source={sourceFrom(raw, "apprenticeshipsByLevel")}
          legend={[
            { key: "intermediateK", label: "Intermediate (Level 2)", color: P.textLight },
            { key: "advancedK", label: "Advanced (Level 3)", color: P.sienna },
            { key: "higherK", label: "Higher (Level 4+)", color: P.teal },
          ]}
          height={340}
        >
          <AreaChart data={apprenticeshipsByLevel} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2014, 2024]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => `${v}/${(v + 1).toString().slice(-2)}`}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              label={yAxisLabel("thousands")}
            />
            <Tooltip
              content={<CustomTooltip labelFormatter={(v) => `${v}/${(v + 1).toString().slice(-2)}`} />}
            />
            <Area type="monotone" dataKey="higherK" stackId="lev" fill={P.teal} fillOpacity={0.4} stroke={P.teal} strokeWidth={1.5} name="Higher (Level 4+)" />
            <Area type="monotone" dataKey="advancedK" stackId="lev" fill={P.sienna} fillOpacity={0.3} stroke={P.sienna} strokeWidth={1.5} name="Advanced (Level 3)" />
            <Area type="monotone" dataKey="intermediateK" stackId="lev" fill={P.textLight} fillOpacity={0.2} stroke={P.textLight} strokeWidth={1.5} name="Intermediate (Level 2)" />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Section 3: Employer Training */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Employer Training Investment</h3>
        <p style={SECTION_NOTE}>
          Employer spending on training per employee (in real terms) and the proportion
          of staff receiving training, from the Employer Skills Survey. Both measures
          have declined steadily. In real terms, spending per employee has fallen by
          approximately {trainingDecline}% since {firstTraining?.year}.
        </p>

        <ChartCard
          title="Employer Training Spend & Participation"
          subtitle="England, real terms (2022 prices), biennial survey"
          source={sourceFrom(raw, "employerTraining")}
          legend={[
            { key: "spendPerEmployee", label: "Spend per employee (£, left axis)", color: P.teal },
            { key: "pctTrained", label: "% staff trained (right axis)", color: P.sienna },
          ]}
          height={340}
        >
          <LineChart data={employerTraining} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2005, 2022]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              yAxisId="left"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 3000]}
              label={yAxisLabel("£ per employee")}
              tickFormatter={(v) => `£${v.toLocaleString()}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              label={yAxisLabel("%", { angle: 90, position: "insideRight" })}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="left" type="monotone" dataKey="spendPerEmployee" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3 }} name="Spend per employee (£)" />
            <Line yAxisId="right" type="monotone" dataKey="pctTrained" stroke={P.sienna} strokeWidth={2} dot={{ r: 3 }} name="% staff trained" />
          </LineChart>
        </ChartCard>
      </section>

      {/* Section 4: Workforce Qualifications */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Workforce Qualifications</h3>
        <p style={SECTION_NOTE}>
          The working-age population (16-64) by highest qualification held. The share
          with a degree has approximately doubled since 2004. The share with no
          qualifications has fallen from around 16% to 6%. The gap between these
          groups in employment outcomes remains large.
        </p>

        <ChartCard
          title="Working-Age Population by Qualification"
          subtitle="United Kingdom, thousands, 2004-2024"
          source={sourceFrom(raw, "workforceQualifications")}
          legend={[
            { key: "degreeK", label: "Degree or equivalent", color: P.teal },
            { key: "aLevelK", label: "A-level equivalent", color: P.navy },
            { key: "gcseK", label: "GCSE equivalent", color: P.sienna },
            { key: "otherK", label: "Other qualifications", color: P.textLight },
            { key: "noneK", label: "No qualifications", color: P.red },
          ]}
          height={360}
        >
          <AreaChart data={workforceQuals} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2004, 2024]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              label={yAxisLabel("thousands")}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="degreeK" stackId="q" fill={P.teal} fillOpacity={0.4} stroke={P.teal} strokeWidth={1.5} name="Degree or equivalent" />
            <Area type="monotone" dataKey="aLevelK" stackId="q" fill={P.navy} fillOpacity={0.3} stroke={P.navy} strokeWidth={1.5} name="A-level equivalent" />
            <Area type="monotone" dataKey="gcseK" stackId="q" fill={P.sienna} fillOpacity={0.2} stroke={P.sienna} strokeWidth={1.5} name="GCSE equivalent" />
            <Area type="monotone" dataKey="otherK" stackId="q" fill={P.textLight} fillOpacity={0.15} stroke={P.textLight} strokeWidth={1.5} name="Other qualifications" />
            <Area type="monotone" dataKey="noneK" stackId="q" fill={P.red} fillOpacity={0.2} stroke={P.red} strokeWidth={1.5} name="No qualifications" />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Section 5: Employment by Qualification */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Qualification and Employment</h3>
        <p style={SECTION_NOTE}>
          Employment rate (16-64) by highest qualification level. The gradient is steep:
          degree holders have an employment rate of 87%, compared to 47% for those with
          no qualifications, a gap of 40 percentage points.
        </p>

        <ChartCard
          title="Employment Rate by Qualification"
          subtitle="United Kingdom, % of 16-64, 2024"
          source={sourceFrom(raw, "empRateByQualification")}
          height={260}
        >
          <BarChart
            data={empByQual}
            layout="vertical"
            margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={AXIS_TICK_MONO}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="level"
              tick={{ ...AXIS_TICK_MONO, fontSize: 10 }}
              width={160}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
            <Bar dataKey="empRate" fill={P.teal} name="Employment rate" isAnimationActive={false} />
          </BarChart>
        </ChartCard>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        Apprenticeship starts fell by approximately a third after the Levy was introduced
        in 2017 and have not recovered. Within that reduced total, the mix has shifted
        toward higher-level and degree apprenticeships, with fewer entry-level opportunities.
        Employer spending on training per employee has declined by {trainingDecline}% in
        real terms since {firstTraining?.year}. The workforce is more formally qualified
        than ever, with the share holding a degree approximately doubling since 2004, but
        the employment rate for those without qualifications ({empByQual[empByQual.length - 1]?.empRate}%)
        remains 40 percentage points below degree holders.
      </AnalysisBox>
    </div>
  );
}
