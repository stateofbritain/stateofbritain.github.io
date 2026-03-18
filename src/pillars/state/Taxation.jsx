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

const RECEIPT_COLORS = {
  incomeTax: P.navy,
  nics: P.teal,
  vat: P.sienna,
  corpTax: "#7B4B8A",
  councilTax: "#4A7A58",
  businessRates: P.yellow,
  fuelDuty: P.grey,
  stampDuty: "#C25454",
};

const RECEIPT_LABELS = {
  incomeTax: "Income Tax",
  nics: "NICs",
  vat: "VAT",
  corpTax: "Corporation Tax",
  councilTax: "Council Tax",
  businessRates: "Business Rates",
  fuelDuty: "Fuel Duty",
  stampDuty: "Stamp Duty",
};

const CONC_COLORS = {
  top1: P.navy,
  top5: P.teal,
  top10: P.sienna,
  top50: P.grey,
};

export default function Taxation() {
  const { data, loading, error, raw } = useJsonDataset("taxation.json");
  const isMobile = useIsMobile();
  const [receiptView, setReceiptView] = useState("stacked");
  const [gapView, setGapView] = useState("pct");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Taxation</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading taxation data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Taxation</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  // Sort international comparisons descending
  const intlBurdenSorted = data.intlTaxBurden
    ? [...data.intlTaxBurden].sort((a, b) => b.pct - a.pct)
    : [];

  const intlCorpSorted = data.intlCorpTax
    ? [...data.intlCorpTax].sort((a, b) => b.rate - a.rate)
    : [];

  // Tax gap by type sorted by amount
  const gapByTypeSorted = data.taxGapByType
    ? [...data.taxGapByType].sort((a, b) => b.amount - a.amount)
    : [];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Taxation</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Receipts, burden, tax gap & structure
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total Tax Receipts"
          value={`£${s.totalReceipts}bn`}
          change={s.totalReceiptsYear}
          up={true}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Tax Burden (% GDP)"
          value={`${s.taxBurden}%`}
          change={s.taxBurdenYear}
          up={true}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Tax Gap"
          value={`£${s.taxGap}bn`}
          change={`${s.taxGapPct}% of liability, ${s.taxGapYear}`}
          up={false}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="Top 1% IT Share"
          value={`${s.top1PctShare}%`}
          change={s.top1PctShareYear}
          up={true}
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* ── Section 1: Tax Receipts by Type ───────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Tax Receipts by Type</h3>
        <p style={SECTION_NOTE}>
          HMRC collected £{s.totalReceipts}bn in taxes in {s.totalReceiptsYear}. Income tax
          is the single largest source, followed by National Insurance contributions and VAT.
          Corporation tax receipts rose to £97.5bn in 2024-25 following the rate increase to 25%
          in April 2023. Fuel duty has been flat in nominal terms since 2011, and stamp duty land
          tax declined from its 2021-22 peak as housing transaction volumes fell.
        </p>

        <ChartCard
          title="UK Tax Receipts by Type"
          subtitle="£bn, financial year, United Kingdom"
          source={sourceFrom(raw, "receiptsByType")}
          views={["stacked", "lines"]}
          viewLabels={{ stacked: "Stacked", lines: "Lines" }}
          activeView={receiptView}
          onViewChange={setReceiptView}
          height={380}
        >
          {receiptView === "stacked" ? (
            <AreaChart data={data.receiptsByType} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 5 : 3} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
              <Tooltip content={<CustomTooltip />} />
              {Object.keys(RECEIPT_COLORS).map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={RECEIPT_LABELS[key]}
                  fill={RECEIPT_COLORS[key]}
                  stroke={RECEIPT_COLORS[key]}
                  fillOpacity={0.7}
                  stackId="1"
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={data.receiptsByType} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 5 : 3} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
              <Tooltip content={<CustomTooltip />} />
              {Object.keys(RECEIPT_COLORS).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={RECEIPT_LABELS[key]}
                  stroke={RECEIPT_COLORS[key]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          )}
        </ChartCard>
      </section>

      {/* ── Section 2: Tax Burden as % GDP ────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Tax Burden</h3>
        <p style={SECTION_NOTE}>
          The UK tax burden, measured as total receipts as a share of GDP, stood at {s.taxBurden}%
          in {s.taxBurdenYear}. The OBR forecasts it will rise to {s.taxBurdenForecast}% by {s.taxBurdenForecastYear},
          which would be a post-war high. The increase is driven primarily by frozen income tax and NICs
          thresholds, which draw more taxpayers into higher rate bands as nominal wages rise.
        </p>

        <ChartCard
          title="UK Tax Burden"
          subtitle="Total receipts as % of GDP, OBR measure"
          source={sourceFrom(raw, "taxBurden")}
          height={320}
        >
          <ComposedChart data={data.taxBurden} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 7 : 4} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[26, 40]} label={yAxisLabel("% GDP")} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="pct"
              name="Tax burden (% GDP)"
              fill={P.navy}
              stroke={P.navy}
              fillOpacity={0.15}
              strokeWidth={2.5}
            />
            <ReferenceLine
              y={33.7}
              stroke={P.sienna}
              strokeDasharray="4 4"
              label={{ value: "OECD avg 33.7%", fontSize: 10, fill: P.sienna, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }}
            />
          </ComposedChart>
        </ChartCard>

        {/* International comparison */}
        {intlBurdenSorted.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <ChartCard
              title="Tax-to-GDP Ratio: International Comparison"
              subtitle="Total tax revenue as % of GDP, OECD countries, 2023"
              source={sourceFrom(raw, "intlTaxBurden")}
              height={Math.max(340, intlBurdenSorted.length * 26 + 30)}
            >
              <BarChart data={intlBurdenSorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 50]} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={isMobile ? 80 : 110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pct" name="Tax/GDP (%)" radius={[0, 3, 3, 0]} barSize={14}>
                  {intlBurdenSorted.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.country === "UK" ? P.navy : d.country === "OECD average" ? P.sienna : P.teal}
                      fillOpacity={d.country === "UK" || d.country === "OECD average" ? 0.9 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>
        )}
      </section>

      {/* ── Section 3: Tax Gap ────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Tax Gap</h3>
        <p style={SECTION_NOTE}>
          HMRC estimates the tax gap at £{s.taxGap}bn ({s.taxGapPct}%) for {s.taxGapYear}.
          The gap as a percentage of theoretical liability fell from 7.5% in 2005-06 to 4.8%
          in 2021-22 before rising to 5.3% in 2023-24, driven primarily by corporation tax.
          Corporation tax accounts for 40% of the total tax gap by value, up from 24% in 2019-20,
          while the VAT gap share fell from 31% to 19% over the same period.
        </p>

        <ChartCard
          title="UK Tax Gap"
          subtitle="Difference between tax owed and tax collected"
          source={sourceFrom(raw, "taxGap")}
          views={["pct", "abs"]}
          viewLabels={{ pct: "% of Liability", abs: "£bn" }}
          activeView={gapView}
          onViewChange={setGapView}
          height={300}
        >
          <ComposedChart data={data.taxGap} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
            {gapView === "pct" ? (
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 10]} label={yAxisLabel("%")} />
            ) : (
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={gapView === "pct" ? "pct" : "gap"}
              name={gapView === "pct" ? "Tax gap (%)" : "Tax gap (£bn)"}
              fill={P.sienna}
              stroke={P.sienna}
              fillOpacity={0.15}
              strokeWidth={2.5}
            />
          </ComposedChart>
        </ChartCard>

        {/* Tax gap by type */}
        {gapByTypeSorted.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <ChartCard
              title="Tax Gap by Tax Type"
              subtitle={`£bn, ${s.taxGapYear}`}
              source={sourceFrom(raw, "taxGapByType")}
              height={220}
            >
              <BarChart data={gapByTypeSorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="bn" />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={isMobile ? 80 : 110} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.type}</div>
                        <div>£{d.amount}bn ({d.pct}% gap rate)</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" name="Gap (£bn)" radius={[0, 3, 3, 0]} barSize={16} fill={P.sienna} fillOpacity={0.75} />
              </BarChart>
            </ChartCard>
          </div>
        )}
      </section>

      {/* ── Section 4: Income Tax Concentration ───────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Income Tax Concentration</h3>
        <p style={SECTION_NOTE}>
          Income tax has become increasingly concentrated among higher earners. In 2022-23,
          the top 1% of taxpayers paid {s.top1PctShare}% of all income tax, up from 21.3% in 1999-2000.
          The top 10% accounted for 59.8% of income tax receipts. The number of additional rate
          taxpayers (earning above £125,140) reached approximately 700,000 in 2024-25, up from
          300,000 in 2010-11, partly due to the freeze in the additional rate threshold.
        </p>

        <ChartCard
          title="Share of Income Tax by Percentile Group"
          subtitle="% of total income tax paid, UK"
          source={sourceFrom(raw, "taxConcentration")}
          legend={[
            { key: "top1", label: "Top 1%", color: CONC_COLORS.top1 },
            { key: "top5", label: "Top 5%", color: CONC_COLORS.top5 },
            { key: "top10", label: "Top 10%", color: CONC_COLORS.top10 },
            { key: "top50", label: "Top 50%", color: CONC_COLORS.top50 },
          ]}
          height={320}
        >
          <LineChart data={data.taxConcentration} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 1} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 100]} label={yAxisLabel("% of IT")} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="top50" name="Top 50%" stroke={CONC_COLORS.top50} strokeWidth={1.5} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="top10" name="Top 10%" stroke={CONC_COLORS.top10} strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="top5" name="Top 5%" stroke={CONC_COLORS.top5} strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="top1" name="Top 1%" stroke={CONC_COLORS.top1} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        {/* Taxpayers by rate band */}
        {data.taxpayersByBand && (
          <div style={{ marginTop: 18 }}>
            <ChartCard
              title="Income Taxpayers by Rate Band"
              subtitle="Millions, UK"
              source={sourceFrom(raw, "taxpayersByBand")}
              legend={[
                { key: "basic", label: "Basic rate", color: P.teal },
                { key: "higher", label: "Higher rate", color: P.sienna },
                { key: "additional", label: "Additional rate", color: P.navy },
              ]}
              height={300}
            >
              <BarChart data={data.taxpayersByBand} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} vertical={false} />
                <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("millions")} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="basic" name="Basic rate" fill={P.teal} fillOpacity={0.7} stackId="1" />
                <Bar dataKey="higher" name="Higher rate" fill={P.sienna} fillOpacity={0.75} stackId="1" />
                <Bar dataKey="additional" name="Additional rate" fill={P.navy} fillOpacity={0.85} stackId="1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>
        )}
      </section>

      {/* ── Section 5: Corporation Tax ────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Corporation Tax</h3>
        <p style={SECTION_NOTE}>
          The UK main corporation tax rate was reduced from 52% in 1982 to a low of 19%
          in 2017-18. It was increased to 25% in April 2023 for companies with profits
          above £250,000, with a small profits rate of 19% retained for companies with
          profits below £50,000. Corporation tax receipts rose from £80.8bn in 2023-24
          to £97.5bn in 2024-25.
        </p>

        <ChartCard
          title="UK Corporation Tax Main Rate"
          subtitle="Main rate %, financial year"
          source={sourceFrom(raw, "corpTaxRate")}
          height={300}
        >
          <AreaChart data={data.corpTaxRate} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 55]} label={yAxisLabel("%")} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="stepAfter" dataKey="rate" name="Main rate (%)" fill="#7B4B8A" stroke="#7B4B8A" fillOpacity={0.15} strokeWidth={2.5} />
          </AreaChart>
        </ChartCard>

        {/* International comparison */}
        {intlCorpSorted.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <ChartCard
              title="Corporate Tax Rates: International Comparison"
              subtitle="Combined statutory corporate income tax rate %, 2024"
              source={sourceFrom(raw, "intlCorpTax")}
              height={Math.max(340, intlCorpSorted.length * 26 + 30)}
            >
              <BarChart data={intlCorpSorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 35]} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={isMobile ? 80 : 110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" name="CT rate (%)" radius={[0, 3, 3, 0]} barSize={14}>
                  {intlCorpSorted.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.country === "UK" ? P.navy : d.country === "OECD average" ? P.sienna : "#7B4B8A"}
                      fillOpacity={d.country === "UK" || d.country === "OECD average" ? 0.9 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>
        )}
      </section>

      {/* ── Section 6: Thresholds & Allowances ────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Personal Allowance & Thresholds</h3>
        <p style={SECTION_NOTE}>
          The personal allowance was raised from £6,475 in 2010-11 to £12,570 in 2021-22.
          It was frozen at £12,570 from 2021-22 and will remain frozen until at least April 2031.
          With nominal wages rising, this freeze progressively draws more people into income tax
          and into higher rate bands. The OBR estimates that by 2027-28 the freeze will have
          brought 4.3 million additional people into income tax compared with indexing thresholds
          to inflation.
        </p>

        <ChartCard
          title="Personal Allowance Over Time"
          subtitle="£ per year, UK"
          source={sourceFrom(raw, "thresholds")}
          height={300}
        >
          <AreaChart data={data.thresholds} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fy" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 5 : 3} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 14000]} label={yAxisLabel("£")} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="personalAllowance" name="Personal allowance (£)" fill={P.teal} stroke={P.teal} fillOpacity={0.15} strokeWidth={2.5} />
            <ReferenceLine
              x="2021-22"
              stroke={P.grey}
              strokeDasharray="4 4"
              label={{ value: "Frozen from 2021-22", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }}
            />
          </AreaChart>
        </ChartCard>
      </section>

      {/* Context */}
      <AnalysisBox
        title="Context"
        points={[
          `HMRC collected £${s.totalReceipts}bn in ${s.totalReceiptsYear}. Income tax (£310bn), NICs (£174bn), and VAT (£171bn) together account for around 76% of receipts.`,
          `The UK tax burden is forecast to reach ${s.taxBurdenForecast}% of GDP by ${s.taxBurdenForecastYear}, a post-war high on the OBR's measure. At 35.3%, the UK in 2024-25 sits above the OECD average of 33.7%.`,
          `The tax gap rose to £${s.taxGap}bn (${s.taxGapPct}%) in ${s.taxGapYear}, with corporation tax now accounting for 40% of the total gap by value. The IT/NICs/CGT gap rate of 3.0% is at a historic low.`,
          `Income tax is increasingly concentrated: the top 1% of taxpayers paid ${s.top1PctShare}% of all income tax in 2022-23, up from 21.3% in 1999-2000.`,
          `The personal allowance freeze at £${s.personalAllowance.toLocaleString()} since ${s.personalAllowanceFrozenSince}, extended to at least ${s.personalAllowanceFrozenUntil}, is the primary mechanism through which the tax burden is forecast to rise.`,
        ]}
      />
    </div>
  );
}
