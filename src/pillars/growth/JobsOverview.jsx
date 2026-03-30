import { useMemo } from "react";
import {
  LineChart, Line, ComposedChart, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
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

export default function JobsOverview() {
  const isMobile = useIsMobile();
  const { data, loading, error, raw } = useJsonDataset("jobs.json");

  // Convert to population shares so employed + unemployed + inactive = 100%
  // Published unempRate uses economically active denominator; derive population share instead
  // Use integer tenths to avoid floating-point errors in Recharts stacking
  const headlineTrend = useMemo(() => {
    if (!data?.headlineTrend) return [];
    return data.headlineTrend.map((d) => {
      const empI = Math.round(d.empRate * 10);
      const unempI = Math.round((1000 - d.empRate * 10 - d.inactRate * 10));
      const inactI = 1000 - empI - unempI;
      return { ...d, empRate: empI / 10, unempShare: unempI / 10, inactRate: inactI / 10 };
    });
  }, [data]);

  const employmentType = useMemo(() => {
    if (!data?.employmentType) return [];
    return data.employmentType;
  }, [data]);

  const inactivityReasons = useMemo(() => {
    if (!data?.inactivityReasons) return [];
    return data.inactivityReasons;
  }, [data]);

  const vacancyTrend = useMemo(() => data?.vacancyTrend ?? [], [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Jobs &amp; Employment</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading employment data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Jobs &amp; Employment</h2>
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
        Jobs &amp; Employment
      </h2>
      <p style={{ ...SECTION_NOTE, margin: "0 0 24px", maxWidth: 720 }}>
        The UK has approximately {ov.totalEmployedM}m people in employment, with an
        employment rate of {ov.employmentRate}% for the 16-64 age group
        ({ov.latestPeriod}). The unemployment rate stands at {ov.unemploymentRate}%
        ({(ov.unemployedK / 1000).toFixed(1)}m people), while {ov.economicInactivityRate}%
        of the working-age population is economically inactive. Of those inactive,
        {" "}{(ov.longTermSickK / 1000).toFixed(1)}m are long-term sick, a figure that has
        risen by approximately 800,000 since 2019. Median annual pay for full-time
        employees is {"\u00A3"}{ov.medianAnnualPayFT.toLocaleString()}.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        <MetricCard
          label="Employment rate"
          value={`${ov.employmentRate}%`}
          change="Ages 16-64"
          color={P.teal}
          delay={0}
        />
        <MetricCard
          label="Unemployment"
          value={`${ov.unemploymentRate}%`}
          change={`${(ov.unemployedK / 1000).toFixed(1)}m people`}
          color={P.navy}
          delay={0.05}
        />
        <MetricCard
          label="Long-term sick"
          value={`${(ov.longTermSickK / 1000).toFixed(1)}m`}
          change="Not in unemployment figures"
          color={P.red}
          delay={0.1}
        />
      </div>

      {/* Employment & Unemployment Trends */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Employment &amp; Unemployment Trends</h3>
        <p style={SECTION_NOTE}>
          Working-age population (16-64) shown as three mutually exclusive groups
          that sum to 100%. Unemployment is expressed as a share of the total population
          rather than the published rate (which uses the economically active as its denominator).
        </p>

        <ChartCard
          title="Working-Age Population Breakdown"
          subtitle="United Kingdom, % of 16-64 population, 1992-2025"
          source={sourceFrom(raw, "headlineTrend")}
          legend={[
            { key: "empRate", label: "Employed", color: P.teal },
            { key: "unempShare", label: "Unemployed", color: P.red },
            { key: "inactRate", label: "Economically inactive", color: P.textLight },
          ]}
          height={360}
        >
          <AreaChart data={headlineTrend} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1992, 2025]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              allowDataOverflow
              label={yAxisLabel("% of 16-64")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${Math.round(v * 10) / 10}%`} />} />
            <Area type="monotone" dataKey="empRate" stackId="pop" fill={P.teal} fillOpacity={0.4} stroke={P.teal} strokeWidth={1.5} name="Employed" />
            <Area type="monotone" dataKey="unempShare" stackId="pop" fill={P.red} fillOpacity={0.4} stroke={P.red} strokeWidth={1.5} name="Unemployed" />
            <Area type="monotone" dataKey="inactRate" stackId="pop" fill={P.textLight} fillOpacity={0.3} stroke={P.textLight} strokeWidth={1.5} name="Economically inactive" />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Economic Inactivity by Reason */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Economic Inactivity by Reason</h3>
        <p style={SECTION_NOTE}>
          People who are neither employed nor actively seeking work are classified as
          economically inactive. Long-term sickness has risen from approximately 2.0m
          pre-pandemic to 2.8m, accounting for much of the increase in overall inactivity.
          This group is not counted in the unemployment rate.
        </p>

        <ChartCard
          title="Economically Inactive by Reason"
          subtitle="United Kingdom, 16-64, thousands, 2004-2025"
          source={sourceFrom(raw, "inactivityReasons")}
          legend={[
            { key: "longTermSick", label: "Long-term sick", color: P.red },
            { key: "student", label: "Student", color: P.navy },
            { key: "lookingAfterFamily", label: "Looking after family/home", color: P.sienna },
            { key: "retired", label: "Retired", color: P.teal },
            { key: "other", label: "Other", color: P.textLight },
          ]}
          height={360}
        >
          <AreaChart data={inactivityReasons} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2004, 2025]}
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
            <ReferenceLine
              x={2020}
              stroke={P.grey}
              strokeDasharray="4 4"
              label={{
                value: "COVID-19",
                fontSize: 10,
                fill: P.grey,
                position: "insideTopRight",
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Area type="monotone" dataKey="longTermSick" stackId="inact" fill={P.red} fillOpacity={0.3} stroke={P.red} strokeWidth={1.5} name="Long-term sick" />
            <Area type="monotone" dataKey="student" stackId="inact" fill={P.navy} fillOpacity={0.2} stroke={P.navy} strokeWidth={1.5} name="Student" />
            <Area type="monotone" dataKey="lookingAfterFamily" stackId="inact" fill={P.sienna} fillOpacity={0.2} stroke={P.sienna} strokeWidth={1.5} name="Looking after family/home" />
            <Area type="monotone" dataKey="retired" stackId="inact" fill={P.teal} fillOpacity={0.2} stroke={P.teal} strokeWidth={1.5} name="Retired" />
            <Area type="monotone" dataKey="other" stackId="inact" fill={P.textLight} fillOpacity={0.2} stroke={P.textLight} strokeWidth={1.5} name="Other" />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Employment by Type */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Employment by Type</h3>
        <p style={SECTION_NOTE}>
          Total UK employment broken down by employees, self-employed, and unpaid family
          workers. Employee jobs account for the large majority of total employment. Self-employment
          peaked at around 4.9m in 2019 and has since declined. Data from the Labour Force Survey.
        </p>

        <ChartCard
          title="Employment by Type"
          subtitle="United Kingdom, thousands, 2000-2025"
          source={sourceFrom(raw, "employmentType")}
          legend={[
            { key: "employees", label: "Employees", color: P.teal },
            { key: "selfEmployed", label: "Self-employed", color: P.navy },
            { key: "unpaidFamily", label: "Unpaid family workers", color: P.sienna },
          ]}
          height={360}
        >
          <ComposedChart data={employmentType} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2000, 2025]}
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
            <Area
              type="monotone"
              dataKey="employees"
              stackId="emp"
              fill={P.teal}
              fillOpacity={0.3}
              stroke={P.teal}
              strokeWidth={1.5}
              name="Employees"
            />
            <Area
              type="monotone"
              dataKey="selfEmployed"
              stackId="emp"
              fill={P.navy}
              fillOpacity={0.3}
              stroke={P.navy}
              strokeWidth={1.5}
              name="Self-employed"
            />
            <Area
              type="monotone"
              dataKey="unpaidFamily"
              stackId="emp"
              fill={P.sienna}
              fillOpacity={0.3}
              stroke={P.sienna}
              strokeWidth={1.5}
              name="Unpaid family workers"
            />
          </ComposedChart>
        </ChartCard>
      </section>

      {/* Vacancy Trends */}
      {vacancyTrend.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Vacancy Trends</h3>
          <p style={SECTION_NOTE}>
            Total UK vacancies, annual average. Vacancies spiked to a record 1.3 million
            in 2022 as the economy reopened after COVID, and have since fallen back toward
            pre-pandemic levels.
          </p>

          <ChartCard
            title="UK Vacancies"
            subtitle="United Kingdom, thousands, annual average, 2001-2025"
            source={sourceFrom(raw, "vacancyTrend")}
            height={300}
          >
            <LineChart data={vacancyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="year"
                type="number"
                domain={[2001, 2025]}
                tick={AXIS_TICK_MONO}
                tickLine={false}
                tickFormatter={(v) => String(v)}
              />
              <YAxis
                tick={AXIS_TICK_MONO}
                tickLine={false}
                axisLine={false}
                domain={[0, 1400]}
                label={yAxisLabel("thousands")}
              />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v.toLocaleString()}K`} />} />
              <ReferenceLine
                x={2008}
                stroke={P.grey}
                strokeDasharray="4 4"
                label={{ value: "Financial crisis", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }}
              />
              <ReferenceLine
                x={2020}
                stroke={P.grey}
                strokeDasharray="4 4"
                label={{ value: "COVID-19", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }}
              />
              <Line type="monotone" dataKey="vacanciesK" stroke={P.teal} strokeWidth={2.5} dot={false} name="Vacancies" />
            </LineChart>
          </ChartCard>
        </section>
      )}

      {/* Analysis */}
      <AnalysisBox>
        The UK labour market has approximately {ov.totalEmployedM} million people in
        employment, with an employment rate of {ov.employmentRate}%. Unemployment stands
        at {ov.unemploymentRate}%, broadly in line with the pre-pandemic average. However,
        the headline unemployment rate understates the number of people outside the workforce:
        {" "}{(ov.longTermSickK / 1000).toFixed(1)}m working-age people are economically inactive
        due to long-term sickness, up from approximately 2.0m before the pandemic. This group
        is not counted in the unemployment figures. Economic inactivity overall, at{" "}
        {ov.economicInactivityRate}%, remains higher than the 2019 level of 21.2%.
        Self-employment peaked in 2019 and has not recovered to pre-pandemic levels.
      </AnalysisBox>
    </div>
  );
}
