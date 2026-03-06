import { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, Sector,
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";
import P from "../../theme/palette";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";

const sectionHeading = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "20px",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};

const sectionNote = {
  fontSize: "13px",
  lineHeight: 1.7,
  color: P.textMuted,
  fontFamily: "'Playfair Display', serif",
  margin: "0 0 18px",
  maxWidth: 720,
};

const toggleBtn = (active) => ({
  padding: "4px 12px",
  border: `1px solid ${active ? P.teal : P.border}`,
  borderRadius: 4,
  background: active ? P.teal : "transparent",
  color: active ? "#fff" : P.textMuted,
  fontSize: "11px",
  fontFamily: "'DM Mono', monospace",
  cursor: "pointer",
  transition: "all 0.15s",
});

const COFOG_COLORS = {
  "Social protection": P.red,
  "Health": P.teal,
  "General public services": P.sienna,
  "Education": P.navy,
  "Economic affairs": P.yellow,
  "Defence": P.grey,
  "Public order & safety": "#6B5B4E",
  "Housing & community": "#4A7A58",
  "Environment protection": "#6B8EC4",
  "Recreation & culture": "#9B7A58",
  "Accounting adjustments": "#B0A898",
};

const fmt = (n) => (n >= 1000 ? `£${(n / 1000).toFixed(1)}tn` : `£${n.toFixed(0)}bn`);
const pct = (v, total) => ((v / total) * 100).toFixed(1);

