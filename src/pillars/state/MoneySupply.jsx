import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import AnalysisBox from "../../components/AnalysisBox";
import useIsMobile from "../../hooks/useIsMobile";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const BS_COLORS = {
  boe: P.navy,
  fed: P.sienna,
  ecb: P.teal,
  boj: "#7B4B8A",
};

const BS_LABELS = {
  boe: "Bank of England",
  fed: "Federal Reserve",
  ecb: "ECB",
  boj: "Bank of Japan",
};

export default function MoneySupply() {
  const { data, loading, error, raw } = useJsonDataset("money-supply.json");
  const isMobile = useIsMobile();
  const [wageView, setWageView] = useState("real");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Money & Inflation</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Money & Inflation</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Money & Inflation</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Money supply, QE, prices & purchasing power
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="M4 Money Supply"
          value={`£${(s.m4Latest / 1000).toFixed(1)}tn`}
          change={`Dec ${s.m4LatestYear}`}
          up={true}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="CPI Inflation"
          value={`${s.cpiLatest}%`}
          change={`${s.cpiLatestYear}, peak ${s.cpiPeak}% in ${s.cpiPeakYear}`}
          up={s.cpiLatest > 2}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Purchasing Power"
          value={`${s.purchasingPower}p`}
          change={`per £1 in ${s.purchasingPowerBase}`}
          up={true}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="APF Holdings"
          value={`£${s.apfCurrent}bn`}
          change={`down from £${s.apfPeak}bn peak (${s.apfPeakYear})`}
          up={false}
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* ── Section 1: M4 Money Supply ──────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>M4 Broad Money Supply</h3>
        <p style={SECTION_NOTE}>
          M4 measures the total stock of money in the UK economy, including bank deposits, building
          society deposits, and other monetary instruments held by the non-bank private sector. It
          stood at £{(s.m4Latest / 1000).toFixed(1)} trillion at the end of {s.m4LatestYear}, up
          from £867bn in 2000. M4 grew {s.m4Growth2020}% between {s.m4GrowthPeriod}, a period
          in which nominal GDP grew approximately 5%.
        </p>

        <ChartCard
          title="M4 Money Supply and Nominal GDP"
          subtitle="£bn, end-year outstanding (M4) vs calendar-year GDP"
          source={sourceFrom(raw, "m4ToGdp")}
          height={340}
        >
          <ComposedChart data={data.m4ToGdp} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="m4" name="M4 (£bn)" fill={P.navy} stroke={P.navy} fillOpacity={0.12} strokeWidth={2.5} />
            <Line type="monotone" dataKey="gdp" name="Nominal GDP (£bn)" stroke={P.sienna} strokeWidth={2} dot={false} strokeDasharray="6 3" />
          </ComposedChart>
        </ChartCard>

        {/* M4/GDP ratio */}
        <div style={{ marginTop: 18 }}>
          <ChartCard
            title="M4 as a Ratio of GDP"
            subtitle="Broad money / nominal GDP, %"
            source={sourceFrom(raw, "m4ToGdp")}
            height={280}
          >
            <AreaChart data={data.m4ToGdp} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[60, 160]} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="ratio" name="M4/GDP (%)" fill={P.teal} stroke={P.teal} fillOpacity={0.15} strokeWidth={2.5} />
              <ReferenceLine y={100} stroke={P.grey} strokeDasharray="4 4" label={{ value: "100%", fontSize: 10, fill: P.textLight, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
            </AreaChart>
          </ChartCard>
        </div>
      </section>

      {/* ── Section 2: Quantitative Easing ──────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Quantitative Easing & Asset Purchases</h3>
        <p style={SECTION_NOTE}>
          The Bank of England began purchasing government bonds (gilts) through its Asset Purchase
          Facility in March 2009. Holdings peaked at approximately £{s.apfPeak}bn in January {s.apfPeakYear}.
          The Bank began quantitative tightening in late 2022, reducing holdings through a combination
          of active sales and allowing bonds to mature without reinvestment. As of
          December {s.apfCurrentYear}, holdings stood at £{s.apfCurrent}bn.
        </p>

        <ChartCard
          title="Bank of England Gilt Holdings (APF)"
          subtitle="£bn, outstanding at period end"
          source={sourceFrom(raw, "apfHoldings")}
          height={340}
        >
          <AreaChart data={data.apfHoldings} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 1} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 950]} label={yAxisLabel("£bn")} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.date}</div>
                    <div>£{d.holdings}bn</div>
                    {d.note && <div style={{ opacity: 0.7, fontSize: "11px", marginTop: 3 }}>{d.note}</div>}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="holdings" name="APF Holdings (£bn)" fill={P.red} stroke={P.red} fillOpacity={0.15} strokeWidth={2.5} />
          </AreaChart>
        </ChartCard>

        {/* APF cash flows */}
        <div style={{ marginTop: 18 }}>
          <ChartCard
            title="APF Net Cash Flows to Treasury"
            subtitle="£bn per financial year, positive = transfer to HMT, negative = cost to HMT"
            source={sourceFrom(raw, "apfCashFlows")}
            height={300}
          >
            <BarChart data={data.apfCashFlows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 2 : 0} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 60 : 30} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={P.text} strokeWidth={1} />
              <Bar dataKey="netToHmt" name="Net to HMT (£bn)" radius={[3, 3, 0, 0]} barSize={isMobile ? 18 : 28}>
                {data.apfCashFlows.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.netToHmt >= 0 ? P.teal : P.red}
                    fillOpacity={d.forecast ? 0.4 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>

        <AnalysisBox color={P.navy} label="Note">
          The OBR estimates the lifetime net cost of the APF at £{s.apfLifetimeCost}bn. Between 2012 and 2022,
          the APF generated approximately £124bn in positive cash transfers to the Treasury, reflecting the
          interest rate differential between Bank Rate and gilt yields. These flows reversed from 2022-23 onward
          as Bank Rate rose above the average coupon on the APF portfolio.
        </AnalysisBox>
      </section>

      {/* ── Section 3: CPI Inflation ────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Consumer Price Inflation</h3>
        <p style={SECTION_NOTE}>
          CPI inflation averaged close to the Bank of England's 2% target between 2000 and 2020,
          with notable exceptions during the 2008 commodity price spike (3.6%) and the post-financial-crisis
          period (4.5% in 2011). The 2021-23 inflation surge, driven by energy prices and supply chain
          disruption, saw CPI peak at {s.cpiPeak}% in {s.cpiPeakYear} before returning
          towards target. As of {s.cpiLatestYear}, CPI stood at {s.cpiLatest}%.
        </p>

        <ChartCard
          title="UK CPI Annual Inflation Rate"
          subtitle="Annual average %, all items"
          source={sourceFrom(raw, "cpiRate")}
          height={320}
        >
          <ComposedChart data={data.cpiRate} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[-1, 10]} label={yAxisLabel("%")} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={2}
              stroke={P.teal}
              strokeDasharray="4 4"
              label={{ value: "2% target", fontSize: 10, fill: P.teal, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }}
            />
            <Area type="monotone" dataKey="cpi" name="CPI (%)" fill={P.sienna} stroke={P.sienna} fillOpacity={0.15} strokeWidth={2.5} />
          </ComposedChart>
        </ChartCard>
      </section>

      {/* ── Section 4: Real Wages ───────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Wages and Inflation</h3>
        <p style={SECTION_NOTE}>
          Real wage growth, measured as nominal pay growth minus CPI, was consistently positive from
          2001 to 2007, averaging around 2% per year. The period from 2008 to 2014 saw sustained
          negative real wage growth, with wages falling behind prices in six of seven years.
          The 2022 inflation surge produced the sharpest single-year decline in real wages (-3.3%).
          Positive real wage growth resumed in 2024.
        </p>

        <ChartCard
          title="Wage Growth: Nominal vs Real"
          subtitle="Annual average growth %, total pay"
          source={sourceFrom(raw, "realWages")}
          views={["real", "both"]}
          viewLabels={{ real: "Real Wages", both: "Nominal & Real" }}
          activeView={wageView}
          onViewChange={setWageView}
          height={320}
        >
          {wageView === "real" ? (
            <BarChart data={data.realWages} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[-5, 5]} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={P.text} strokeWidth={1} />
              <Bar dataKey="real" name="Real wage growth (%)" radius={[3, 3, 0, 0]} barSize={isMobile ? 10 : 16}>
                {data.realWages.map((d, i) => (
                  <Cell key={i} fill={d.real >= 0 ? P.teal : P.red} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data.realWages} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[-5, 10]} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={P.text} strokeWidth={0.5} />
              <Line type="monotone" dataKey="nominal" name="Nominal wage growth (%)" stroke={P.navy} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="cpi" name="CPI inflation (%)" stroke={P.sienna} strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 3" />
              <Line type="monotone" dataKey="real" name="Real wage growth (%)" stroke={P.teal} strokeWidth={2.5} dot={{ r: 2.5 }} />
            </LineChart>
          )}
        </ChartCard>
      </section>

      {/* ── Section 5: Purchasing Power ─────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Purchasing Power</h3>
        <p style={SECTION_NOTE}>
          Cumulative inflation since 2000 has reduced the purchasing power of the pound. £1 in 2000
          had the equivalent purchasing power of approximately {s.purchasingPower}p
          by {s.m4LatestYear}, based on CPI. The sharpest erosion occurred in 2022-23, when
          cumulative inflation over two years exceeded 16%.
        </p>

        <ChartCard
          title="Purchasing Power of £1 (2000 = 100p)"
          subtitle="CPI-deflated, pence per pound in 2000 terms"
          source={sourceFrom(raw, "purchasingPower")}
          height={300}
        >
          <AreaChart data={data.purchasingPower} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[40, 105]} label={yAxisLabel("pence")} tickFormatter={v => `${v}p`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div>£1 (2000) = {payload[0].value}p</div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={100} stroke={P.grey} strokeDasharray="4 4" label={{ value: "£1 in 2000", fontSize: 10, fill: P.textLight, position: "insideTopLeft", fontFamily: "'DM Mono', monospace" }} />
            <Area type="monotone" dataKey="index" name="Purchasing power (p)" fill={P.sienna} stroke={P.sienna} fillOpacity={0.15} strokeWidth={2.5} />
          </AreaChart>
        </ChartCard>
      </section>

      {/* ── Section 6: International Central Bank Balance Sheets ─────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Central Bank Balance Sheets</h3>
        <p style={SECTION_NOTE}>
          The balance sheets of major central banks expanded significantly during the financial
          crisis and again during the pandemic. The Bank of Japan's balance sheet reached
          137% of GDP in 2022. The Bank of England peaked at 44% of GDP in 2021, and has since
          declined to approximately 27% as quantitative tightening proceeds. All four major
          central banks are now in the process of reducing their balance sheets.
        </p>

        <ChartCard
          title="Central Bank Balance Sheets"
          subtitle="Total assets as % of GDP"
          source={sourceFrom(raw, "balanceSheets")}
          height={360}
        >
          <LineChart data={data.balanceSheets} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 150]} label={yAxisLabel("% GDP")} />
            <Tooltip content={<CustomTooltip />} />
            {Object.keys(BS_COLORS).map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={BS_LABELS[key]}
                stroke={BS_COLORS[key]}
                strokeWidth={key === "boe" ? 2.5 : 1.8}
                dot={{ r: key === "boe" ? 3 : 2 }}
              />
            ))}
          </LineChart>
        </ChartCard>
      </section>

      {/* ── Section 7: Nominal vs Real Government Debt ──────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Government Debt: Nominal vs Real</h3>
        <p style={SECTION_NOTE}>
          Public sector net debt (excluding public sector banks) stood at £{s.debtLatest}bn
          ({s.debtPctGdp}% of GDP) in {s.debtLatestYear}. In nominal terms, debt has risen
          ninefold since 2000-01. In real terms (deflated by CPI to 2000-01 prices), the
          increase is smaller, reflecting the effect of cumulative inflation on the real value
          of outstanding nominal liabilities.
        </p>

        <ChartCard
          title="Public Sector Net Debt: Nominal vs Real"
          subtitle="£bn, real terms deflated to 2000-01 prices using CPI"
          source={sourceFrom(raw, "debtNominalVsReal")}
          height={340}
        >
          <LineChart data={data.debtNominalVsReal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="nominal" name="Nominal debt (£bn)" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="real" name="Real debt (2000-01 £bn)" stroke={P.teal} strokeWidth={2} dot={{ r: 2 }} strokeDasharray="6 3" />
          </LineChart>
        </ChartCard>

        <AnalysisBox color={P.teal} label="Context">
          The gap between the nominal and real debt lines represents the cumulative effect
          of inflation on the real value of government debt. Because government debt is denominated
          in nominal terms, rising prices reduce the real burden of existing debt. This effect
          is separate from changes in the debt-to-GDP ratio, which also reflects GDP growth.
        </AnalysisBox>
      </section>
    </div>
  );
}
