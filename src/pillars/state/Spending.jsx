import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import SPENDING_DATA from "../../data/spending";
import MetricCard from "../../components/MetricCard";
import AnalysisBox from "../../components/AnalysisBox";

const fmt = (n) => (n >= 1000 ? `£${(n / 1000).toFixed(1)}tn` : `£${n}bn`);
const pct = (v, total) => ((v / total) * 100).toFixed(1);

export default function SpendingTab() {
  const [drillLevel, setDrillLevel] = useState(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const [salary, setSalary] = useState(35000);
  const [hoveredItem, setHoveredItem] = useState(null);

  const currentData =
    drillLevel !== null ? SPENDING_DATA.children[drillLevel] : SPENDING_DATA;
  const items =
    drillLevel !== null ? currentData.children : SPENDING_DATA.children;
  const totalValue =
    drillLevel !== null ? currentData.value : SPENDING_DATA.value;

  const taxPaid =
    salary <= 12570
      ? 0
      : salary <= 50270
        ? (salary - 12570) * 0.2 + salary * 0.12
        : (50270 - 12570) * 0.2 + (salary - 50270) * 0.4 + salary * 0.12;

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
      props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
  };

  const resetDrill = () => {
    setDrillLevel(null);
    setActiveSlice(null);
    setHoveredItem(null);
  };

  const drillInto = (idx) => {
    if (drillLevel === null && SPENDING_DATA.children[idx].children) {
      setDrillLevel(idx);
      setActiveSlice(null);
      setHoveredItem(null);
    }
  };

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 600,
            color: P.text,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Public Spending
        </h2>
        <span
          style={{
            fontSize: "12px",
            color: P.textLight,
            fontStyle: "italic",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Where does the money go? FY 2025–26
        </span>
      </div>

      {/* Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <MetricCard label="Total Spending" value="£1,324bn" change="£19,400 per person" up={true} color={P.sienna} delay={0.1} />
        <MetricCard label="Spending / GDP" value="47.8%" change="+4pp since 2019" up={true} color={P.navy} delay={0.18} />
        <MetricCard label="Budget Deficit" value="£36bn" change="-52% vs 2024" up={false} color={P.teal} delay={0.26} />
        <MetricCard label="Debt Interest" value="£104bn" change="8% of all spending" up={true} color={P.yellow} delay={0.34} />
      </div>

      {/* Drill back button */}
      {drillLevel !== null && (
        <div style={{ marginBottom: 16, animation: "fadeSlideIn 0.3s ease both" }}>
          <button
            onClick={resetDrill}
            style={{
              background: "none",
              border: `1px solid ${P.borderStrong}`,
              color: P.textMuted,
              padding: "6px 14px",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 3,
              transition: "all 0.2s",
            }}
          >
            &larr; Back to all spending
          </button>
          <span
            style={{
              marginLeft: 12,
              fontSize: "13px",
              color: currentData.color,
              fontWeight: 600,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {currentData.name} &mdash; {fmt(currentData.value)}
          </span>
        </div>
      )}

      {/* Pie + Sidebar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 20,
          marginBottom: 28,
          alignItems: "start",
        }}
      >
        {/* Pie chart */}
        <div
          style={{
            background: P.bgCard,
            border: `1px solid ${P.border}`,
            borderRadius: 3,
            padding: "24px 12px 16px",
            position: "relative",
            boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: P.textLight,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {drillLevel !== null
                ? `${currentData.name} breakdown`
                : "Click a segment to drill down"}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={items}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={155}
                  paddingAngle={1.5}
                  activeIndex={activeSlice}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, idx) => {
                    setActiveSlice(idx);
                    setHoveredItem(items[idx]);
                  }}
                  onMouseLeave={() => {
                    setActiveSlice(null);
                    setHoveredItem(null);
                  }}
                  onClick={(_, idx) => drillInto(idx)}
                  style={{
                    cursor: drillLevel === null ? "pointer" : "default",
                    outline: "none",
                  }}
                >
                  {items.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.color}
                      stroke={P.bgCard}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
                width: 140,
              }}
            >
              {hoveredItem ? (
                <>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 600,
                      fontFamily: "'Playfair Display', serif",
                      color: P.text,
                      lineHeight: 1.1,
                    }}
                  >
                    {fmt(hoveredItem.value)}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: P.textMuted,
                      marginTop: 4,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {pct(hoveredItem.value, totalValue)}%
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: hoveredItem.color,
                      marginTop: 2,
                      fontFamily: "'DM Mono', monospace",
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {hoveredItem.name}
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: 600,
                      fontFamily: "'Playfair Display', serif",
                      color: P.text,
                      lineHeight: 1.1,
                    }}
                  >
                    {fmt(totalValue)}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: P.textLight,
                      marginTop: 4,
                      fontFamily: "'DM Mono', monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {drillLevel !== null ? currentData.name : "Total"}
                  </div>
                </>
              )}
            </div>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: "9px",
              color: P.textLight,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.06em",
              textAlign: "center",
            }}
          >
            SOURCE: HM Treasury PESA 2025, OBR &middot; FY 2025&ndash;26
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Breakdown list */}
          <div
            style={{
              background: P.bgCard,
              border: `1px solid ${P.border}`,
              borderRadius: 3,
              padding: "16px 18px",
              boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: P.textLight,
                fontWeight: 500,
                marginBottom: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {drillLevel !== null
                ? `${currentData.name} breakdown`
                : "Spending by function"}
            </div>
            {items.map((item, idx) => {
              const isHovered = activeSlice === idx;
              const maxVal = Math.max(...items.map((i) => i.value));
              const barWidth = (item.value / maxVal) * 100;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => {
                    setActiveSlice(idx);
                    setHoveredItem(item);
                  }}
                  onMouseLeave={() => {
                    setActiveSlice(null);
                    setHoveredItem(null);
                  }}
                  onClick={() => drillInto(idx)}
                  style={{
                    padding: "7px 8px",
                    marginBottom: 1,
                    cursor: drillLevel === null ? "pointer" : "default",
                    background: isHovered
                      ? "rgba(28,43,69,0.04)"
                      : "transparent",
                    borderRadius: 3,
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          background: item.color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          color: isHovered ? P.text : P.textMuted,
                          fontWeight: isHovered ? 500 : 400,
                          transition: "all 0.15s",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: P.text,
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        £{item.value}bn
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          color: P.textLight,
                          fontFamily: "'DM Mono', monospace",
                          width: 36,
                          textAlign: "right",
                        }}
                      >
                        {pct(item.value, totalValue)}%
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: "rgba(28,43,69,0.06)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barWidth}%`,
                        background: item.color,
                        borderRadius: 2,
                        transition: "width 0.4s ease",
                        opacity: isHovered ? 1 : 0.55,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tax calculator */}
          <div
            style={{
              background: P.bgCard,
              border: `1px solid ${P.border}`,
              borderLeft: `3px solid ${P.sienna}`,
              borderRadius: 3,
              padding: "16px 18px",
              boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: P.sienna,
                fontWeight: 500,
                marginBottom: 10,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Your tax contribution
            </div>
            <div
              style={{
                fontSize: "11px",
                color: P.textMuted,
                marginBottom: 8,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Annual salary
            </div>
            <input
              type="range"
              min={15000}
              max={150000}
              step={1000}
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              style={{ width: "100%", accentColor: P.sienna, marginBottom: 4 }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  fontFamily: "'Playfair Display', serif",
                  color: P.text,
                }}
              >
                £{salary.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: P.textLight,
                  fontFamily: "'DM Mono', monospace",
                  alignSelf: "flex-end",
                }}
              >
                ≈ £{Math.round(taxPaid).toLocaleString()} tax/yr
              </span>
            </div>
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: P.textLight,
                fontWeight: 500,
                marginBottom: 8,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Your money goes to
            </div>
            {SPENDING_DATA.children.slice(0, 7).map((cat) => {
              const share = (cat.value / SPENDING_DATA.value) * taxPaid;
              return (
                <div
                  key={cat.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "3px 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 1,
                        background: cat.color,
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: P.textMuted,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {cat.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      color: P.text,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    £{Math.round(share).toLocaleString()}
                  </span>
                </div>
              );
            })}
            <div
              style={{
                marginTop: 8,
                fontSize: "9px",
                color: P.textLight,
                fontStyle: "italic",
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1.5,
              }}
            >
              Approximation based on income tax + NI. Excludes VAT, council tax,
              and other indirect taxes.
            </div>
          </div>
        </div>
      </div>

      <AnalysisBox color={P.sienna}>
        Social protection and health together consume 43% of all public spending
        &mdash; over &pound;570 billion. Debt interest alone, at &pound;104
        billion, now exceeds the entire defence budget. As the population ages,
        the share devoted to pensions and healthcare will only grow, squeezing
        every other area of government activity. This is the central fiscal
        challenge of British politics: an expanding welfare state meeting a tax
        base unwilling to fund it.
      </AnalysisBox>
    </div>
  );
}
