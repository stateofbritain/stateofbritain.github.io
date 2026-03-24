import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
  withFyNum, fyTickFormatter,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import AnalysisBox from "../../components/AnalysisBox";
import useIsMobile from "../../hooks/useIsMobile";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const YIELD_COLORS = {
  y2: P.teal,
  y5: P.sienna,
  y10: P.navy,
  y30: "#7B4B8A",
};

const YIELD_LABELS = {
  y2: "2-year",
  y5: "5-year",
  y10: "10-year",
  y30: "30-year",
};

const MONTH_ORDER = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export default function Borrowing() {
  const { data, loading, error, raw } = useJsonDataset("borrowing.json");
  const isMobile = useIsMobile();
  const [borrowingView, setBorrowingView] = useState("pctGdp");
  const [intlYieldView, setIntlYieldView] = useState("trend");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Borrowing & Debt</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Borrowing & Debt</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  // Prepare gilt yield chart data — convert month string to numeric for proportional axis
  const yieldData = (data.giltYields || []).map(d => {
    const [y, m] = d.month.split("-");
    return { ...d, monthNum: parseInt(y) + (parseInt(m) - 1) / 12 };
  });

  // Prepare monthly borrowing comparison by FY
  const fys = [...new Set((data.monthlyBorrowing || []).map(d => d.fy))];
  const FY_COLORS = {
    [fys[0]]: P.grey,
    [fys[1]]: P.teal,
    [fys[2]]: P.navy,
  };

  const monthlyCompare = MONTH_ORDER.map(m => {
    const row = { month: m };
    fys.forEach(fy => {
      const entry = (data.monthlyBorrowing || []).find(d => d.month === m && d.fy === fy);
      row[fy] = entry?.borrowing ?? null;
    });
    return row;
  });

  // Annual borrowing with FY numeric
  const annualData = withFyNum(data.annualBorrowing || [], "fy");

  // Debt interest with FY numeric
  const interestData = withFyNum(data.debtInterest || [], "fy");

  // Debt to GDP with FY numeric
  const debtGdpData = withFyNum((data.debtToGdp || []).map(d => ({
    ...d,
    pctActual: d.forecast ? null : d.pct,
    pctForecast: d.forecast ? d.pct : null,
    // Bridge: last actual year also gets forecast value for continuous line
  })), "fy");
  // Add bridge point so forecast line connects to actual
  const lastActualIdx = debtGdpData.findLastIndex(d => d.pctActual != null);
  if (lastActualIdx >= 0 && lastActualIdx < debtGdpData.length - 1) {
    debtGdpData[lastActualIdx].pctForecast = debtGdpData[lastActualIdx].pctActual;
  }

  // Maturity profile
  const maturityData = data.maturityProfile || [];

  // Gilt issuance
  const issuanceData = withFyNum(data.giltIssuance || [], "fy");

  // International comparison sorted descending
  const intlSorted = data.intlDebtGdp
    ? [...data.intlDebtGdp].sort((a, b) => b.pct - a.pct)
    : [];

  // Credit ratings
  const ratings = data.creditRatings || [];

  // Yield month formatter
  const yieldTickFormatter = (v) => {
    const year = Math.floor(v);
    const monthIdx = Math.round((v - year) * 12);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIdx === 0) return `${year}`;
    return months[monthIdx] || "";
  };

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Borrowing & Debt</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Gilt yields, borrowing, debt interest & issuance
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="10-Year Gilt Yield"
          value={`${s.tenYearYield}%`}
          change={s.tenYearYieldDate}
          up={true}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Annual Borrowing"
          value={`£${s.annualBorrowing}bn`}
          change={s.annualBorrowingYear}
          up={true}
          color={P.sienna}
          delay={0.18}
        />
        <MetricCard
          label="Debt Interest"
          value={`£${s.debtInterest}bn`}
          change={s.debtInterestYear}
          up={true}
          color={P.red}
          delay={0.26}
        />
        <MetricCard
          label="Net Debt / GDP"
          value={`${s.debtToGdp}%`}
          change={s.debtToGdpDate}
          up={true}
          color={P.teal}
          delay={0.34}
        />
      </div>

      {/* Credit ratings inline */}
      {ratings.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {ratings.map(r => (
            <div
              key={r.agency}
              style={{
                background: P.bgCard,
                border: `1px solid ${P.border}`,
                borderRadius: 3,
                padding: "10px 16px",
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
              }}
            >
              <span style={{ color: P.textLight }}>{r.agency}</span>
              <span style={{ color: P.text, fontWeight: 600, marginLeft: 8, fontSize: "14px" }}>{r.rating}</span>
              <span style={{ color: P.textLight, marginLeft: 8 }}>{r.outlook}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 1: Gilt Yields ──────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Gilt Yields</h3>
        <p style={SECTION_NOTE}>
          Gilt yields reflect the interest rate the UK government pays to borrow at different
          maturities. The 10-year gilt yield stood at {s.tenYearYield}% in {s.tenYearYieldDate},
          up from around 1% at the start of 2022. The increase reflects higher Bank of England
          base rates, elevated inflation expectations, and global monetary tightening. Longer-dated
          yields (30-year) have risen particularly, with the term premium widening as investors
          demand more compensation for duration risk.
        </p>

        <ChartCard
          title="UK Gilt Yields by Maturity"
          subtitle="Monthly average %, conventional gilts, United Kingdom"
          source={sourceFrom(raw, "giltYields")}
          legend={[
            { key: "y2", label: "2-year", color: YIELD_COLORS.y2 },
            { key: "y5", label: "5-year", color: YIELD_COLORS.y5 },
            { key: "y10", label: "10-year", color: YIELD_COLORS.y10 },
            { key: "y30", label: "30-year", color: YIELD_COLORS.y30 },
          ]}
          height={380}
        >
          <LineChart data={yieldData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="monthNum"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={yieldTickFormatter}
              tick={AXIS_TICK_MONO}
              axisLine={{ stroke: P.border }}
              tickLine={false}
              interval={isMobile ? 8 : 4}
            />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 6]} label={yAxisLabel("%")} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.month}</div>
                    {Object.entries(YIELD_LABELS).map(([k, label]) => (
                      d[k] != null && <div key={k}><span style={{ color: YIELD_COLORS[k] }}>{label}</span>: {d[k].toFixed(2)}%</div>
                    ))}
                  </div>
                );
              }}
            />
            <ReferenceLine x={2008 + 8/12} stroke={P.grey} strokeDasharray="4 4"
              label={{ value: "Financial crisis", fontSize: 9, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
            <ReferenceLine x={2020 + 2/12} stroke={P.grey} strokeDasharray="4 4"
              label={{ value: "COVID", fontSize: 9, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
            <ReferenceLine x={2022 + 8/12} stroke={P.red} strokeDasharray="4 4"
              label={{ value: "Mini-budget", fontSize: 9, fill: P.red, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
            {Object.entries(YIELD_COLORS).map(([key, color]) => (
              <Line key={key} type="monotone" dataKey={key} name={YIELD_LABELS[key]} stroke={color} strokeWidth={key === "y10" ? 2.5 : 1.5} dot={false} />
            ))}
          </LineChart>
        </ChartCard>

        {/* International yield comparison */}
        <div style={{ marginTop: 18 }}>
          <ChartCard
            title={intlYieldView === "trend" ? "10-Year Government Bond Yields Over Time" : "10-Year Government Bond Yields, Current"}
            subtitle={intlYieldView === "trend" ? "Annual average %, 2000–2025" : "%, March 2026"}
            views={["trend", "current"]}
            viewLabels={{ trend: "Over Time", current: "Current" }}
            activeView={intlYieldView}
            onViewChange={setIntlYieldView}
            source={sourceFrom(raw, intlYieldView === "trend" ? "intlYieldTrend" : "intlYields")}
            legend={intlYieldView === "trend" ? [
              { key: "uk", label: "UK", color: P.red },
              { key: "us", label: "US", color: P.navy },
              { key: "de", label: "Germany", color: P.teal },
              { key: "fr", label: "France", color: P.sienna },
              { key: "jp", label: "Japan", color: P.yellow },
            ] : undefined}
            height={intlYieldView === "trend" ? 380 : Math.max(300, (data.intlYields?.length || 10) * 30)}
          >
            {intlYieldView === "trend" ? (
              <LineChart data={data.intlYieldTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[-1, 7]} label={yAxisLabel("%")} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
                <Line type="monotone" dataKey="uk" name="UK" stroke={P.red} strokeWidth={2.5} dot={{ r: 2.5, fill: P.red }} />
                <Line type="monotone" dataKey="us" name="US" stroke={P.navy} strokeWidth={2} dot={{ r: 2, fill: P.navy }} />
                <Line type="monotone" dataKey="de" name="Germany" stroke={P.teal} strokeWidth={2} dot={{ r: 2, fill: P.teal }} />
                <Line type="monotone" dataKey="fr" name="France" stroke={P.sienna} strokeWidth={1.5} dot={false} strokeDasharray="6 3" />
                <Line type="monotone" dataKey="jp" name="Japan" stroke={P.yellow} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <ReferenceLine y={0} stroke={P.text} strokeWidth={0.5} />
              </LineChart>
            ) : (
              <BarChart data={[...(data.intlYields || [])].sort((a, b) => b.y10 - a.y10)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={isMobile ? 80 : 120} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
                <Bar dataKey="y10" name="10-year yield (%)" radius={[0, 3, 3, 0]}>
                  {[...(data.intlYields || [])].sort((a, b) => b.y10 - a.y10).map(d => (
                    <Cell key={d.country} fill={d.country === "United Kingdom" ? P.red : P.navy} opacity={d.country === "United Kingdom" ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ChartCard>
        </div>
      </section>

      {/* ── Section 2: Monthly Borrowing ───────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Monthly Borrowing</h3>
        <p style={SECTION_NOTE}>
          Public sector net borrowing in the financial year to February 2026 was £{s.ytdBorrowing}bn,
          £11.9bn (8.7%) less than in the same period a year earlier. January is typically a surplus
          month due to self-assessment tax receipts, while the start and end of the financial year
          tend to see higher borrowing. Total borrowing in 2024-25 was £{s.annualBorrowing}bn,
          the third-highest financial year on record.
        </p>

        <ChartCard
          title="Monthly Public Sector Net Borrowing"
          subtitle="£bn, ex public sector banks, United Kingdom"
          source={sourceFrom(raw, "monthlyBorrowing")}
          legend={fys.map(fy => ({ key: fy, label: fy, color: FY_COLORS[fy] }))}
          height={340}
        >
          <BarChart data={monthlyCompare} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} vertical={false} />
            <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={P.border} />
            {fys.map(fy => (
              <Bar key={fy} dataKey={fy} name={fy} fill={FY_COLORS[fy]} fillOpacity={0.75} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ChartCard>
      </section>

      {/* ── Section 3: Annual Borrowing Trend ──────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Annual Borrowing Trend</h3>
        <p style={SECTION_NOTE}>
          The UK ran budget surpluses in the late 1990s before returning to deficit in 2001-02.
          The financial crisis of 2008-09 pushed borrowing to £154.5bn (9.8% of GDP) in 2009-10.
          Borrowing was reduced through fiscal consolidation during the 2010s, reaching 2.0% of
          GDP in 2018-19. The COVID-19 pandemic caused borrowing to reach £310.9bn (14.7% of GDP)
          in 2020-21, a peacetime record. Borrowing was £{s.annualBorrowing}bn (5.2% of GDP) in
          2024-25. The OBR forecasts it will decline to 1.9% of GDP by 2029-30.
        </p>

        <ChartCard
          title="Public Sector Net Borrowing"
          subtitle="Financial year, United Kingdom"
          source={sourceFrom(raw, "annualBorrowing")}
          views={["pctGdp", "abs"]}
          viewLabels={{ pctGdp: "% of GDP", abs: "£bn" }}
          activeView={borrowingView}
          onViewChange={setBorrowingView}
          height={340}
        >
          <ComposedChart data={annualData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 5 : 3} />
            {borrowingView === "pctGdp" ? (
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("% GDP")} />
            ) : (
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.fy}{d.forecast ? " (forecast)" : ""}</div>
                    <div>Borrowing: £{d.borrowing}bn ({d.pctGdp}% of GDP)</div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke={P.border} />
            <Bar
              dataKey={borrowingView === "pctGdp" ? "pctGdp" : "borrowing"}
              name={borrowingView === "pctGdp" ? "Borrowing (% GDP)" : "Borrowing (£bn)"}
              radius={[2, 2, 0, 0]}
            >
              {annualData.map((d, i) => (
                <Cell key={i} fill={d.forecast ? P.grey : P.navy} fillOpacity={d.forecast ? 0.4 : 0.7} />
              ))}
            </Bar>
          </ComposedChart>
        </ChartCard>
      </section>

      {/* ── Section 4: Debt Interest ───────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Debt Interest</h3>
        <p style={SECTION_NOTE}>
          Debt interest payments reached a post-war high of £112.1bn (4.3% of GDP) in 2022-23,
          driven by the impact of high RPI inflation on index-linked gilts. Around 25% of UK
          government debt is index-linked, meaning interest costs rise with inflation. Payments
          fell to £{s.debtInterest}bn in {s.debtInterestYear} as inflation moderated, but are
          forecast to rise to £136.6bn by 2029-30 as the stock of debt continues to grow. Debt
          interest now accounts for approximately 8% of total government spending, compared with
          around 4% in the 2010s.
        </p>

        <ChartCard
          title="Debt Interest Payments"
          subtitle="Central government, net of APF, £bn and % of GDP, United Kingdom"
          source={sourceFrom(raw, "debtInterest")}
          legend={[
            { key: "interest", label: "£bn (left)", color: P.sienna },
            { key: "pctGdp", label: "% GDP (right)", color: P.navy },
          ]}
          height={340}
        >
          <ComposedChart data={interestData} margin={{ top: 5, right: 40, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 5 : 3} />
            <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
            <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 5]} label={yAxisLabel("% GDP", { position: "insideRight" })} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.fy}{d.forecast ? " (forecast)" : ""}</div>
                    <div>Debt interest: £{d.interest}bn</div>
                    <div>Share of GDP: {d.pctGdp}%</div>
                  </div>
                );
              }}
            />
            <Bar yAxisId="left" dataKey="interest" name="Debt interest (£bn)" radius={[2, 2, 0, 0]}>
              {interestData.map((d, i) => (
                <Cell key={i} fill={d.forecast ? P.grey : P.sienna} fillOpacity={d.forecast ? 0.4 : 0.7} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="pctGdp" name="% of GDP" stroke={P.navy} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ChartCard>
      </section>

      {/* ── Section 5: Debt to GDP ─────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Public Sector Net Debt</h3>
        <p style={SECTION_NOTE}>
          Public sector net debt stood at {s.debtToGdp}% of GDP as of {s.debtToGdpDate},
          at levels last seen in the early 1960s. Debt rose from around 30% of GDP in 2001-02
          to 50% after the financial crisis, then climbed sharply during COVID to 97% in 2020-21.
          It has stabilised in the mid-90s range. The OBR forecasts it will peak at around 96%
          in 2028-29 before declining marginally.
        </p>

        <ChartCard
          title="Public Sector Net Debt"
          subtitle="% of GDP, financial year, United Kingdom"
          source={sourceFrom(raw, "debtToGdp")}
          height={320}
        >
          <ComposedChart data={debtGdpData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 5 : 3} />
            <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 110]} label={yAxisLabel("% GDP")} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.fy}{d.forecast ? " (forecast)" : ""}</div>
                    <div>Net debt: {d.pct}% of GDP</div>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="pctActual" name="Net debt (% GDP)" stroke={P.navy} strokeWidth={2.5} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="pctForecast" name="Forecast" stroke={P.navy} strokeWidth={2} dot={false} strokeDasharray="6 4" connectNulls={false} />
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
          </ComposedChart>
        </ChartCard>
      </section>

      {/* ── Section 6: Gilt Maturity Profile ───────────────────────────── */}
      {maturityData.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Debt Maturity Profile</h3>
          <p style={SECTION_NOTE}>
            The UK government's outstanding gilt portfolio is distributed across maturities
            from under 5 years to over 40 years. The average maturity of outstanding debt was
            approximately {s.avgMaturity} years as of 2024. A significant share of gilts (around
            25%) are index-linked, with inflation uplifts adding to the nominal value. The DMO
            has shortened the average maturity of new issuance in recent years, with the share
            of short and ultra-short gilts in new issuance rising from 29% pre-pandemic to 34%
            subsequently.
          </p>

          <ChartCard
            title="Gilt Portfolio by Maturity"
            subtitle="£bn outstanding, approximate, United Kingdom"
            source={sourceFrom(raw, "maturityProfile")}
            legend={[
              { key: "conventional", label: "Conventional", color: P.navy },
              { key: "indexLinked", label: "Index-linked", color: P.sienna },
            ]}
            height={Math.max(260, maturityData.length * 38 + 30)}
          >
            <BarChart data={maturityData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn", { angle: 0, position: "insideBottom" })} />
              <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={isMobile ? 70 : 90} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.bucket}</div>
                      <div>Conventional: £{d.conventional}bn</div>
                      <div>Index-linked: £{d.indexLinked}bn</div>
                      <div>Total: £{d.total}bn</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="conventional" name="Conventional" fill={P.navy} fillOpacity={0.75} stackId="1" />
              <Bar dataKey="indexLinked" name="Index-linked" fill={P.sienna} fillOpacity={0.7} stackId="1" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartCard>
        </section>
      )}

      {/* ── Section 7: Gilt Issuance ───────────────────────────────────── */}
      {issuanceData.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Gilt Issuance</h3>
          <p style={SECTION_NOTE}>
            The government's gross gilt issuance has risen substantially since the pandemic.
            In 2024-25, the DMO issued £296.9bn in gilts, with £117.5bn in redemptions, resulting
            in net issuance of £179.4bn. The 2025-26 financing remit plans £299.6bn in gross
            issuance with £164.7bn in redemptions. Rising redemption volumes, as gilts issued in
            earlier years mature, add to the gross financing requirement even when net borrowing
            is declining.
          </p>

          <ChartCard
            title="Gross Gilt Issuance and Redemptions"
            subtitle="£bn, financial year, United Kingdom"
            source={sourceFrom(raw, "giltIssuance")}
            legend={[
              { key: "gross", label: "Gross issuance", color: P.navy },
              { key: "redemptions", label: "Redemptions", color: P.sienna },
              { key: "net", label: "Net issuance", color: P.teal },
            ]}
            height={340}
          >
            <ComposedChart data={issuanceData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 520]} label={yAxisLabel("£bn")} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: P.navy, border: "none", borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#fff", lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.fy}{d.planned ? " (planned)" : ""}</div>
                      <div>Gross issuance: £{d.gross}bn</div>
                      <div>Redemptions: £{d.redemptions}bn</div>
                      <div>Net issuance: £{d.net}bn</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="gross" name="Gross issuance" fill={P.navy} fillOpacity={0.65} radius={[2, 2, 0, 0]} />
              <Bar dataKey="redemptions" name="Redemptions" fill={P.sienna} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="net" name="Net issuance" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal }} />
            </ComposedChart>
          </ChartCard>
        </section>
      )}

      {/* ── Section 8: International Debt Comparison ───────────────────── */}
      {intlSorted.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>International Comparison</h3>
          <p style={SECTION_NOTE}>
            On the IMF's general government gross debt measure, the UK stood at 101.3% of GDP
            in 2024, broadly in line with Spain and Belgium, and above Germany (62.9%) and the
            Netherlands (43.7%). Japan (252.7%), Italy (136.9%), and the United States (123.8%)
            carry higher debt ratios. The IMF measure differs from the ONS public sector net
            debt figure (which excludes liquid assets), so the levels are not directly comparable
            with domestic statistics.
          </p>

          <ChartCard
            title="Government Debt as % of GDP"
            subtitle="General government gross debt, IMF WEO 2024 estimates"
            source={sourceFrom(raw, "intlDebtGdp")}
            height={Math.max(340, intlSorted.length * 28 + 30)}
          >
            <BarChart data={intlSorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 280]} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={isMobile ? 80 : 110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pct" name="Debt/GDP (%)" radius={[0, 3, 3, 0]} barSize={16}>
                {intlSorted.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.country === "UK" ? P.navy : P.teal}
                    fillOpacity={d.country === "UK" ? 0.9 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </section>
      )}

      {/* Context */}
      <AnalysisBox
        title="Context"
        points={[
          `The 10-year gilt yield was ${s.tenYearYield}% in ${s.tenYearYieldDate}, up from around 1% at the start of 2022. The 30-year yield reached 5.6%, reflecting a widening term premium.`,
          `Public sector net borrowing was £${s.annualBorrowing}bn in ${s.annualBorrowingYear}, the third-highest financial year on record. The OBR forecasts borrowing will decline to 1.9% of GDP by 2029-30.`,
          `Debt interest payments were £${s.debtInterest}bn in ${s.debtInterestYear}, down from the post-war high of £112.1bn in 2022-23 but forecast to rise to £136.6bn by 2029-30 as the debt stock grows.`,
          `Public sector net debt stood at ${s.debtToGdp}% of GDP as of ${s.debtToGdpDate}. The debt-to-GDP ratio has stabilised in the mid-90s after rising sharply from 30% in the early 2000s.`,
          `The UK's credit ratings are ${ratings.map(r => `${r.agency}: ${r.rating}`).join(", ")}. All three agencies assign stable outlooks.`,
          `Gross gilt issuance was £296.9bn in 2024-25, with £164.7bn in redemptions due in 2025-26. Rising redemption volumes increase the refinancing requirement even as net borrowing declines.`,
        ]}
      />
    </div>
  );
}
