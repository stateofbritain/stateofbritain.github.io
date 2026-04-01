import { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

export default function Welfare() {
  const { data, loading, error, raw } = useJsonDataset("welfare.json");
  const isMobile = useIsMobile();
  const [categoryView, setCategoryView] = useState("stacked");
  const [benefitView, setBenefitView] = useState("all");

  const outturnCategory = useMemo(() => {
    if (!data?.byCategory) return [];
    return data.byCategory.filter(d => !d.forecast);
  }, [data]);

  const forecastCategory = useMemo(() => {
    if (!data?.byCategory) return [];
    return data.byCategory;
  }, [data]);

  const outturnBenefit = useMemo(() => {
    if (!data?.byBenefit) return [];
    return data.byBenefit.filter(d => {
      const yr = parseInt(d.year);
      return yr <= 2024;
    });
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Welfare Spending</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Welfare Spending</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;
  const firstYear = outturnCategory[0]?.year;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Welfare Spending</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Benefit expenditure by category and type
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total welfare spending"
          value={`£${Math.round(s.totalBn)}bn`}
          change={s.latestYear}
          color={P.red}
          delay={0.1}
        />
        <MetricCard
          label="Pensioner benefits"
          value={`£${Math.round(s.pensionersBn)}bn`}
          change={`${s.pensionShare}% of total`}
          color={P.navy}
          delay={0.18}
        />
        <MetricCard
          label="Working age"
          value={`£${Math.round(s.workingAgeBn)}bn`}
          change={s.latestYear}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="State Pension"
          value={`£${Math.round(s.statePensionBn)}bn`}
          change="largest single benefit"
          color={P.teal}
          delay={0.34}
        />
      </div>

      {/* ── Section 1: Spending by Category ───────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Spending by Category</h3>
        <p style={SECTION_NOTE}>
          {categoryView === "stacked"
            ? `Total benefit expenditure consistent with current DWP coverage, from ${firstYear} to ${s.latestYear}. Pensioner benefits account for ${s.pensionShare}% of the total and have grown from £${Math.round(outturnCategory[0]?.pensioners)}bn to £${Math.round(s.pensionersBn)}bn over the period. Values are nominal (not adjusted for inflation).`
            : `Welfare spending with OBR forecast to 2030/31. Dashed lines indicate forecast years. Total spending is projected to reach £381bn by 2030/31, driven primarily by the State Pension triple lock and rising disability benefit caseloads.`}
        </p>

        {categoryView === "stacked" && outturnCategory.length > 0 && (
          <ChartCard
            title="Welfare Spending by Category"
            subtitle="£ billion nominal, UK"
            source={sourceFrom(raw, "byCategory")}
            views={["stacked", "forecast"]}
            viewLabels={{ stacked: "Outturn", forecast: "With forecast" }}
            activeView={categoryView}
            onViewChange={setCategoryView}
            legend={[
              { key: "pensioners", label: "Pensioners", color: P.navy },
              { key: "workingAge", label: "Working age", color: P.sienna },
              { key: "children", label: "Children", color: P.teal },
            ]}
            height={380}
          >
            <AreaChart data={outturnCategory} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `£${v}bn`} domain={[0, "auto"]} label={yAxisLabel("£ billion")} />
              <Tooltip content={<CustomTooltip formatter={v => `£${v.toFixed(1)}bn`} />} />
              <Area type="monotone" dataKey="pensioners" stackId="1" stroke={P.navy} fill={P.navy} fillOpacity={0.3} name="Pensioners" />
              <Area type="monotone" dataKey="workingAge" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.3} name="Working age" />
              <Area type="monotone" dataKey="children" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.3} name="Children" />
            </AreaChart>
          </ChartCard>
        )}

        {categoryView === "forecast" && forecastCategory.length > 0 && (
          <ChartCard
            title="Welfare Spending with OBR Forecast"
            subtitle="£ billion nominal, UK (dashed = forecast)"
            source={sourceFrom(raw, "byCategory")}
            views={["stacked", "forecast"]}
            viewLabels={{ stacked: "Outturn", forecast: "With forecast" }}
            activeView={categoryView}
            onViewChange={setCategoryView}
            legend={[
              { key: "total", label: "Total", color: P.red },
              { key: "pensioners", label: "Pensioners", color: P.navy },
              { key: "workingAge", label: "Working age", color: P.sienna },
            ]}
            height={380}
          >
            <LineChart data={forecastCategory} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `£${v}bn`} domain={[0, "auto"]} label={yAxisLabel("£ billion")} />
              <Tooltip content={<CustomTooltip formatter={v => `£${v.toFixed(1)}bn`} />} />
              <ReferenceLine x="2025/26" stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "Forecast →", fontSize: 10, fill: P.grey, position: "insideTopLeft", fontFamily: "'DM Mono', monospace" }} />
              <Line type="monotone" dataKey="total" stroke={P.red} strokeWidth={2.5} dot={false} name="Total" strokeDasharray={null} />
              <Line type="monotone" dataKey="pensioners" stroke={P.navy} strokeWidth={1.5} dot={false} name="Pensioners" />
              <Line type="monotone" dataKey="workingAge" stroke={P.sienna} strokeWidth={1.5} dot={false} name="Working age" />
            </LineChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 2: Spending by Benefit Type ──────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Spending by Benefit Type</h3>
        <p style={SECTION_NOTE}>
          {benefitView === "all"
            ? "Annual expenditure on individual benefit types from 1999/00 to 2024/25. The State Pension is by far the largest single item, followed by housing benefits and disability payments. Incapacity benefits include Employment and Support Allowance and its predecessors."
            : "State Pension expenditure from 1999/00 to 2024/25 alongside other pensioner benefits (Pension Credit). The triple lock, introduced in 2010, guarantees the State Pension rises by the highest of earnings growth, CPI, or 2.5%."}
        </p>

        {benefitView === "all" && outturnBenefit.length > 0 && (
          <ChartCard
            title="Benefit Expenditure by Type"
            subtitle="£ billion nominal, UK"
            source={sourceFrom(raw, "byBenefit")}
            views={["all", "pension"]}
            viewLabels={{ all: "All benefits", pension: "Pension focus" }}
            activeView={benefitView}
            onViewChange={setBenefitView}
            legend={[
              { key: "sp", label: "State Pension", color: P.navy },
              { key: "housing", label: "Housing", color: P.sienna },
              { key: "disability", label: "Disability", color: P.red },
              { key: "incapacity", label: "Incapacity", color: P.teal },
              { key: "unemployment", label: "Unemployment", color: P.yellow },
              { key: "carers", label: "Carer's Allowance", color: P.grey },
            ]}
            height={380}
          >
            <LineChart data={outturnBenefit} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `£${v}bn`} domain={[0, "auto"]} label={yAxisLabel("£ billion")} />
              <Tooltip content={<CustomTooltip formatter={v => `£${v.toFixed(1)}bn`} />} />
              <Line type="monotone" dataKey="statePension" stroke={P.navy} strokeWidth={2.5} dot={false} name="State Pension" />
              <Line type="monotone" dataKey="housing" stroke={P.sienna} strokeWidth={1.5} dot={false} name="Housing benefits" />
              <Line type="monotone" dataKey="disability" stroke={P.red} strokeWidth={1.5} dot={false} name="Disability" />
              <Line type="monotone" dataKey="incapacity" stroke={P.teal} strokeWidth={1.5} dot={false} name="Incapacity" />
              <Line type="monotone" dataKey="unemployment" stroke={P.yellow} strokeWidth={1.5} dot={false} name="Unemployment" />
              <Line type="monotone" dataKey="carersAllowance" stroke={P.grey} strokeWidth={1.5} dot={false} name="Carer's Allowance" />
            </LineChart>
          </ChartCard>
        )}

        {benefitView === "pension" && outturnBenefit.length > 0 && (
          <ChartCard
            title="State Pension Expenditure"
            subtitle="£ billion nominal, UK"
            source={sourceFrom(raw, "byBenefit")}
            views={["all", "pension"]}
            viewLabels={{ all: "All benefits", pension: "Pension focus" }}
            activeView={benefitView}
            onViewChange={setBenefitView}
            height={380}
          >
            <AreaChart data={outturnBenefit} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `£${v}bn`} domain={[0, "auto"]} label={yAxisLabel("£ billion")} />
              <Tooltip content={<CustomTooltip formatter={v => `£${v.toFixed(1)}bn`} />} />
              <ReferenceLine x="2010/11" stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "Triple lock introduced", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              <Area type="monotone" dataKey="statePension" stroke={P.navy} fill={P.navy} fillOpacity={0.15} strokeWidth={2.5} name="State Pension" />
              <Line type="monotone" dataKey="pensionCredit" stroke={P.teal} strokeWidth={1.5} dot={false} name="Pension Credit" />
            </AreaChart>
          </ChartCard>
        )}
      </section>
    </div>
  );
}