export default function Spending() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [trendView, setTrendView] = useState("bn");
  const [salary, setSalary] = useState(35000);

  useEffect(() => {
    fetch("/data/spending.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const pieData = useMemo(() => {
    if (!data?.cofogLatest) return [];
    return data.cofogLatest.map((f) => ({
      ...f,
      valueBn: Math.round(f.value / 100) / 10, // £m -> £bn
      color: COFOG_COLORS[f.name] || P.grey,
    }));
  }, [data]);

  const totalCofog = useMemo(
    () => pieData.reduce((s, f) => s + f.value, 0),
    [pieData]
  );

  // Time series from 1990 onwards for clarity
  const trendData = useMemo(() => {
    if (!data) return [];
    const source = trendView === "bn" ? data.aggregates : data.pctGDP;
    return source.filter((r) => r.year >= 1990);
  }, [data, trendView]);

  const debtData = useMemo(() => {
    if (!data) return [];
    return data.pctGDP.filter((r) => r.year >= 1990);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text }}>Public Spending</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text }}>Public Spending</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestOutturn = data.aggregates.filter((a) => !a.forecast).pop();
  const latestPct = data.pctGDP.filter((a) => !a.forecast).pop();
  const prevOutturn = data.aggregates.filter((a) => !a.forecast).slice(-2)[0];
  const population = 68.3; // ONS mid-2024 estimate, millions
  const perCapita = latestOutturn.tme
    ? Math.round((latestOutturn.tme * 1000) / population)
    : null;

  const taxPaid =
    salary <= 12570
      ? 0
      : salary <= 50270
        ? (salary - 12570) * 0.2 + salary * 0.12
        : (50270 - 12570) * 0.2 + (salary - 50270) * 0.4 + salary * 0.12;

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 15} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
      </g>
    );
  };

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Public Spending
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Total managed expenditure by function and fiscal trend.
        Spending breakdown is FY 2023-24 outturn (PESA);
        aggregates are FY {latestOutturn.fy} outturn (OBR).
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard
          label="Total spending"
          value={fmt(latestOutturn.tme)}
          sub={`${latestOutturn.fy}${perCapita ? ` · £${perCapita.toLocaleString()}/person` : ""}`}
        />
        <MetricCard
          label="Spending / GDP"
          value={`${latestPct.tme}%`}
          sub={latestPct.fy}
        />
        <MetricCard
          label="Net borrowing"
          value={`£${latestOutturn.borrowing}bn`}
          sub={latestOutturn.fy}
        />
        <MetricCard
          label="Debt interest"
          value={`£${latestOutturn.debtInterest}bn`}
          sub={`${pct(latestOutturn.debtInterest, latestOutturn.tme)}% of spending`}
        />
      </div>

      {/* Section 1: Spending by function — pie + sidebar */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Spending by Function (COFOG)</h3>
        <p style={sectionNote}>
          Total managed expenditure by UN Classification of Functions of Government,
          FY 2023-24 outturn. Includes identifiable and non-identifiable spending.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
          {/* Pie chart */}
          <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 12px 16px", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={155}
                    paddingAngle={1.5}
                    activeIndex={activeSlice}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, idx) => { setActiveSlice(idx); setHoveredItem(pieData[idx]); }}
                    onMouseLeave={() => { setActiveSlice(null); setHoveredItem(null); }}
                    style={{ outline: "none" }}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke={P.bgCard} strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Centre label */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", width: 140 }}>
                {hoveredItem ? (
                  <>
                    <div style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, lineHeight: 1.1 }}>
                      £{hoveredItem.valueBn}bn
                    </div>
                    <div style={{ fontSize: "11px", color: P.textMuted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                      {pct(hoveredItem.value, totalCofog)}%
                    </div>
                    <div style={{ fontSize: "11px", color: hoveredItem.color, marginTop: 2, fontFamily: "'DM Mono', monospace", fontWeight: 500, lineHeight: 1.3 }}>
                      {hoveredItem.name}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "26px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, lineHeight: 1.1 }}>
                      £{(totalCofog / 1000).toFixed(0)}bn
                    </div>
                    <div style={{ fontSize: "10px", color: P.textLight, marginTop: 4, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      TME 2023-24
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ marginTop: 4, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", textAlign: "center" }}>
              SOURCE: HM Treasury PESA 2025 &middot; FY 2023&ndash;24
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Breakdown list */}
            <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "16px 18px" }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.textLight, fontWeight: 500, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
                Spending by function
              </div>
              {pieData.map((item, idx) => {
                const isHovered = activeSlice === idx;
                const maxVal = Math.max(...pieData.map((i) => i.value));
                const barWidth = (item.value / maxVal) * 100;
                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => { setActiveSlice(idx); setHoveredItem(item); }}
                    onMouseLeave={() => { setActiveSlice(null); setHoveredItem(null); }}
                    style={{ padding: "7px 8px", marginBottom: 1, background: isHovered ? "rgba(28,43,69,0.04)" : "transparent", borderRadius: 3, transition: "background 0.15s" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: item.color, display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontSize: "11px", color: isHovered ? P.text : P.textMuted, fontWeight: isHovered ? 500 : 400, transition: "all 0.15s", fontFamily: "'DM Mono', monospace" }}>
                          {item.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "11px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace" }}>
                          £{item.valueBn}bn
                        </span>
                        <span style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", width: 36, textAlign: "right" }}>
                          {pct(item.value, totalCofog)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: "rgba(28,43,69,0.06)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barWidth}%`, background: item.color, borderRadius: 2, transition: "width 0.4s ease", opacity: isHovered ? 1 : 0.55 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tax calculator */}
            <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderLeft: `3px solid ${P.sienna}`, borderRadius: 3, padding: "16px 18px" }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.sienna, fontWeight: 500, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>
                Your tax contribution
              </div>
              <div style={{ fontSize: "11px", color: P.textMuted, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>Annual salary</div>
              <input
                type="range" min={15000} max={150000} step={1000} value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                style={{ width: "100%", accentColor: P.sienna, marginBottom: 4 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: "18px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text }}>
                  £{salary.toLocaleString()}
                </span>
                <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", alignSelf: "flex-end" }}>
                  ≈ £{Math.round(taxPaid).toLocaleString()} tax/yr
                </span>
              </div>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: P.textLight, fontWeight: 500, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
                Your money goes to
              </div>
              {pieData.filter((f) => f.name !== "Accounting adjustments").slice(0, 7).map((cat) => {
                const share = (cat.value / totalCofog) * taxPaid;
                return (
                  <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: cat.color, display: "inline-block" }} />
                      <span style={{ fontSize: "10px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace" }}>
                      £{Math.round(share).toLocaleString()}
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 8, fontSize: "9px", color: P.textLight, fontStyle: "italic", fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
                Approximation based on income tax + NI. Excludes VAT, council tax, and other indirect taxes.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Fiscal trend */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Receipts vs Spending</h3>
        <p style={sectionNote}>
          Public sector current receipts and total managed expenditure since 1990.
          The gap between the two lines is net borrowing. Dashed lines show OBR forecasts.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(trendView === "bn")} onClick={() => setTrendView("bn")}>£ billion</button>
          <button style={toggleBtn(trendView === "pct")} onClick={() => setTrendView("pct")}>% of GDP</button>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
            <YAxis
              tick={{ fontSize: 11, fill: P.textMuted }}
              tickFormatter={(v) => trendView === "bn" ? `£${v}bn` : `${v}%`}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => trendView === "bn" ? `£${v?.toFixed(1)}bn` : `${v?.toFixed(1)}%`} />} />
            <Area type="monotone" dataKey="tme" stroke={P.red} fill={P.red} fillOpacity={0.08} strokeWidth={2} name="Total spending" dot={false} />
            <Area type="monotone" dataKey="receipts" stroke={P.teal} fill={P.teal} fillOpacity={0.08} strokeWidth={2} name="Receipts" dot={false} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Section 3: Debt */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Public Sector Net Debt</h3>
        <p style={sectionNote}>
          Net debt as a share of GDP. Includes OBR forecasts to 2030-31.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={debtData}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} domain={[20, 110]} />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}% of GDP`} />} />
            <Line type="monotone" dataKey="debt" stroke={P.navy} strokeWidth={2.5} dot={false} name="Net debt / GDP" />
            <ReferenceLine y={100} stroke={P.red} strokeDasharray="4 4" label={{ value: "100%", fontSize: 10, fill: P.red }} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Section 4: Receipts breakdown */}
      {data.receiptTypes?.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={sectionHeading}>Tax Receipts Breakdown</h3>
          <p style={sectionNote}>
            Where the money comes from. Major tax receipts, FY {latestOutturn.fy}.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(300, data.receiptTypes.length * 26)}>
            <BarChart data={data.receiptTypes} layout="vertical" margin={{ left: 140, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `£${v}bn`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: P.textMuted }} width={135} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v.toFixed(1)}bn`} />} />
              <Bar dataKey="value" fill={P.teal} name="Receipts" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Context */}
      <AnalysisBox>
        Total managed expenditure in {latestOutturn.fy} was £{latestOutturn.tme.toFixed(0)}bn
        ({latestPct.tme}% of GDP), against receipts of £{latestOutturn.receipts.toFixed(0)}bn,
        leaving net borrowing of £{latestOutturn.borrowing.toFixed(0)}bn.
        Social protection (£{(pieData.find(f => f.name === "Social protection")?.valueBn)}bn)
        and health (£{(pieData.find(f => f.name === "Health")?.valueBn)}bn) together
        account for {pct(
          (pieData.find(f => f.name === "Social protection")?.value || 0) +
          (pieData.find(f => f.name === "Health")?.value || 0),
          totalCofog
        )}% of all spending. Debt interest was £{latestOutturn.debtInterest}bn,
        exceeding the defence budget (£{(pieData.find(f => f.name === "Defence")?.valueBn)}bn).
        Net debt stands at {latestPct.debt}% of GDP (£{latestOutturn.debt.toFixed(0)}bn),
        the OBR forecasts it rising to ~97% by 2028-29.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://obr.uk/data/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          OBR Public Finances Databank (Feb 2026)
        </a>
        {" · "}
        <a href="https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2025" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          HM Treasury PESA 2025 — Chapter 9 (COFOG functions, FY 2023-24)
        </a>
      </div>
    </div>
  );
}
