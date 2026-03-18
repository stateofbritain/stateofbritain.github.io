import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from "recharts";

// ─── PALETTE ─────────────────────────────────────────────────────────────
const P = {
  teal: "#1E6B5E",
  navy: "#1C2B45",
  sienna: "#C94B1A",
  parchment: "#EDE3C8",
  red: "#A83428",
  grey: "#8B9BB0",
  yellow: "#E8B830",
  bg: "#F5F0E8",
  bgCard: "#FFFDF8",
  text: "#1C2B45",
  textMuted: "#6B6458",
  textLight: "#9B9285",
  border: "rgba(28,43,69,0.1)",
  borderStrong: "rgba(28,43,69,0.18)",
};

// ─── SPENDING DATA ───────────────────────────────────────────────────────
const SPENDING_DATA = {
  name: "Total Public Spending", value: 1324,
  children: [
    { name: "Social Protection", value: 341, color: P.red, children: [
      { name: "State Pension", value: 124, color: "#A83428" }, { name: "Universal Credit", value: 83, color: "#C04A3E" },
      { name: "Disability Benefits", value: 35, color: "#D46858" }, { name: "Housing Benefit", value: 22, color: "#E08878" },
      { name: "Child Benefit", value: 12, color: "#ECA898" }, { name: "Other Social Protection", value: 65, color: "#F0C0B2" },
    ]},
    { name: "Health", value: 232, color: P.teal, children: [
      { name: "Hospital Services", value: 98, color: "#1E6B5E" }, { name: "Primary Care (GPs)", value: 42, color: "#2E8B7A" },
      { name: "Mental Health", value: 23, color: "#45A896" }, { name: "Prescriptions & Pharma", value: 22, color: "#6BC0B0" },
      { name: "Public Health", value: 12, color: "#92D4C8" }, { name: "Other Health", value: 35, color: "#B8E6DE" },
    ]},
    { name: "Education", value: 119, color: P.navy, children: [
      { name: "Schools", value: 58, color: "#1C2B45" }, { name: "Higher Education", value: 18, color: "#2E4468" },
      { name: "Early Years", value: 10, color: "#45608A" }, { name: "Further Education", value: 14, color: "#607DAA" },
      { name: "Other Education", value: 19, color: "#8B9BB0" },
    ]},
    { name: "Debt Interest", value: 104, color: P.sienna, children: [
      { name: "Gilt Interest", value: 72, color: "#C94B1A" }, { name: "Index-linked Gilts", value: 24, color: "#D97040" },
      { name: "Other Debt Costs", value: 8, color: "#E89568" },
    ]},
    { name: "Defence", value: 74, color: P.grey, children: [
      { name: "Military Personnel", value: 16, color: "#6B7B90" }, { name: "Equipment & Support", value: 22, color: "#7D8DA2" },
      { name: "Operations", value: 8, color: "#8B9BB0" }, { name: "Infrastructure", value: 12, color: "#A0AEBF" },
      { name: "Foreign Aid & Diplomacy", value: 16, color: "#B5C1CE" },
    ]},
    { name: "Transport", value: 52, color: P.yellow, children: [
      { name: "Roads", value: 18, color: "#D4A620" }, { name: "Railways", value: 22, color: "#E8B830" },
      { name: "Local Transport", value: 8, color: "#F0CC60" }, { name: "Other Transport", value: 4, color: "#F5DD90" },
    ]},
    { name: "Public Order & Safety", value: 48, color: "#6B5B4E", children: [
      { name: "Police", value: 22, color: "#6B5B4E" }, { name: "Courts & Prisons", value: 14, color: "#8A7868" },
      { name: "Fire Services", value: 5, color: "#A89888" }, { name: "Other", value: 7, color: "#C4B8A8" },
    ]},
    { name: "Housing & Environment", value: 38, color: "#4A7A58", children: [
      { name: "Housing", value: 16, color: "#4A7A58" }, { name: "Environment Protection", value: 12, color: "#6A9A78" },
      { name: "Planning & Development", value: 10, color: "#8ABA98" },
    ]},
    { name: "Other Spending", value: 316, color: "#B0A898", children: [
      { name: "Science & Technology", value: 22, color: "#908878" }, { name: "Industry & Agriculture", value: 28, color: "#A09888" },
      { name: "Culture & Recreation", value: 14, color: "#B0A898" }, { name: "General Admin", value: 18, color: "#C0B8A8" },
      { name: "Devolved Govts (net)", value: 78, color: "#CCC4B4" }, { name: "Other & Accounting", value: 156, color: "#D8D0C4" },
    ]},
  ]
};

