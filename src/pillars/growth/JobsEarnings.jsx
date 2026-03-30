import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import AnalysisBox from "../../components/AnalysisBox";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const fmtGBP = (v) => `£${(v / 1000).toFixed(0)}k`;
const fmtGBPFull = (v) => `£${Number(v).toLocaleString("en-GB")}`;

export default function JobsEarnings() {
  const { data, loading, error, raw } = useJsonDataset("jobs.json");

  const earningsTrend = useMemo(() => data?.earningsTrend ?? [], [data]);
  const realEarningsTrend = useMemo(() => data?.realEarningsTrend ?? [], [data]);
  const productivityPayGap = useMemo(() => data?.productivityPayGap ?? [], [data]);
  const genderPayGap = useMemo(() => data?.genderPayGap ?? [], [data]);

  const earningsByOccupation = useMemo(() => {
    if (!data?.earningsByOccupation) return [];
    return [...data.earningsByOccupation].sort(
      (a, b) => a.medianAnnual - b.medianAnnual
    );
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Earnings</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Earnings</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const snap = data.snapshot ?? {};
  const medianPay = snap.medianAnnualPayFT;
  const gapPct = snap.genderPayGapPct;

  const latestEarnings = earningsTrend[earningsTrend.length - 1];
  const firstEarnings = earningsTrend[0];

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Earnings
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Median full-time annual gross pay in the UK stands at {fmtGBPFull(medianPay)},
        as recorded by the Annual Survey of Hours and Earnings (ASHE).
        The median gender pay gap for full-time employees is {gapPct}%.
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard
          label="Median annual pay (FT)"
          value={fmtGBPFull(medianPay)}
          sub="Provisional, April 2025"
          color={P.teal}
        />
        <MetricCard
          label="Gender pay gap"
          value={`${gapPct}%`}
          sub="Median, full-time, 2025"
          color={P.sienna}
        />
        <MetricCard
          label="Male median pay"
          value={fmtGBPFull(latestEarnings?.medianMale)}
          sub={`${latestEarnings?.year}, full-time`}
          color={P.navy}
        />
      </div>

      {/* Section 1: Median Earnings Trend */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Median Earnings Trend</h3>
        <p style={SECTION_NOTE}>
          Median annual gross pay for full-time employees in the UK, by sex, from ASHE.
          Data covers {firstEarnings?.year} to {latestEarnings?.year}. Values are nominal (not adjusted for inflation).
        </p>

        <ChartCard
          title="Median Annual Gross Pay (Full-Time)"
          subtitle={`United Kingdom, £, ${firstEarnings?.year}-${latestEarnings?.year}`}
          source={sourceFrom(raw, "earningsTrend")}
          legend={[
            { key: "median", label: "All", color: P.teal },
            { key: "medianMale", label: "Male", color: P.navy },
            { key: "medianFemale", label: "Female", color: P.sienna },
          ]}
          height={340}
        >
          <LineChart data={earningsTrend}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1997, 2025]}
              tick={AXIS_TICK}
              tickCount={8}
            />
            <YAxis
              domain={[0, 50000]}
              tick={AXIS_TICK}
              tickFormatter={fmtGBP}
              label={yAxisLabel("Annual pay (£)")}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) => fmtGBPFull(v)}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke={P.teal}
              strokeWidth={2.5}
              dot={false}
              name="All"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="medianMale"
              stroke={P.navy}
              strokeWidth={2}
              dot={false}
              name="Male"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="medianFemale"
              stroke={P.sienna}
              strokeWidth={2}
              dot={false}
              name="Female"
              connectNulls
            />
          </LineChart>
        </ChartCard>
      </section>

      {/* Section 2: Real Earnings */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Real Earnings</h3>
        <p style={SECTION_NOTE}>
          Median full-time annual pay adjusted for inflation using the Consumer Prices Index,
          expressed in constant 2025 prices. In real terms, median pay peaked around 2008 at
          approximately {"\u00A3"}42,000 and did not return to that level until 2025. The period
          from 2008 to 2024 represents an extended period of real wage stagnation.
        </p>

        <ChartCard
          title="Real Median Annual Pay (CPI-Adjusted)"
          subtitle={`United Kingdom, full-time, constant 2025 \u00A3, 1997-2025`}
          source={sourceFrom(raw, "realEarningsTrend")}
          legend={[
            { key: "realMedian", label: "All", color: P.teal },
            { key: "realMale", label: "Male", color: P.navy },
            { key: "realFemale", label: "Female", color: P.sienna },
          ]}
          height={340}
        >
          <LineChart data={realEarningsTrend}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1997, 2025]}
              tick={AXIS_TICK}
              tickCount={8}
            />
            <YAxis
              domain={[0, 50000]}
              tick={AXIS_TICK}
              tickFormatter={fmtGBP}
              label={yAxisLabel("Annual pay (2025 \u00A3)")}
            />
            <Tooltip
              content={<CustomTooltip formatter={(v) => fmtGBPFull(v)} />}
            />
            <Line type="monotone" dataKey="realMedian" stroke={P.teal} strokeWidth={2.5} dot={false} name="All" connectNulls />
            <Line type="monotone" dataKey="realMale" stroke={P.navy} strokeWidth={2} dot={false} name="Male" connectNulls />
            <Line type="monotone" dataKey="realFemale" stroke={P.sienna} strokeWidth={2} dot={false} name="Female" connectNulls />
          </LineChart>
        </ChartCard>
      </section>

      {/* Section 3: Gender Pay Gap */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Gender Pay Gap</h3>
        <p style={SECTION_NOTE}>
          The median gender pay gap measures the difference between male and female median hourly
          earnings as a proportion of male earnings, for full-time employees. It does not adjust for
          differences in occupation, hours, or experience.
        </p>

        <ChartCard
          title="Gender Pay Gap"
          subtitle="United Kingdom, median full-time, %, 1997-2025"
          source={sourceFrom(raw, "genderPayGap")}
          height={300}
        >
          <LineChart data={genderPayGap}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1997, 2025]}
              tick={AXIS_TICK}
              tickCount={8}
            />
            <YAxis
              domain={[0, 20]}
              tick={AXIS_TICK}
              tickFormatter={(v) => `${v}%`}
              label={yAxisLabel("Gap (%)")}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) => `${v}%`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="gap"
              stroke={P.sienna}
              strokeWidth={2.5}
              dot={false}
              name="Gender pay gap"
              connectNulls
            />
          </LineChart>
        </ChartCard>
      </section>

      {/* Section 3: Pay by Occupation */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Pay by Occupation</h3>
        <p style={SECTION_NOTE}>
          Median annual gross pay for full-time employees by SOC 2020 major occupation group.
          Bars show median pay, with lighter extensions indicating the 10th to 90th percentile range.
          Provisional data for April 2025 from ASHE.
        </p>

        <ChartCard
          title="Median Annual Pay by Occupation"
          subtitle="United Kingdom, full-time, £, April 2025 provisional"
          source={sourceFrom(raw, "earningsByOccupation")}
          height={400}
        >
          <BarChart
            data={earningsByOccupation}
            layout="vertical"
            margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
          >
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 120000]}
              tick={AXIS_TICK}
              tickFormatter={fmtGBP}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={AXIS_TICK}
              width={160}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) => fmtGBPFull(v)}
                />
              }
            />
            <Bar
              dataKey="p90"
              fill={P.teal}
              fillOpacity={0.2}
              name="90th percentile"
              isAnimationActive={false}
            />
            <Bar
              dataKey="medianAnnual"
              fill={P.teal}
              name="Median"
              isAnimationActive={false}
            />
          </BarChart>
        </ChartCard>
      </section>

      {/* Section 6: Productivity-Pay Gap */}
      {productivityPayGap.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Productivity-Pay Gap</h3>
          <p style={SECTION_NOTE}>
            Output per hour and real median pay, both indexed to 2000 = 100. Since 2000,
            productivity has grown faster than real pay. The gap widened sharply during the
            post-2008 period of inflation and wage stagnation. This divergence is a key
            feature of the UK economy: growth in output has not translated proportionally
            into growth in median earnings.
          </p>

          <ChartCard
            title="Productivity vs Real Pay"
            subtitle="United Kingdom, indexed 2000 = 100"
            source={sourceFrom(raw, "productivityPayGap")}
            legend={[
              { key: "productivityIndex", label: "Output per hour", color: P.teal },
              { key: "realPayIndex", label: "Real median pay", color: P.sienna },
            ]}
            height={300}
          >
            <LineChart data={productivityPayGap}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="year"
                type="number"
                domain={[2000, 2024]}
                tick={AXIS_TICK}
                tickCount={7}
              />
              <YAxis
                domain={[90, 140]}
                tick={AXIS_TICK}
                label={yAxisLabel("Index (2000=100)")}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="productivityIndex" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3 }} name="Output per hour" connectNulls />
              <Line type="monotone" dataKey="realPayIndex" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3 }} name="Real median pay" connectNulls />
            </LineChart>
          </ChartCard>
        </section>
      )}

      {/* Context */}
      <AnalysisBox color={P.teal}>
        Median full-time annual pay in the UK was {fmtGBPFull(medianPay)} in {latestEarnings?.year},
        up from {fmtGBPFull(firstEarnings?.median)} in {firstEarnings?.year} (nominal terms).
        The gender pay gap has narrowed from {genderPayGap[0]?.gap}% in {genderPayGap[0]?.year} to {gapPct}% in {latestEarnings?.year}.
        {" "}Pay varies considerably by occupation: managers and senior officials earned a median
        of {fmtGBPFull(earningsByOccupation[earningsByOccupation.length - 1]?.medianAnnual)},
        compared to {fmtGBPFull(earningsByOccupation[0]?.medianAnnual)} for {earningsByOccupation[0]?.label?.toLowerCase()}.
      </AnalysisBox>
    </div>
  );
}
