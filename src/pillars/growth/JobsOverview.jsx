import { useMemo } from "react";
import {
  LineChart, Line, ComposedChart, Area,
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

  const headlineTrend = useMemo(() => {
    if (!data?.headlineTrend) return [];
    return data.headlineTrend;
  }, [data]);

  const employmentType = useMemo(() => {
    if (!data?.employmentType) return [];
    return data.employmentType;
  }, [data]);

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
        of the working-age population is economically inactive. Median annual pay for
        full-time employees is {"\u00A3"}{ov.medianAnnualPayFT.toLocaleString()}.
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 36 }}>
        <MetricCard
          label="Total employed"
          value={`${ov.totalEmployedM}m`}
          change={ov.latestPeriod}
          color={P.teal}
          delay={0}
        />
        <MetricCard
          label="Employment rate"
          value={`${ov.employmentRate}%`}
          change="Ages 16-64"
          color={P.navy}
          delay={0.05}
        />
        <MetricCard
          label="Unemployment rate"
          value={`${ov.unemploymentRate}%`}
          change={`${(ov.unemployedK / 1000).toFixed(1)}m unemployed`}
          color={P.red}
          delay={0.1}
        />
        <MetricCard
          label="Economic inactivity"
          value={`${ov.economicInactivityRate}%`}
          change="Ages 16-64"
          color={P.sienna}
          delay={0.15}
        />
      </div>

      {/* Employment & Unemployment Trends */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Employment &amp; Unemployment Trends</h3>
        <p style={SECTION_NOTE}>
          Annual average rates from the Labour Force Survey covering the UK working-age
          population (16-64). The employment rate is plotted on a separate right-hand
          axis (60-80%) to show its trend alongside unemployment and inactivity rates
          (left axis, 0-30%).
        </p>

        <ChartCard
          title="Employment, Unemployment & Inactivity Rates"
          subtitle="United Kingdom, %, 1992-2025"
          source={sourceFrom(raw, "headlineTrend")}
          legend={[
            { key: "empRate", label: "Employment rate (right axis)", color: P.teal },
            { key: "unempRate", label: "Unemployment rate", color: P.red },
            { key: "inactRate", label: "Inactivity rate", color: P.textLight },
          ]}
          height={360}
        >
          <LineChart data={headlineTrend} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
              yAxisId="left"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 30]}
              label={yAxisLabel("%")}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[60, 80]}
              label={yAxisLabel("%", { angle: 90, position: "insideRight" })}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={2020}
              yAxisId="left"
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
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="empRate"
              stroke={P.teal}
              strokeWidth={2}
              dot={false}
              name="Employment rate"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="unempRate"
              stroke={P.red}
              strokeWidth={2}
              dot={false}
              name="Unemployment rate"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="inactRate"
              stroke={P.textLight}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="Inactivity rate"
            />
          </LineChart>
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

      {/* Analysis */}
      <AnalysisBox>
        The UK labour market has approximately 33.1 million people in employment,
        with an employment rate of 75.1%. Unemployment stands at 4.4%, broadly in
        line with the pre-pandemic average. Economic inactivity, at 21.5%, remains
        higher than the 2019 level of 21.2%. The composition of employment has
        shifted: health and social work is now the largest sector by workforce
        jobs, while manufacturing employment has roughly halved since 1996. Self-employment
        peaked in 2019 and has not recovered to pre-pandemic levels. Median full-time
        pay reached {"\u00A3"}{ov.medianAnnualPayFT.toLocaleString()} in 2025, and the
        gender pay gap has narrowed to {ov.genderPayGapPct}%, down from 17.4% in 1997.
      </AnalysisBox>
    </div>
  );
}
