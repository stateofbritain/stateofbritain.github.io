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

export default function JobsNature() {
  const { data, loading, error, raw } = useJsonDataset("jobs.json");

  const occupationalChange = useMemo(() => data?.occupationalChange ?? [], [data]);
  const occupationGrowth = useMemo(() => {
    if (!data?.occupationGrowth) return [];
    return [...data.occupationGrowth].sort((a, b) => a.changeK - b.changeK);
  }, [data]);
  const selfEmployment = useMemo(() => data?.selfEmploymentDetail ?? [], [data]);
  const hoursWorked = useMemo(() => data?.hoursWorkedTrend ?? [], [data]);
  const ftPt = useMemo(() => data?.ftPtTrend ?? [], [data]);
  const zeroHours = useMemo(() => data?.zeroHoursTrend ?? [], [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Nature of Work</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Nature of Work</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const ov = data.snapshot;
  const latestOcc = occupationalChange[occupationalChange.length - 1];
  const adminTradesLoss = latestOcc && occupationalChange[0]
    ? occupationalChange[0].adminTradesK - latestOcc.adminTradesK
    : 0;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(26px, 4vw, 36px)",
        fontWeight: 600,
        color: P.text,
        margin: "0 0 6px",
      }}>
        Nature of Work
      </h2>
      <p style={{ ...SECTION_NOTE, margin: "0 0 24px", maxWidth: 720 }}>
        How the composition of UK employment has changed: the types of work people do,
        how they do it, and what has grown or disappeared. The UK labour market has
        polarised, with professional and caring roles expanding while administrative
        and manufacturing occupations have contracted.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        <MetricCard
          label="Professional & technical"
          value={`${ov.profTechSharePct}%`}
          change="Share of all employment"
          color={P.teal}
          delay={0}
        />
        <MetricCard
          label="Self-employed"
          value={`${(ov.selfEmployedK / 1000).toFixed(1)}m`}
          change="Down from 4.9m in 2019"
          color={P.navy}
          delay={0.05}
        />
        <MetricCard
          label="Admin & trades jobs lost"
          value={`${(adminTradesLoss / 1000).toFixed(1)}m`}
          change={`Since ${occupationalChange[0]?.year}`}
          color={P.red}
          delay={0.1}
        />
      </div>

      {/* Section 1: Occupational Change */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Occupational Polarisation</h3>
        <p style={SECTION_NOTE}>
          UK employment grouped into three broad categories based on SOC major occupation
          groups. Professional & managerial includes managers, professionals, and associate
          professionals. Administrative & trades covers admin, secretarial, skilled trades,
          and process operatives. Service & manual includes caring, sales, and manual
          occupations. SOC codes were reclassified in 2010 and 2020; the broad trends
          are consistent across systems but precise magnitudes are approximate.
        </p>

        <ChartCard
          title="Employment by Occupation Group"
          subtitle="United Kingdom, thousands, 2001-2024"
          source={sourceFrom(raw, "occupationalChange")}
          legend={[
            { key: "profManagerialK", label: "Professional & managerial", color: P.teal },
            { key: "adminTradesK", label: "Administrative & trades", color: P.sienna },
            { key: "serviceManualK", label: "Service & manual", color: P.textLight },
          ]}
          height={360}
        >
          <AreaChart data={occupationalChange} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2001, 2024]}
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
            <Area type="monotone" dataKey="profManagerialK" stackId="occ" fill={P.teal} fillOpacity={0.4} stroke={P.teal} strokeWidth={1.5} name="Professional & managerial" />
            <Area type="monotone" dataKey="adminTradesK" stackId="occ" fill={P.sienna} fillOpacity={0.3} stroke={P.sienna} strokeWidth={1.5} name="Administrative & trades" />
            <Area type="monotone" dataKey="serviceManualK" stackId="occ" fill={P.textLight} fillOpacity={0.2} stroke={P.textLight} strokeWidth={1.5} name="Service & manual" />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Section 2: Fastest Growing & Shrinking */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>What's Growing, What's Dying</h3>
        <p style={SECTION_NOTE}>
          Net change in employment by SOC 2-digit occupation group between 2004 and 2024.
          SOC codes were reclassified in 2010 and 2020, so part of the apparent change
          in some categories reflects reclassification rather than genuine shifts. The
          broad direction, growth in professional and caring roles, decline in
          secretarial and process work, is consistent across classification systems,
          but the precise magnitudes should be treated as indicative.
        </p>

        <ChartCard
          title="Change in Employment by Occupation"
          subtitle="United Kingdom, thousands, 2004 vs 2024"
          source={sourceFrom(raw, "occupationGrowth")}
          height={Math.max(400, occupationGrowth.length * 30)}
        >
          <BarChart
            data={occupationGrowth}
            layout="vertical"
            margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK_MONO}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}K`}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ ...AXIS_TICK_MONO, fontSize: 10 }}
              width={160}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v, name, entry) => {
                    if (name === "changeK") return `${v > 0 ? "+" : ""}${v.toLocaleString()}K`;
                    return `${v.toLocaleString()}K`;
                  }}
                />
              }
            />
            <ReferenceLine x={0} stroke={P.border} />
            <Bar
              dataKey="changeK"
              name="Change 2004-2024"
              isAnimationActive={false}
              fill={P.teal}
              shape={(props) => {
                const { x, y, width, height, value } = props;
                const absW = Math.abs(width);
                const barX = width < 0 ? x + width : x;
                return (
                  <rect
                    x={barX}
                    y={y}
                    width={absW}
                    height={height}
                    fill={value >= 0 ? P.teal : P.red}
                    opacity={0.7}
                    rx={1}
                  />
                );
              }}
            />
          </BarChart>
        </ChartCard>
      </section>

      {/* Section 3: Self-Employment */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Self-Employment</h3>
        <p style={SECTION_NOTE}>
          Self-employment split between those with employees (business owners) and solo
          self-employed (freelancers, contractors, gig workers). Solo self-employment drove
          the pre-2019 rise and the post-COVID decline. The number of self-employed with
          employees has been falling since 2008.
        </p>

        <ChartCard
          title="Self-Employment by Type"
          subtitle="United Kingdom, thousands, 2000-2025"
          source={sourceFrom(raw, "selfEmploymentDetail")}
          legend={[
            { key: "soloK", label: "Solo / freelance", color: P.sienna },
            { key: "withEmployeesK", label: "With employees", color: P.teal },
          ]}
          height={340}
        >
          <AreaChart data={selfEmployment} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
            <ReferenceLine
              x={2020}
              stroke={P.grey}
              strokeDasharray="4 4"
              label={{ value: "COVID-19", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }}
            />
            <Area type="monotone" dataKey="withEmployeesK" stackId="se" fill={P.teal} fillOpacity={0.3} stroke={P.teal} strokeWidth={1.5} name="With employees" />
            <Area type="monotone" dataKey="soloK" stackId="se" fill={P.sienna} fillOpacity={0.3} stroke={P.sienna} strokeWidth={1.5} name="Solo / freelance" />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Section 4: Hours and Intensity */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Hours and Intensity</h3>
        <p style={SECTION_NOTE}>
          Average actual weekly hours worked have declined gradually since the early 1990s.
          The average masks a widening gap between full-time hours (declining slowly) and
          part-time hours (broadly stable). COVID caused a step-change; hours have not
          fully recovered.
        </p>

        <ChartCard
          title="Average Weekly Hours Worked"
          subtitle="United Kingdom, hours, 1992-2025"
          source={sourceFrom(raw, "hoursWorkedTrend")}
          legend={[
            { key: "ftHours", label: "Full-time", color: P.teal },
            { key: "allHours", label: "All workers", color: P.navy },
            { key: "ptHours", label: "Part-time", color: P.textLight },
          ]}
          height={340}
        >
          <LineChart data={hoursWorked} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
              domain={[0, 45]}
              label={yAxisLabel("hours/week")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v} hrs`} />} />
            <Line type="monotone" dataKey="ftHours" stroke={P.teal} strokeWidth={2} dot={false} name="Full-time" />
            <Line type="monotone" dataKey="allHours" stroke={P.navy} strokeWidth={2} dot={false} name="All workers" />
            <Line type="monotone" dataKey="ptHours" stroke={P.textLight} strokeWidth={2} strokeDasharray="6 3" dot={false} name="Part-time" />
          </LineChart>
        </ChartCard>
      </section>

      {/* Section 5: Full-Time vs Part-Time */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Full-Time vs Part-Time</h3>
        <p style={SECTION_NOTE}>
          Full-time and part-time employment, seasonally adjusted. Part-time
          employment grew steadily from 6.2m in 1992 to 8.5m in 2019, then fell
          during COVID and has stabilised at around 7.9m.
        </p>

        <ChartCard
          title="Employment by Working Pattern"
          subtitle="United Kingdom, thousands, 1992-2025"
          source={sourceFrom(raw, "ftPtTrend")}
          legend={[
            { key: "fullTimeK", label: "Full-time", color: P.teal },
            { key: "partTimeK", label: "Part-time", color: P.sienna },
          ]}
          height={340}
        >
          <AreaChart data={ftPt} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
              domain={[0, "auto"]}
              label={yAxisLabel("thousands")}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="fullTimeK" stackId="fp" fill={P.teal} fillOpacity={0.3} stroke={P.teal} strokeWidth={1.5} name="Full-time" />
            <Area type="monotone" dataKey="partTimeK" stackId="fp" fill={P.sienna} fillOpacity={0.3} stroke={P.sienna} strokeWidth={1.5} name="Part-time" />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Section 6: Zero-Hours Contracts */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Zero-Hours Contracts</h3>
        <p style={SECTION_NOTE}>
          The number of people reporting a zero-hours contract as their main job. The
          sharp increase around 2013 partly reflects greater public awareness of the term
          following media coverage, rather than an equivalent increase in actual use. ONS
          notes this measurement effect in its guidance.
        </p>

        <ChartCard
          title="People on Zero-Hours Contracts"
          subtitle="United Kingdom, thousands, 2000-2025"
          source={sourceFrom(raw, "zeroHoursTrend")}
          height={300}
        >
          <LineChart data={zeroHours} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
            <Tooltip content={<CustomTooltip formatter={(v) => `${v.toLocaleString()}K`} />} />
            <MethodologyBreak breaks={getBreaks(raw, "zeroHoursTrend")} />
            <Line type="monotone" dataKey="zeroHoursK" stroke={P.sienna} strokeWidth={2.5} dot={false} name="Zero-hours contracts" />
          </LineChart>
        </ChartCard>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        The UK labour market has polarised. Professional and managerial occupations have
        expanded by over 4 million since 2001, while administrative and trades roles
        have contracted by approximately {(adminTradesLoss / 1000).toFixed(1)} million.
        Caring and personal service roles have grown, driven by the ageing population and
        expansion of health and social care. Self-employment peaked at 4.9 million in 2019
        and has fallen to {(ov.selfEmployedK / 1000).toFixed(1)} million, with the decline
        concentrated in solo self-employment. Average weekly hours have been falling for
        three decades, with the trend accelerating during COVID.
      </AnalysisBox>
    </div>
  );
}