// ─── TOPIC DATA ──────────────────────────────────────────────────────────
const DATA = {
  economy: {
    title: "Economy", subtitle: "GDP, inflation, wages & public debt", icon: "£", color: P.sienna,
    metrics: [
      { label: "GDP (£tn)", value: "2.27", change: "+0.6%", up: true },
      { label: "Inflation (CPI)", value: "3.2%", change: "-0.4pp", up: false },
      { label: "Real Wages", value: "+1.8%", change: "+0.9pp", up: true },
      { label: "Public Debt / GDP", value: "97.6%", change: "+1.2pp", up: true },
    ],
    chart: [
      { year: "2010", gdp: 1.66, inflation: 3.3 }, { year: "2011", gdp: 1.68, inflation: 4.5 },
      { year: "2012", gdp: 1.71, inflation: 2.8 }, { year: "2013", gdp: 1.76, inflation: 2.6 },
      { year: "2014", gdp: 1.82, inflation: 1.5 }, { year: "2015", gdp: 1.87, inflation: 0.0 },
      { year: "2016", gdp: 1.91, inflation: 0.7 }, { year: "2017", gdp: 1.95, inflation: 2.7 },
      { year: "2018", gdp: 1.98, inflation: 2.5 }, { year: "2019", gdp: 2.02, inflation: 1.8 },
      { year: "2020", gdp: 1.81, inflation: 0.9 }, { year: "2021", gdp: 1.94, inflation: 2.6 },
      { year: "2022", gdp: 2.03, inflation: 9.1 }, { year: "2023", gdp: 2.09, inflation: 7.3 },
      { year: "2024", gdp: 2.22, inflation: 3.6 }, { year: "2025", gdp: 2.27, inflation: 3.2 },
    ],
    lines: [{ key: "gdp", name: "GDP (£tn)", color: P.sienna }, { key: "inflation", name: "Inflation %", color: P.navy }],
    insight: "Britain's economy has grown just 37% in real terms since 2010 — roughly half the rate of the preceding 15 years. Public debt has risen from 74% to nearly 98% of GDP, a structural shift that constrains fiscal space regardless of which party governs."
  },
  health: {
    title: "Health", subtitle: "NHS performance, spending & outcomes", icon: "+", color: P.teal,
    metrics: [
      { label: "NHS Wait List", value: "7.4m", change: "+4.1m since 2019", up: true },
      { label: "A&E 4hr Target", value: "71.2%", change: "Target: 95%", up: false },
      { label: "Health Spend / GDP", value: "11.3%", change: "+1.8pp since 2019", up: true },
      { label: "Life Expectancy", value: "80.9", change: "-0.4yr since 2019", up: false },
    ],
    chart: [
      { year: "2010", waitList: 2.5, ae: 95.7 }, { year: "2011", waitList: 2.6, ae: 95.1 },
      { year: "2012", waitList: 2.7, ae: 94.2 }, { year: "2013", waitList: 2.9, ae: 93.5 },
      { year: "2014", waitList: 3.1, ae: 91.8 }, { year: "2015", waitList: 3.3, ae: 90.4 },
      { year: "2016", waitList: 3.5, ae: 88.5 }, { year: "2017", waitList: 3.8, ae: 86.3 },
      { year: "2018", waitList: 4.1, ae: 85.1 }, { year: "2019", waitList: 4.4, ae: 83.6 },
      { year: "2020", waitList: 4.2, ae: 86.8 }, { year: "2021", waitList: 5.8, ae: 78.2 },
      { year: "2022", waitList: 7.0, ae: 72.1 }, { year: "2023", waitList: 7.6, ae: 71.4 },
      { year: "2024", waitList: 7.5, ae: 70.8 }, { year: "2025", waitList: 7.4, ae: 71.2 },
    ],
    lines: [{ key: "waitList", name: "Wait List (m)", color: P.teal }, { key: "ae", name: "A&E 4hr %", color: P.red }],
    insight: "The NHS waiting list has tripled since 2010, from 2.5 million to 7.4 million. A&E performance against the 4-hour target has fallen from 96% to 71%. Life expectancy has stalled — an almost unprecedented peacetime phenomenon in a developed nation."
  },
  crime: {
    title: "Crime & Justice", subtitle: "Crime rates, prison population & policing", icon: "⚖", color: P.navy,
    metrics: [
      { label: "Recorded Crime", value: "6.7m", change: "-3% yr/yr", up: false },
      { label: "Prison Population", value: "87,400", change: "+5% since 2019", up: true },
      { label: "Police Officers", value: "149,572", change: "+20k since 2019", up: true },
      { label: "Charge Rate", value: "5.7%", change: "-9pp since 2015", up: false },
    ],
    chart: [
      { year: "2010", crime: 4.3, chargeRate: 15.2 }, { year: "2011", crime: 4.2, chargeRate: 14.8 },
      { year: "2012", crime: 3.9, chargeRate: 14.1 }, { year: "2013", crime: 3.7, chargeRate: 13.0 },
      { year: "2014", crime: 3.8, chargeRate: 12.2 }, { year: "2015", crime: 4.5, chargeRate: 14.7 },
      { year: "2016", crime: 4.9, chargeRate: 12.1 }, { year: "2017", crime: 5.4, chargeRate: 9.8 },
      { year: "2018", crime: 5.9, chargeRate: 8.2 }, { year: "2019", crime: 6.3, chargeRate: 7.3 },
      { year: "2020", crime: 5.6, chargeRate: 6.5 }, { year: "2021", crime: 5.4, chargeRate: 5.9 },
      { year: "2022", crime: 6.6, chargeRate: 5.6 }, { year: "2023", crime: 6.9, chargeRate: 5.5 },
      { year: "2024", crime: 6.8, chargeRate: 5.6 }, { year: "2025", crime: 6.7, chargeRate: 5.7 },
    ],
    lines: [{ key: "crime", name: "Recorded Crime (m)", color: P.navy }, { key: "chargeRate", name: "Charge Rate %", color: P.red }],
    insight: "Recorded crime has risen 56% since 2013, yet the charge rate has collapsed from 15% to under 6%. Britain added 20,000 police officers after 2019, but the criminal justice system's capacity to process cases has not kept pace."
  },
  housing: {
    title: "Housing", subtitle: "Prices, building rates & affordability", icon: "⌂", color: P.yellow,
    metrics: [
      { label: "Avg. House Price", value: "£288k", change: "+58% since 2014", up: true },
      { label: "Price / Earnings", value: "8.3x", change: "+1.5x since 2010", up: true },
      { label: "New Builds (yr)", value: "212k", change: "Target: 300k", up: false },
      { label: "Homeownership", value: "63.2%", change: "-6pp since 2003", up: false },
    ],
    chart: [
      { year: "2010", price: 168, builds: 128 }, { year: "2011", price: 164, builds: 137 },
      { year: "2012", price: 165, builds: 141 }, { year: "2013", price: 170, builds: 136 },
      { year: "2014", price: 183, builds: 153 }, { year: "2015", price: 196, builds: 171 },
      { year: "2016", price: 213, builds: 178 }, { year: "2017", price: 226, builds: 183 },
      { year: "2018", price: 231, builds: 195 }, { year: "2019", price: 233, builds: 178 },
      { year: "2020", price: 245, builds: 148 }, { year: "2021", price: 268, builds: 194 },
      { year: "2022", price: 290, builds: 210 }, { year: "2023", price: 285, builds: 215 },
      { year: "2024", price: 284, builds: 218 }, { year: "2025", price: 288, builds: 212 },
    ],
    lines: [{ key: "price", name: "Avg Price (£k)", color: P.yellow }, { key: "builds", name: "New Builds (k)", color: P.navy }],
    insight: "House prices have risen 71% since 2010, far outpacing wages. The price-to-earnings ratio has climbed from 6.8x to 8.3x. No government has hit the 300,000 homes-per-year target. Homeownership among under-35s has halved since the late 1990s."
  },
  education: {
    title: "Education", subtitle: "Attainment, spending & university access", icon: "▲", color: P.teal,
    metrics: [
      { label: "Spend / Pupil", value: "£7,500", change: "-9% real since 2010", up: false },
      { label: "Uni Participation", value: "37.5%", change: "+11pp since 2010", up: true },
      { label: "GCSE 5+ passes", value: "67.2%", change: "+4pp since 2015", up: true },
      { label: "Graduate Debt", value: "£44,900", change: "+£22k since 2012", up: true },
    ],
    chart: [
      { year: "2010", spend: 8200, uni: 26.5 }, { year: "2011", spend: 8000, uni: 27.0 },
      { year: "2012", spend: 7900, uni: 27.2 }, { year: "2013", spend: 7700, uni: 28.1 },
      { year: "2014", spend: 7600, uni: 29.4 }, { year: "2015", spend: 7500, uni: 30.2 },
      { year: "2016", spend: 7400, uni: 31.5 }, { year: "2017", spend: 7300, uni: 32.6 },
      { year: "2018", spend: 7200, uni: 33.0 }, { year: "2019", spend: 7200, uni: 34.5 },
      { year: "2020", spend: 7400, uni: 36.3 }, { year: "2021", spend: 7500, uni: 37.9 },
      { year: "2022", spend: 7400, uni: 37.5 }, { year: "2023", spend: 7400, uni: 37.3 },
      { year: "2024", spend: 7500, uni: 37.4 }, { year: "2025", spend: 7500, uni: 37.5 },
    ],
    lines: [{ key: "spend", name: "Spend/Pupil (£)", color: P.teal }, { key: "uni", name: "Uni Participation %", color: P.sienna }],
    insight: "Per-pupil funding fell 9% in real terms over the 2010s — the longest squeeze since the 1970s. University participation has risen to 37.5%, but average graduate debt has nearly doubled to £44,900."
  },
  immigration: {
    title: "Immigration", subtitle: "Net migration, asylum & visa routes", icon: "→", color: P.sienna,
    metrics: [
      { label: "Net Migration", value: "685k", change: "+430k vs 2019", up: true },
      { label: "Asylum Backlog", value: "118k", change: "+86k since 2019", up: true },
      { label: "Study Visas", value: "442k", change: "+200% since 2019", up: true },
      { label: "Work Visas", value: "337k", change: "+180% since 2019", up: true },
    ],
    chart: [
      { year: "2010", net: 256, study: 228 }, { year: "2011", net: 263, study: 234 },
      { year: "2012", net: 177, study: 196 }, { year: "2013", net: 209, study: 192 },
      { year: "2014", net: 313, study: 195 }, { year: "2015", net: 332, study: 202 },
      { year: "2016", net: 326, study: 209 }, { year: "2017", net: 282, study: 221 },
      { year: "2018", net: 271, study: 244 }, { year: "2019", net: 245, study: 268 },
      { year: "2020", net: 34, study: 152 }, { year: "2021", net: 239, study: 348 },
      { year: "2022", net: 745, study: 498 }, { year: "2023", net: 728, study: 472 },
      { year: "2024", net: 700, study: 455 }, { year: "2025", net: 685, study: 442 },
    ],
    lines: [{ key: "net", name: "Net Migration (k)", color: P.sienna }, { key: "study", name: "Study Visas (k)", color: P.grey }],
    insight: "Net migration surged from 245,000 in 2019 to over 700,000 by 2022 — driven overwhelmingly by legal routes, particularly study and health-worker visas. The asylum backlog has grown nearly fivefold, yet asylum seekers account for less than 10% of total immigration."
  },
  environment: {
    title: "Environment", subtitle: "Emissions, energy mix & air quality", icon: "◉", color: P.teal,
    metrics: [
      { label: "CO₂ Emissions", value: "317 MtCO₂", change: "-44% since 1990", up: false },
      { label: "Renewables Share", value: "47.2%", change: "+42pp since 2010", up: true },
      { label: "Coal Generation", value: "0%", change: "-28pp since 2012", up: false },
      { label: "EV Share (new)", value: "24.5%", change: "+23pp since 2019", up: true },
    ],
    chart: [
      { year: "2010", renewables: 6.8, co2: 496 }, { year: "2011", renewables: 9.4, co2: 462 },
      { year: "2012", renewables: 11.3, co2: 476 }, { year: "2013", renewables: 14.9, co2: 459 },
      { year: "2014", renewables: 19.1, co2: 420 }, { year: "2015", renewables: 24.6, co2: 398 },
      { year: "2016", renewables: 24.5, co2: 382 }, { year: "2017", renewables: 29.3, co2: 373 },
      { year: "2018", renewables: 33.0, co2: 364 }, { year: "2019", renewables: 36.9, co2: 354 },
      { year: "2020", renewables: 43.1, co2: 320 }, { year: "2021", renewables: 39.6, co2: 341 },
      { year: "2022", renewables: 41.5, co2: 332 }, { year: "2023", renewables: 44.8, co2: 325 },
      { year: "2024", renewables: 46.5, co2: 320 }, { year: "2025", renewables: 47.2, co2: 317 },
    ],
    lines: [{ key: "renewables", name: "Renewables %", color: P.teal }, { key: "co2", name: "CO₂ (Mt)", color: P.grey }],
    insight: "Britain's decarbonisation of electricity is a genuine success story: coal went from 40% of generation to zero in a decade. Total emissions have fallen 44% since 1990. But progress on heating and transport has been far slower."
  },
  demographics: {
    title: "Demographics", subtitle: "Population, ageing & birth rates", icon: "◑", color: P.red,
    metrics: [
      { label: "Population", value: "68.3m", change: "+5.6m since 2010", up: true },
      { label: "Fertility Rate", value: "1.44", change: "-0.48 since 2010", up: false },
      { label: "Over-65 Share", value: "19.2%", change: "+2.4pp since 2010", up: true },
      { label: "Median Age", value: "40.7", change: "+1.8yr since 2010", up: true },
    ],
    chart: [
      { year: "2010", pop: 62.8, fertility: 1.92 }, { year: "2011", pop: 63.3, fertility: 1.91 },
      { year: "2012", pop: 63.7, fertility: 1.92 }, { year: "2013", pop: 64.1, fertility: 1.83 },
      { year: "2014", pop: 64.6, fertility: 1.81 }, { year: "2015", pop: 65.1, fertility: 1.80 },
      { year: "2016", pop: 65.6, fertility: 1.79 }, { year: "2017", pop: 66.0, fertility: 1.74 },
      { year: "2018", pop: 66.4, fertility: 1.68 }, { year: "2019", pop: 66.8, fertility: 1.63 },
      { year: "2020", pop: 67.1, fertility: 1.56 }, { year: "2021", pop: 67.0, fertility: 1.52 },
      { year: "2022", pop: 67.6, fertility: 1.49 }, { year: "2023", pop: 67.9, fertility: 1.47 },
      { year: "2024", pop: 68.1, fertility: 1.45 }, { year: "2025", pop: 68.3, fertility: 1.44 },
    ],
    lines: [{ key: "pop", name: "Population (m)", color: P.red }, { key: "fertility", name: "Fertility Rate", color: P.navy }],
    insight: "Britain's population has grown 8.8% since 2010, but almost entirely through immigration — natural growth has turned negative as the fertility rate fell to 1.44, well below replacement. One in five Britons is now over 65."
  },
};

