import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK,
  yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const TREND_LINES = [
  { key: "health",        label: "Health & social work",    color: P.teal },
  { key: "retail",        label: "Wholesale & retail",      color: P.textLight },
  { key: "profServices",  label: "Professional services",   color: P.sienna },
  { key: "manufacturing", label: "Manufacturing",           color: P.red },
  { key: "construction",  label: "Construction",            color: P.yellow },
  { key: "hospitality",   label: "Hospitality",             color: P.grey },
  { key: "ict",           label: "Information & comms",     color: P.navy },
];

export default function JobsSectors() {
  const { data, loading, error, raw } = useJsonDataset("jobs.json");

  // Filter bySector to those with at least 100K employees
  const sectorBars = useMemo(() => {
    if (!data?.bySector) return [];
    return data.bySector.filter((d) => d.employeesK >= 100);
  }, [data]);

  // Total employment across all sectors (for tooltip percentage)
  const totalEmployeesK = useMemo(() => {
    if (!data?.bySector) return 0;
    return data.bySector.reduce((sum, d) => sum + d.employeesK, 0);
  }, [data]);

  // Shorten long SIC labels for the bar chart
  const sectorBarsFormatted = useMemo(() => {
    return sectorBars.map((d) => ({
      ...d,
      shortLabel: d.label
        .replace(/^[A-Z] : /, "")
        .replace(/;.*$/, ""),
    }));
  }, [sectorBars]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>
          Employment by Sector
        </h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>
          Employment by Sector
        </h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  // Sector trend: latest year vs earliest year for manufacturing
  const trendData = data.sectorTrend;
  const earliest = trendData[0];
  const latest = trendData[trendData.length - 1];
  const mfgChange = earliest && latest
    ? ((latest.manufacturing - earliest.manufacturing) / earliest.manufacturing * 100).toFixed(0)
    : null;
  const healthChange = earliest && latest
    ? ((latest.health - earliest.health) / earliest.health * 100).toFixed(0)
    : null;

  // Earnings: highest and lowest paying
  const highestPay = data.earningsBySector[0];
  const lowestPay = data.earningsBySector[data.earningsBySector.length - 1];

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Employment by Sector
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        The composition of UK employment across industries, how it has shifted over time,
        and how median pay varies by sector.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Total employed" value={`${s.totalEmployedM}m`} change={s.latestPeriod} />
        <MetricCard label="Employment rate" value={`${s.employmentRate}%`} change="Ages 16-64" />
        <MetricCard label="Median pay (FT)" value={`£${s.medianAnnualPayFT.toLocaleString()}`} change="Annual gross, 2025" />
        <MetricCard label="Vacancies" value={`${s.vacanciesK.toLocaleString()}K`} change={s.latestPeriod} />
      </div>

      {/* Section 1: Employment by Industry */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Employment by Industry</h3>
        <p style={SECTION_NOTE}>
          Employee jobs by SIC 2007 industry section in England, 2024 (provisional BRES data).
          Sectors with fewer than 100,000 employees are excluded for clarity.
        </p>
        <ChartCard
          title="Employment by Industry Sector"
          subtitle="England, employee jobs by SIC section, 2024 (thousands)"
          source={sourceFrom(raw, "bySector")}
          height={Math.max(400, sectorBarsFormatted.length * 48)}
        >
          <BarChart
            data={sectorBarsFormatted}
            layout="vertical"
            margin={{ left: 220, right: 40, top: 10, bottom: 10 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickFormatter={(v) => `${v.toLocaleString()}K`}
              label={yAxisLabel("Employees (thousands)", { angle: 0, position: "insideBottom" })}
            />
            <YAxis
              type="category"
              dataKey="shortLabel"
              tick={{ ...AXIS_TICK, fontSize: 11 }}
              width={210}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v, name, entry) => {
                    const pct = totalEmployeesK
                      ? ((v / totalEmployeesK) * 100).toFixed(1)
                      : "—";
                    return `${v.toLocaleString()}K (${pct}% of total)`;
                  }}
                />
              }
            />
            <Bar dataKey="employeesK" fill={P.teal} name="Employees" isAnimationActive={false} />
          </BarChart>
        </ChartCard>
      </section>

      {/* Section 2: Sector Trends */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Sector Trends</h3>
        <p style={SECTION_NOTE}>
          Workforce jobs in selected major industries, UK, seasonally adjusted, 1996 to 2024.
          The data shows the long-term shift from manufacturing toward health, professional
          services, and technology.
        </p>
        <ChartCard
          title="Workforce Jobs by Sector"
          subtitle="UK, seasonally adjusted, thousands, 1996-2024"
          source={sourceFrom(raw, "sectorTrend")}
          legend={TREND_LINES}
          height={400}
        >
          <LineChart
            data={trendData}
            margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
          >
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1996, 2024]}
              tick={AXIS_TICK}
              tickFormatter={(v) => v}
            />
            <YAxis
              tick={AXIS_TICK}
              domain={[0, 5000]}
              tickFormatter={(v) => v.toLocaleString()}
              label={yAxisLabel("Jobs (thousands)")}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) => `${v?.toLocaleString()}K`}
                />
              }
            />
            {TREND_LINES.map(({ key, label, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={key === "health" || key === "manufacturing" ? 2.5 : 1.5}
                dot={false}
                name={label}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartCard>
      </section>

      {/* Section 3: Median Pay by Sector */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Median Pay by Sector</h3>
        <p style={SECTION_NOTE}>
          Median annual gross pay for full-time employees by SIC 2007 industry section,
          UK, provisional April 2025. Pay varies more than two-fold across sectors, from
          accommodation and food services to mining and quarrying.
        </p>
        <ChartCard
          title="Median Annual Pay by Sector"
          subtitle="UK, full-time employees, gross annual pay, 2025 (provisional)"
          source={sourceFrom(raw, "earningsBySector")}
          height={Math.max(450, data.earningsBySector.length * 30)}
        >
          <BarChart
            data={data.earningsBySector}
            layout="vertical"
            margin={{ left: 200, right: 40, top: 10, bottom: 10 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              domain={[0, "auto"]}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}K`}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ ...AXIS_TICK, fontSize: 11 }}
              width={190}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) => `£${v?.toLocaleString()}`}
                />
              }
            />
            <Bar dataKey="medianAnnual" fill={P.navy} name="Median annual pay" isAnimationActive={false} />
          </BarChart>
        </ChartCard>
      </section>

      {/* Context */}
      <AnalysisBox color={P.teal}>
        The UK employed {s.totalEmployedM} million people as of {s.latestPeriod}, with an
        employment rate of {s.employmentRate}% among those aged 16-64. Health and social work
        is the largest employer by SIC section, while professional services, ICT, and
        construction have all expanded since the mid-1990s. Manufacturing employment
        has declined{mfgChange ? ` by ${Math.abs(mfgChange)}%` : ""} since 1996, though it
        remains a significant employer. Median full-time pay ranges from £{lowestPay?.medianAnnual?.toLocaleString()} in {lowestPay?.label?.toLowerCase()} to £{highestPay?.medianAnnual?.toLocaleString()} in {highestPay?.label?.toLowerCase()}, a
        ratio of {(highestPay?.medianAnnual / lowestPay?.medianAnnual).toFixed(1)} to 1.
      </AnalysisBox>
    </div>
  );
}
