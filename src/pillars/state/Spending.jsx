import { useState, useEffect, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, Sector,
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";
import P from "../../theme/palette";
import { generateShades } from "../../theme/shades";
import useIsMobile from "../../hooks/useIsMobile";
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

function cleanName(name) {
  return name.replace(/\s*\(\d+\)\s*$/, "").replace(/\s+$/, "");
}

const SHORT_NAMES = {
  "Health and Social Care": "Health & Social Care",
  "Foreign, Commonwealth and Development Office": "FCDO",
  "MHCLG - Local Government": "MHCLG — Local Gov",
  "MHCLG - Housing and Communities": "MHCLG — Housing",
  "Culture, Media and Sport": "Culture, Media & Sport",
  "Science, Innovation and Technology": "Science & Technology",
  "Energy Security and Net Zero": "Energy & Net Zero",
  "Environment, Food and Rural Affairs": "DEFRA",
  "Law Officers' Departments": "Law Officers",
  "Single Intelligence Account": "Intelligence",
  "Small and Independent Bodies": "Small Bodies",
  "Northern Ireland Executive": "Northern Ireland",
};

const DEPT_COLORS = {
  "Work and Pensions": "#C25454",
  "Health and Social Care": P.teal,
  "Education": P.navy,
  "Defence": "#6B7B8D",
  "Scottish Government": "#2E5B9E",
  "HM Treasury": P.sienna,
  "MHCLG - Local Government": "#4A7A58",
  "HM Revenue and Customs": "#8B6B4E",
  "Northern Ireland Executive": "#5C8A4A",
  "Transport": "#C49A3C",
  "Welsh Government": "#9E3E3E",
  "Cabinet Office": "#7A6B58",
  "Home Office": "#4E5D6C",
  "Energy Security and Net Zero": "#5B8A6B",
  "Justice": "#6B5B7A",
  "Science, Innovation and Technology": "#4A7A9E",
  "Culture, Media and Sport": "#9B7A58",
  "MHCLG - Housing and Communities": "#5A8A58",
  "Foreign, Commonwealth and Development Office": "#7A5B8A",
  "Environment, Food and Rural Affairs": "#6B8E5B",
  "Single Intelligence Account": "#5B5B6B",
  "Law Officers' Departments": "#7B6B5B",
  "Business and Trade": "#5B7B8A",
  "Small and Independent Bodies": "#8A8A7A",
  // Non-departmental
  "Debt interest": "#B04040",
  "Other departments": "#8A8888",
};

const fmt = (n) => (n >= 1000 ? `£${(n / 1000).toFixed(1)}tn` : `£${n.toFixed(0)}bn`);
const fmtM = (n) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}bn`;
  return `£${n.toFixed(0)}m`;
};
const pct = (v, total) => ((v / total) * 100).toFixed(1);

// Show all departments individually in pie (no "Other" grouping)

function SubDeptPie({ breakdown, color }) {
  const shades = generateShades(color, breakdown.length);
  const [hovered, setHovered] = useState(null);
  const total = breakdown.reduce((s, d) => s + d.value, 0);

  const renderSlice = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div style={{ width: 130, height: 130, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={breakdown}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={55}
              paddingAngle={1}
              activeIndex={hovered}
              activeShape={renderSlice}
              onMouseEnter={(_, idx) => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={{ outline: "none" }}
            >
              {breakdown.map((_, idx) => (
                <Cell key={idx} fill={shades[idx]} stroke={P.bgCard} strokeWidth={1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        {breakdown.map((item, idx) => (
          <div
            key={item.name}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "2px 4px", borderRadius: 2, cursor: "pointer",
              background: hovered === idx ? "rgba(28,43,69,0.04)" : "transparent",
              transition: "background 0.12s",
              opacity: hovered != null && hovered !== idx ? 0.45 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: 1, background: shades[idx], display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "9px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>{item.name}</span>
            </div>
            <span style={{ fontSize: "9px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace", marginLeft: 8, whiteSpace: "nowrap" }}>
              {fmtM(item.value)} <span style={{ color: P.textLight, fontWeight: 400 }}>({((item.value / total) * 100).toFixed(1)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DrillPie({ dept, isMobile }) {
  const shades = generateShades(dept.color, dept.breakdown.length);
  const [hovered, setHovered] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const total = dept.breakdown.reduce((s, d) => s + d.value, 0);

  const renderSlice = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 15} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
      </g>
    );
  };

  return (
    <>
      <div style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 440}>
          <PieChart>
            <Pie
              data={dept.breakdown}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 60 : 95}
              outerRadius={isMobile ? 125 : 175}
              paddingAngle={1}
              activeIndex={hovered}
              activeShape={renderSlice}
              onMouseEnter={isMobile ? undefined : (_, idx) => { setHovered(idx); setHoveredSlice(dept.breakdown[idx]); }}
              onMouseLeave={isMobile ? undefined : () => { setHovered(null); setHoveredSlice(null); }}
              onClick={isMobile ? (_, idx) => {
                if (hovered === idx) { setHovered(null); setHoveredSlice(null); }
                else { setHovered(idx); setHoveredSlice(dept.breakdown[idx]); }
              } : undefined}
              isAnimationActive={false}
              style={{ outline: "none" }}
            >
              {dept.breakdown.map((_, idx) => (
                <Cell key={idx} fill={shades[idx]} stroke={P.bgCard} strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", width: 160 }}>
          {hoveredSlice ? (
            <>
              <div style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, lineHeight: 1.1 }}>
                {fmtM(hoveredSlice.value)}
              </div>
              <div style={{ fontSize: "11px", color: P.textMuted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                {((hoveredSlice.value / total) * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: "11px", color: shades[hovered], marginTop: 2, fontFamily: "'DM Mono', monospace", fontWeight: 500, lineHeight: 1.3 }}>
                {hoveredSlice.name}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "28px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: dept.color, lineHeight: 1.1 }}>
                {fmtM(total)}
              </div>
              <div style={{ fontSize: "10px", color: P.textLight, marginTop: 4, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {dept.cleanName}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend grid */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 16px", marginTop: 8, padding: "0 20px" }}>
        {dept.breakdown.map((item, idx) => (
          <div
            key={item.name}
            onMouseEnter={() => { setHovered(idx); setHoveredSlice(item); }}
            onMouseLeave={() => { setHovered(null); setHoveredSlice(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "2px 0",
              opacity: hovered != null && hovered !== idx ? 0.45 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: shades[idx], display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: "10px", color: hovered === idx ? P.text : P.textMuted, fontFamily: "'DM Mono', monospace", transition: "color 0.15s" }}>
              {item.name} ({fmtM(item.value)})
            </span>
          </div>
        ))}
      </div>

    </>
  );
}

export default function Spending() {
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [expandedDept, setExpandedDept] = useState(null);
  const [selectedPieDept, setSelectedPieDept] = useState(null);
  const hasAnimated = useRef(false);
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

  // All departments sorted by latest value
  const sortedDepts = useMemo(() => {
    if (!data?.departments?.items) return [];
    const fy = data.departments.latestFy;
    return [...data.departments.items]
      .map((d) => {
        const cleaned = cleanName(d.name);
        return {
          ...d,
          cleanName: cleaned,
          shortName: SHORT_NAMES[cleaned] || cleaned,
          latest: d.values[fy] || 0,
          color: DEPT_COLORS[cleaned] || P.grey,
        };
      })
      .sort((a, b) => b.latest - a.latest);
  }, [data]);

  // Build pie data: departments + debt interest (no non-departmental accounting items)
  const { pieData, pieTotalM, outerRingData } = useMemo(() => {
    if (!data?.departments) return { pieData: [], pieTotalM: 0, outerRingData: [] };
    const fy = data.departments.latestFy;

    // Group smallest departments (≤ Small and Independent Bodies threshold)
    const smallBodies = sortedDepts.find((d) => d.cleanName === "Small and Independent Bodies");
    const threshold = smallBodies ? smallBodies.latest : 3000;
    const large = [];
    let smallTotal = 0;
    for (const d of sortedDepts) {
      if (d.latest > threshold) {
        large.push({ name: d.shortName, value: d.latest, color: d.color });
      } else if (d.latest > 0) {
        smallTotal += d.latest;
      }
    }
    if (smallTotal > 0) {
      large.push({ name: "Other departments", value: smallTotal, color: DEPT_COLORS["Other departments"] });
    }

    // Debt interest (real spending, not an accounting item)
    const debtInterest = data.departments.otherItems.find((i) =>
      i.name.toLowerCase().includes("debt interest")
    );
    const diVal = debtInterest?.values[fy] || 0;
    if (diVal > 0) {
      large.push({
        name: "Debt interest",
        value: diVal,
        color: DEPT_COLORS["Debt interest"],
        cleanName: "Debt Interest",
        breakdown: [
          { name: "Index-linked gilts", value: 38000 },
          { name: "Conventional gilts", value: 32000 },
          { name: "NS&I (savings products)", value: 7500 },
          { name: "Treasury bills", value: 4500 },
          { name: "Other debt interest", value: diVal - 82000 },
        ],
      });
    }

    // Sort by value descending
    large.sort((a, b) => b.value - a.value);
    const total = large.reduce((s, d) => s + d.value, 0);

    // Build outer ring: sub-categories only for slices >= Defence's size
    const defenceVal = sortedDepts.find(d => d.cleanName === "Defence")?.latest || 0;
    const outerRing = [];
    for (const entry of large) {
      const dept = sortedDepts.find(d => d.shortName === entry.name);
      const breakdown = dept?.breakdown || entry.breakdown;
      if (breakdown && entry.value >= defenceVal) {
        entry.hasSubRing = true;
        const shades = generateShades(entry.color, breakdown.length);
        const bkTotal = breakdown.reduce((s, d) => s + d.value, 0);
        const scale = entry.value / bkTotal;
        breakdown.forEach((item, idx) => {
          outerRing.push({ name: item.name, value: item.value * scale, color: shades[idx], parent: entry.name });
        });
      } else {
        entry.hasSubRing = false;
        outerRing.push({ name: entry.name, value: entry.value, color: "none", parent: entry.name });
      }
    }

    return { pieData: large, pieTotalM: total, outerRingData: outerRing };
  }, [data, sortedDepts]);

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
  const population = 68.3;
  const perCapita = latestOutturn.tme
    ? Math.round((latestOutturn.tme * 1000) / population)
    : null;
  const latestFy = data.departments.latestFy;

  const taxPaid =
    salary <= 12570
      ? 0
      : salary <= 50270
        ? (salary - 12570) * 0.2 + salary * 0.12
        : (50270 - 12570) * 0.2 + (salary - 50270) * 0.4 + salary * 0.12;

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    const hasRing = payload?.hasSubRing;
    const outer = hasRing ? (isMobile ? 118 : 175) : outerRadius;
    const bump = isMobile ? 3 : 6;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outer + bump} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 2} outerRadius={outerRadius + (isMobile ? 4 : 7)} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
      </g>
    );
  };

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Public Spending
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Total managed expenditure by government department and fiscal trend.
        Departmental breakdown is FY {latestFy} outturn (PESA);
        aggregates are FY {latestOutturn.fy} outturn (OBR).
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
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

      {/* Section 1: Pie chart — full width */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Where the Money Goes</h3>
        <p style={sectionNote}>
          {selectedPieDept
            ? `${selectedPieDept.cleanName} sub-departmental breakdown, FY 2024-25.`
            : `Government spending by department, FY ${latestFy}. Click a department to drill down.`}
        </p>

        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 12px 16px", position: "relative" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "0 8px", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
            <span
              onClick={() => { setSelectedPieDept(null); setActiveSlice(null); setHoveredItem(null); }}
              style={{ color: selectedPieDept ? P.teal : P.text, cursor: selectedPieDept ? "pointer" : "default", fontWeight: 500 }}
            >
              All spending
            </span>
            {selectedPieDept && (
              <>
                <span style={{ color: P.textLight }}>/</span>
                <span style={{ color: selectedPieDept.color, fontWeight: 500 }}>{selectedPieDept.cleanName}</span>
              </>
            )}
          </div>

          {!selectedPieDept ? (
            /* ── Main TME pie ── */
            <>
              <div style={{ position: "relative" }}>
                <ResponsiveContainer width="100%" height={isMobile ? 300 : 440}>
                  <PieChart>
                    {/* Base pie: small depts extend to full rim, large depts stop at 175 */}
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 60 : 95}
                      outerRadius={isMobile ? 130 : 192}
                      paddingAngle={0}
                      activeIndex={activeSlice}
                      activeShape={renderActiveShape}
                      onMouseEnter={isMobile ? undefined : (_, idx) => { setActiveSlice(idx); setHoveredItem(pieData[idx]); }}
                      onMouseLeave={isMobile ? undefined : () => { setActiveSlice(null); setHoveredItem(null); }}
                      onClick={(_, idx) => {
                        if (isMobile) {
                          if (activeSlice === idx) {
                            // Second tap — drill down
                            const entry = pieData[idx];
                            const match = sortedDepts.find(d => d.shortName === entry.name);
                            const target = match?.breakdown ? match : entry.breakdown ? entry : null;
                            if (target) { setSelectedPieDept(target); setActiveSlice(null); setHoveredItem(null); }
                            else { setActiveSlice(null); setHoveredItem(null); }
                          } else {
                            // First tap — select
                            setActiveSlice(idx);
                            setHoveredItem(pieData[idx]);
                          }
                          return;
                        }
                        const entry = pieData[idx];
                        const match = sortedDepts.find(d => d.shortName === entry.name);
                        const target = match?.breakdown ? match : entry.breakdown ? entry : null;
                        if (!target) return;
                        setSelectedPieDept(target);
                        setActiveSlice(null);
                        setHoveredItem(null);
                      }}
                      isAnimationActive={!hasAnimated.current}
                      onAnimationEnd={() => { hasAnimated.current = true; }}
                      style={{ outline: "none", cursor: "pointer" }}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke={P.bgCard} strokeWidth={2} style={{ cursor: "pointer" }} />
                      ))}
                    </Pie>
                    {/* Sub-category ring overlaid on large departments (covers 178-192) */}
                    <Pie
                      data={outerRingData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 120 : 178}
                      outerRadius={isMobile ? 130 : 192}
                      paddingAngle={0}
                      isAnimationActive={!hasAnimated.current}
                      onMouseEnter={isMobile ? undefined : (_, idx) => {
                        const item = outerRingData[idx];
                        if (item.color === "none") return;
                        setHoveredItem({ name: item.name, value: item.value, color: item.color, parent: item.parent });
                        const parentIdx = pieData.findIndex(d => d.name === item.parent);
                        setActiveSlice(parentIdx >= 0 ? parentIdx : null);
                      }}
                      onMouseLeave={isMobile ? undefined : () => { setActiveSlice(null); setHoveredItem(null); }}
                      onClick={(_, idx) => {
                        const item = outerRingData[idx];
                        if (item.color === "none") return;
                        if (isMobile) {
                          setHoveredItem({ name: item.name, value: item.value, color: item.color, parent: item.parent });
                          const parentIdx = pieData.findIndex(d => d.name === item.parent);
                          setActiveSlice(parentIdx >= 0 ? parentIdx : null);
                          return;
                        }
                        const match = sortedDepts.find(d => d.shortName === item.parent);
                        if (!match?.breakdown) return;
                        setSelectedPieDept(match);
                        setActiveSlice(null);
                        setHoveredItem(null);
                      }}
                      style={{ outline: "none", cursor: "pointer" }}
                    >
                      {outerRingData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke={entry.color === "none" ? "none" : P.bgCard} strokeWidth={entry.color === "none" ? 0 : 0.5} style={{ cursor: entry.color === "none" ? "default" : "pointer" }} opacity={entry.color === "none" ? 0 : 0.8} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Centre label */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", width: 160 }}>
                  {hoveredItem ? (
                    <>
                      <div style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, lineHeight: 1.1 }}>
                        {fmtM(hoveredItem.value)}
                      </div>
                      <div style={{ fontSize: "11px", color: P.textMuted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                        {pct(hoveredItem.value, pieTotalM)}%
                      </div>
                      <div style={{ fontSize: "11px", color: hoveredItem.color, marginTop: 2, fontFamily: "'DM Mono', monospace", fontWeight: 500, lineHeight: 1.3 }}>
                        {hoveredItem.name}
                      </div>
                      {hoveredItem.parent && (
                        <div style={{ fontSize: "9px", color: P.textLight, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                          {hoveredItem.parent}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "28px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, lineHeight: 1.1 }}>
                        {fmtM(pieTotalM)}
                      </div>
                      <div style={{ fontSize: "10px", color: P.textLight, marginTop: 4, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        FY {latestFy}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Legend grid */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 16px", marginTop: 8, padding: "0 20px" }}>
                {pieData.map((item, idx) => {
                  const deptMatch = sortedDepts.find(d => d.shortName === item.name && d.breakdown);
                  const hasDrill = !!(deptMatch || item.breakdown);
                  return (
                    <div
                      key={item.name}
                      onMouseEnter={() => { setActiveSlice(idx); setHoveredItem(item); }}
                      onMouseLeave={() => { setActiveSlice(null); setHoveredItem(null); }}
                      onClick={() => {
                        const target = deptMatch || (item.breakdown ? item : null);
                        if (!target) return;
                        setSelectedPieDept(target);
                        setActiveSlice(null);
                        setHoveredItem(null);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, cursor: hasDrill ? "pointer" : "default", padding: "2px 0" }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontSize: "10px", color: activeSlice === idx ? P.text : P.textMuted, fontFamily: "'DM Mono', monospace", transition: "color 0.15s" }}>
                        {item.name} ({fmtM(item.value)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── Drilled-down department pie ── */
            <DrillPie dept={selectedPieDept} isMobile={isMobile} onBack={() => { setSelectedPieDept(null); setActiveSlice(null); setHoveredItem(null); }} />
          )}

          <div style={{ marginTop: 10, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", textAlign: "center" }}>
            {selectedPieDept
              ? "SOURCE: Departmental Annual Report / Estimates 2024-25"
              : <>SOURCE: HM Treasury PESA 2025, Table 1.12 &middot; FY {latestFy}</>}
          </div>
        </div>
      </section>

      {/* Section 2: Department detail list + tax calculator sidebar */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Department Breakdown</h3>
        <p style={sectionNote}>
          All {sortedDepts.length} departmental groups. Click a department for time series and detail.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 20, alignItems: "start" }}>
          {/* Department bars */}
          <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "16px 14px 10px" }}>
            {sortedDepts.map((dept, idx) => {
              const isExpanded = expandedDept === idx;
              const maxVal = sortedDepts[0].latest;
              const barWidth = dept.latest > 0 ? (dept.latest / maxVal) * 100 : 0;
              const deptTotal = data.departments.deptTotal[latestFy] || 1;
              const share = dept.latest > 0 ? pct(dept.latest, deptTotal) : "0.0";

              return (
                <div key={dept.cleanName}>
                  <div
                    onClick={() => setExpandedDept(isExpanded ? null : idx)}
                    style={{
                      padding: "7px 8px",
                      marginBottom: 1,
                      background: isExpanded ? "rgba(28,43,69,0.04)" : "transparent",
                      borderRadius: 3,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "rgba(28,43,69,0.02)"; }}
                    onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: dept.color, display: "inline-block", flexShrink: 0 }} />
                        <span style={{
                          fontSize: "11px",
                          color: isExpanded ? P.text : P.textMuted,
                          fontWeight: isExpanded ? 500 : 400,
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          {dept.shortName}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "11px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace" }}>
                          {fmtM(dept.latest)}
                        </span>
                        <span style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", width: 36, textAlign: "right" }}>
                          {share}%
                        </span>
                        <span style={{ fontSize: "10px", color: P.textLight, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                          ▾
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: "rgba(28,43,69,0.06)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${barWidth}%`,
                        background: dept.color, borderRadius: 2,
                        transition: "width 0.4s ease",
                        opacity: isExpanded ? 1 : 0.55,
                      }} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      margin: "0 8px 8px",
                      padding: "12px 14px",
                      background: "rgba(28,43,69,0.02)",
                      borderRadius: 3,
                      borderLeft: `3px solid ${dept.color}`,
                    }}>
                      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: dept.color, fontWeight: 600, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
                        {dept.cleanName}
                      </div>
                      <div style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                        TME trend (£m)
                      </div>
                      <div style={{ height: 90, marginBottom: 10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={data.departments.fys.map((fy, i) => ({
                              fy: fy.slice(0, 4),
                              value: dept.values[fy],
                              type: data.departments.fyTypes[i],
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                            <XAxis dataKey="fy" tick={{ fontSize: 9, fill: P.textMuted }} />
                            <YAxis tick={{ fontSize: 9, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}bn`} width={42} />
                            <Tooltip content={<CustomTooltip formatter={(v) => `£${v != null ? v.toLocaleString() : "—"}m`} />} />
                            <Line type="monotone" dataKey="value" stroke={dept.color} strokeWidth={2} dot={{ r: 2.5, fill: dept.color }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
                        {data.departments.fys.map((fy, i) => {
                          const val = dept.values[fy];
                          const isLatest = fy === latestFy;
                          return (
                            <div key={fy} style={{
                              flex: "1 1 70px", padding: "5px 6px", textAlign: "center",
                              background: isLatest ? "rgba(28,43,69,0.04)" : "transparent", borderRadius: 2,
                            }}>
                              <div style={{ fontSize: "8px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>{fy}</div>
                              <div style={{ fontSize: "10px", fontWeight: isLatest ? 600 : 400, color: P.text, fontFamily: "'DM Mono', monospace" }}>{fmtM(val)}</div>
                              <div style={{ fontSize: "7px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>{data.departments.fyTypes[i]}</div>
                            </div>
                          );
                        })}
                      </div>
                      {dept.breakdown ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                            Sub-departmental breakdown (FY 2024-25, £m)
                          </div>
                          <SubDeptPie breakdown={dept.breakdown} color={dept.color} />
                          <div style={{ marginTop: 6, fontSize: "8px", color: P.textLight, fontStyle: "italic", fontFamily: "'DM Mono', monospace" }}>
                            Source: departmental Annual Report / Estimates 2024-25
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 8, fontSize: "9px", color: P.textLight, fontStyle: "italic", fontFamily: "'DM Mono', monospace" }}>
                          No sub-departmental breakdown available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 6, padding: "6px 8px", borderTop: `1px solid ${P.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: P.text, fontFamily: "'DM Mono', monospace" }}>Total departmental</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: P.text, fontFamily: "'DM Mono', monospace" }}>{fmtM(data.departments.deptTotal[latestFy])}</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, width: "100%" }}>
            {/* Tax calculator */}
            <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderLeft: `3px solid ${P.sienna}`, borderRadius: 3, padding: "14px 16px" }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.sienna, fontWeight: 500, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>
                Your tax contribution
              </div>
              <div style={{ fontSize: "11px", color: P.textMuted, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Annual salary</div>
              <input
                type="range" min={15000} max={150000} step={1000} value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                style={{ width: "100%", accentColor: P.sienna, marginBottom: 4 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: "17px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text }}>
                  £{salary.toLocaleString()}
                </span>
                <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", alignSelf: "flex-end" }}>
                  ≈ £{Math.round(taxPaid).toLocaleString()} tax/yr
                </span>
              </div>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: P.textLight, fontWeight: 500, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>
                Your money goes to
              </div>
              {pieData.filter((d) => d.value > 0).slice(0, 10).map((item) => {
                const share = (item.value / pieTotalM) * taxPaid;
                return (
                  <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: item.color, display: "inline-block" }} />
                      <span style={{ fontSize: "9px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: "9px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace" }}>
                      £{Math.round(share).toLocaleString()}
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 6, fontSize: "8px", color: P.textLight, fontStyle: "italic", fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
                Approximation based on income tax + NI. Excludes VAT, council tax, and other indirect taxes.
              </div>
            </div>

            {/* Non-departmental detail */}
            <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "14px 16px" }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.textLight, fontWeight: 500, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
                Non-departmental items
              </div>
              {data.departments.otherItems.filter((item) => {
                const val = item.values[latestFy];
                return val != null && Math.abs(val) >= 500;
              }).map((item) => {
                const val = item.values[latestFy];
                return (
                  <div key={item.name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${P.border}` }}>
                    <span style={{ fontSize: "9px", color: P.textMuted, fontFamily: "'DM Mono', monospace", ...(!isMobile && { maxWidth: 170 }) }}>
                      {cleanName(item.name)}
                    </span>
                    <span style={{ fontSize: "9px", fontWeight: 500, color: val < 0 ? P.red : P.text, fontFamily: "'DM Mono', monospace" }}>
                      {fmtM(val)}
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 5, fontSize: "8px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
                Accounting adjustments eliminate double-counting
                between departmental budgets and TME.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Fiscal trend */}
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
            <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => trendView === "bn" ? `£${v}bn` : `${v}%`} />
            <Tooltip content={<CustomTooltip formatter={(v) => trendView === "bn" ? `£${v?.toFixed(1)}bn` : `${v?.toFixed(1)}%`} />} />
            <Area type="monotone" dataKey="tme" stroke={P.red} fill={P.red} fillOpacity={0.08} strokeWidth={2} name="Total spending" dot={false} />
            <Area type="monotone" dataKey="receipts" stroke={P.teal} fill={P.teal} fillOpacity={0.08} strokeWidth={2} name="Receipts" dot={false} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Section 4: Debt */}
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

      {/* Section 5: Receipts breakdown */}
      {data.receiptTypes?.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={sectionHeading}>Tax Receipts Breakdown</h3>
          <p style={sectionNote}>
            Where the money comes from. Major tax receipts, FY {latestOutturn.fy}.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(300, data.receiptTypes.length * (isMobile ? 30 : 26))}>
            <BarChart data={data.receiptTypes} layout="vertical" margin={{ left: isMobile ? 10 : 140, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `£${v}bn`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 9 : 11, fill: P.textMuted }} width={isMobile ? 90 : 135} />
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
        Work and Pensions ({fmtM(sortedDepts.find(d => d.cleanName === "Work and Pensions")?.latest)})
        and Health and Social Care ({fmtM(sortedDepts.find(d => d.cleanName === "Health and Social Care")?.latest)})
        are the two largest departmental groups, together accounting for{" "}
        {pct(
          (sortedDepts.find(d => d.cleanName === "Work and Pensions")?.latest || 0) +
          (sortedDepts.find(d => d.cleanName === "Health and Social Care")?.latest || 0),
          data.departments.deptTotal[latestFy] || 1
        )}% of departmental spending. Debt interest was £{latestOutturn.debtInterest}bn.
        Net debt stands at {latestPct.debt}% of GDP.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://obr.uk/data/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          OBR Public Finances Databank (Feb 2026)
        </a>
        {" · "}
        <a href="https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2025" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          HM Treasury PESA 2025 — Chapter 1 (departmental TME, FY {latestFy})
        </a>
      </div>
    </div>
  );
}