const TOPICS = Object.keys(DATA);
const fmt = (n) => n >= 1000 ? `£${(n / 1000).toFixed(1)}tn` : `£${n}bn`;
const pct = (v, total) => ((v / total) * 100).toFixed(1);

// ─── TOOLTIP ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: P.navy, border: `1px solid rgba(255,255,255,0.1)`, padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#e0ddd6", borderRadius: 3, boxShadow: "0 4px 16px rgba(28,43,69,0.25)" }}>
      <div style={{ fontWeight: 500, marginBottom: 4, color: P.parchment, letterSpacing: "0.04em" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ opacity: 0.65 }}>{p.name}:</span>
          <span style={{ fontWeight: 500, color: "#fff" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── METRIC CARD ─────────────────────────────────────────────────────────
const MetricCard = ({ label, value, change, up, color, delay }) => (
  <div style={{
    padding: "18px 20px", background: P.bgCard, border: `1px solid ${P.border}`,
    borderLeft: `3px solid ${color}`, borderRadius: 3,
    animation: `fadeSlideIn 0.5s ease ${delay}s both`,
    boxShadow: "0 1px 4px rgba(28,43,69,0.04)",
  }}>
    <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: P.textLight, fontFamily: "'DM Mono', monospace", fontWeight: 400 }}>{label}</div>
    <div style={{ fontSize: "28px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, margin: "5px 0 3px", lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: up ? P.red : P.teal, fontWeight: 500, letterSpacing: "0.02em" }}>{change}</div>
  </div>
);

// ─── SPENDING TAB ────────────────────────────────────────────────────────
const SpendingTab = () => {
  const [drillLevel, setDrillLevel] = useState(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const [salary, setSalary] = useState(35000);
  const [hoveredItem, setHoveredItem] = useState(null);

  const currentData = drillLevel !== null ? SPENDING_DATA.children[drillLevel] : SPENDING_DATA;
  const items = drillLevel !== null ? currentData.children : SPENDING_DATA.children;
  const totalValue = drillLevel !== null ? currentData.value : SPENDING_DATA.value;

  const taxPaid = salary <= 12570 ? 0 :
    salary <= 50270 ? (salary - 12570) * 0.20 + salary * 0.12 :
    (50270 - 12570) * 0.20 + (salary - 50270) * 0.40 + salary * 0.12;

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
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0, letterSpacing: "-0.01em" }}>Public Spending</h2>
        <span style={{ fontSize: "12px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>Where does the money go? FY 2025–26</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard label="Total Spending" value="£1,324bn" change="£19,400 per person" up={true} color={P.sienna} delay={0.1} />
        <MetricCard label="Spending / GDP" value="47.8%" change="+4pp since 2019" up={true} color={P.navy} delay={0.18} />
        <MetricCard label="Budget Deficit" value="£36bn" change="-52% vs 2024" up={false} color={P.teal} delay={0.26} />
        <MetricCard label="Debt Interest" value="£104bn" change="8% of all spending" up={true} color={P.yellow} delay={0.34} />
      </div>

      {drillLevel !== null && (
        <div style={{ marginBottom: 16, animation: "fadeSlideIn 0.3s ease both" }}>
          <button onClick={() => { setDrillLevel(null); setActiveSlice(null); setHoveredItem(null); }}
            style={{ background: "none", border: `1px solid ${P.borderStrong}`, color: P.textMuted, padding: "6px 14px", fontSize: "10px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 3, transition: "all 0.2s" }}>
            ← Back to all spending
          </button>
          <span style={{ marginLeft: 12, fontSize: "13px", color: currentData.color, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
            {currentData.name} — {fmt(currentData.value)}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 28, alignItems: "start" }}>
        {/* PIE */}
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 12px 16px", position: "relative", boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
              {drillLevel !== null ? `${currentData.name} breakdown` : "Click a segment to drill down"}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={85} outerRadius={155} paddingAngle={1.5}
                  activeIndex={activeSlice} activeShape={renderActiveShape}
                  onMouseEnter={(_, idx) => { setActiveSlice(idx); setHoveredItem(items[idx]); }}
                  onMouseLeave={() => { setActiveSlice(null); setHoveredItem(null); }}
                  onClick={(_, idx) => { if (drillLevel === null && SPENDING_DATA.children[idx].children) { setDrillLevel(idx); setActiveSlice(null); setHoveredItem(null); } }}
                  style={{ cursor: drillLevel === null ? "pointer" : "default", outline: "none" }}>
                  {items.map((entry, idx) => <Cell key={idx} fill={entry.color} stroke={P.bgCard} strokeWidth={2} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", width: 140 }}>
              {hoveredItem ? (
                <>
                  <div style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, lineHeight: 1.1 }}>{fmt(hoveredItem.value)}</div>
                  <div style={{ fontSize: "11px", color: P.textMuted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{pct(hoveredItem.value, totalValue)}%</div>
                  <div style={{ fontSize: "11px", color: hoveredItem.color, marginTop: 2, fontFamily: "'DM Mono', monospace", fontWeight: 500, lineHeight: 1.3 }}>{hoveredItem.name}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "26px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text, lineHeight: 1.1 }}>{fmt(totalValue)}</div>
                  <div style={{ fontSize: "10px", color: P.textLight, marginTop: 4, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{drillLevel !== null ? currentData.name : "Total"}</div>
                </>
              )}
            </div>
          </div>
          <div style={{ marginTop: 4, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", textAlign: "center" }}>
            SOURCE: HM Treasury PESA 2025, OBR · FY 2025–26
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "16px 18px", boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.textLight, fontWeight: 500, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
              {drillLevel !== null ? `${currentData.name} breakdown` : "Spending by function"}
            </div>
            {items.map((item, idx) => {
              const isHovered = activeSlice === idx;
              const maxVal = Math.max(...items.map(i => i.value));
              const barWidth = (item.value / maxVal) * 100;
              return (
                <div key={item.name}
                  onMouseEnter={() => { setActiveSlice(idx); setHoveredItem(item); }}
                  onMouseLeave={() => { setActiveSlice(null); setHoveredItem(null); }}
                  onClick={() => { if (drillLevel === null && SPENDING_DATA.children[idx].children) { setDrillLevel(idx); setActiveSlice(null); setHoveredItem(null); } }}
                  style={{ padding: "7px 8px", marginBottom: 1, cursor: drillLevel === null ? "pointer" : "default", background: isHovered ? "rgba(28,43,69,0.04)" : "transparent", borderRadius: 3, transition: "background 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: item.color, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: isHovered ? P.text : P.textMuted, fontWeight: isHovered ? 500 : 400, transition: "all 0.15s", fontFamily: "'DM Mono', monospace" }}>{item.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace" }}>£{item.value}bn</span>
                      <span style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", width: 36, textAlign: "right" }}>{pct(item.value, totalValue)}%</span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: "rgba(28,43,69,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barWidth}%`, background: item.color, borderRadius: 2, transition: "width 0.4s ease", opacity: isHovered ? 1 : 0.55 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Salary calculator */}
          <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderLeft: `3px solid ${P.sienna}`, borderRadius: 3, padding: "16px 18px", boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.sienna, fontWeight: 500, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>Your tax contribution</div>
            <div style={{ fontSize: "11px", color: P.textMuted, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>Annual salary</div>
            <input type="range" min={15000} max={150000} step={1000} value={salary} onChange={(e) => setSalary(Number(e.target.value))} style={{ width: "100%", accentColor: P.sienna, marginBottom: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: "18px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text }}>£{salary.toLocaleString()}</span>
              <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", alignSelf: "flex-end" }}>≈ £{Math.round(taxPaid).toLocaleString()} tax/yr</span>
            </div>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: P.textLight, fontWeight: 500, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>Your money goes to</div>
            {SPENDING_DATA.children.slice(0, 7).map((cat) => {
              const share = (cat.value / SPENDING_DATA.value) * taxPaid;
              return (
                <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: cat.color, display: "inline-block" }} />
                    <span style={{ fontSize: "10px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>{cat.name}</span>
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace" }}>£{Math.round(share).toLocaleString()}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 8, fontSize: "9px", color: P.textLight, fontStyle: "italic", fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
              Approximation based on income tax + NI. Excludes VAT, council tax, and other indirect taxes.
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderLeft: `3px solid ${P.sienna}`, borderRadius: 3, padding: "20px 24px", marginBottom: 36, animation: "fadeSlideIn 0.6s ease 0.3s both", boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.sienna, fontWeight: 500, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>Analysis</div>
        <p style={{ fontSize: "15px", lineHeight: 1.75, color: P.textMuted, margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 400, fontStyle: "italic" }}>
          Social protection and health together consume 43% of all public spending — over £570 billion. Debt interest alone, at £104 billion, now exceeds the entire defence budget. As the population ages, the share devoted to pensions and healthcare will only grow, squeezing every other area of government activity. This is the central fiscal challenge of British politics: an expanding welfare state meeting a tax base unwilling to fund it.
        </p>
      </div>
    </div>
  );
};

// ─── MAIN ────────────────────────────────────────────────────────────────
export default function BritainInData() {
  const [activeTopic, setActiveTopic] = useState("spending");
  const [chartType, setChartType] = useState("line");
  const [showInsight, setShowInsight] = useState(false);

  const isSpending = activeTopic === "spending";
  const topic = !isSpending ? DATA[activeTopic] : null;

  useEffect(() => {
    setShowInsight(false);
    const t = setTimeout(() => setShowInsight(true), 600);
    return () => clearTimeout(t);
  }, [activeTopic]);

  const allTabs = [
    { key: "spending", title: "Spending", icon: "◎", color: P.sienna },
    ...TOPICS.map(k => ({ key: k, title: DATA[k].title, icon: DATA[k].icon, color: DATA[k].color }))
  ];

  return (
    <div style={{ minHeight: "100vh", background: P.bg, color: P.text, fontFamily: "'DM Mono', monospace", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes expandLine { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(28,43,69,0.15); border-radius:2px; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px" }}>
        {/* HEADER */}
        <header style={{ paddingTop: 44, paddingBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 700, color: P.text, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Britain in Data
            </h1>
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.18em", color: P.sienna, fontWeight: 500, borderLeft: `2px solid ${P.sienna}`, paddingLeft: 10, fontFamily: "'DM Mono', monospace" }}>
              The state of the state
            </span>
          </div>
          <p style={{ fontSize: "13px", color: P.textMuted, marginTop: 8, maxWidth: 580, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", fontWeight: 300 }}>
            Objective data on Britain's public services, economy, and society. Because political debate should start with facts.
          </p>
          <div style={{ marginTop: 18, height: 2, width: 48, background: P.sienna, animation: "expandLine 0.8s ease both", transformOrigin: "left" }} />
        </header>

        {/* NAV */}
        <nav style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 4, marginBottom: 30, borderBottom: `1px solid ${P.border}` }}>
          {allTabs.map(({ key, title, icon, color }) => {
            const isActive = key === activeTopic;
            return (
              <button key={key} onClick={() => setActiveTopic(key)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "10px 16px 12px",
                display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
                borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                transition: "all 0.2s", position: "relative", top: 1,
              }}>
                <span style={{ fontSize: "15px", opacity: isActive ? 1 : 0.35, transition: "opacity 0.2s" }}>{icon}</span>
                <span style={{ fontSize: "11px", fontWeight: isActive ? 500 : 400, color: isActive ? P.text : P.textLight, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.2s", fontFamily: "'DM Mono', monospace" }}>{title}</span>
              </button>
            );
          })}
        </nav>

        {/* CONTENT */}
        {isSpending ? <SpendingTab /> : topic && (
          <div key={activeTopic} style={{ animation: "fadeSlideIn 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>{topic.title}</h2>
              <span style={{ fontSize: "12px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>{topic.subtitle}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
              {topic.metrics.map((m, i) => <MetricCard key={m.label} {...m} color={topic.color} delay={0.1 + i * 0.08} />)}
            </div>

            <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px", marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  {topic.lines.map((l) => (
                    <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 14, height: 2.5, background: l.color, display: "inline-block", borderRadius: 1 }} />
                      <span style={{ fontSize: "10px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{l.name}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
                  {["line", "area", "bar"].map((t) => (
                    <button key={t} onClick={() => setChartType(t)} style={{
                      background: chartType === t ? "rgba(28,43,69,0.06)" : "transparent", border: "none",
                      color: chartType === t ? P.text : P.textLight, padding: "4px 12px",
                      fontSize: "9px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em",
                      cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.15s", borderRadius: 2,
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                {chartType === "area" ? (
                  <AreaChart data={topic.chart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>{topic.lines.map((l) => (
                      <linearGradient key={l.key} id={`grad-${activeTopic}-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={l.color} stopOpacity={0.2} /><stop offset="100%" stopColor={l.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}</defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {topic.lines.map((l) => <Area key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} fill={`url(#grad-${activeTopic}-${l.key})`} strokeWidth={2} dot={false} />)}
                  </AreaChart>
                ) : chartType === "bar" ? (
                  <BarChart data={topic.chart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {topic.lines.map((l) => <Bar key={l.key} dataKey={l.key} name={l.name} fill={l.color} opacity={0.8} radius={[2, 2, 0, 0]} />)}
                  </BarChart>
                ) : (
                  <LineChart data={topic.chart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {topic.lines.map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: l.color, stroke: P.bgCard, strokeWidth: 2 }} />)}
                  </LineChart>
                )}
              </ResponsiveContainer>
              <div style={{ marginTop: 8, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>SOURCE: ONS, HM Treasury, NHS England, Home Office, BEIS, MOJ · 2010–2025</div>
            </div>

            <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderLeft: `3px solid ${topic.color}`, borderRadius: 3, padding: "20px 24px", marginBottom: 36, opacity: showInsight ? 1 : 0, transform: showInsight ? "translateY(0)" : "translateY(8px)", transition: "all 0.5s ease", boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: topic.color, fontWeight: 500, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>Analysis</div>
              <p style={{ fontSize: "15px", lineHeight: 1.75, color: P.textMuted, margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 400, fontStyle: "italic" }}>{topic.insight}</p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer style={{ borderTop: `1px solid ${P.border}`, padding: "20px 0 44px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>BRITAIN IN DATA · {new Date().getFullYear()}</div>
          <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>Data sourced from official UK government statistics. Figures are illustrative and intended to reflect real trends.</div>
        </footer>
      </div>
    </div>
  );
}
