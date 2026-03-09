import { useState, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import { getAvailableDates, getNationalSnapshot } from "../../api/police";
import useDataset from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";

const CATEGORY_LABELS = {
  "anti-social-behaviour": "Anti-social behaviour",
  "burglary": "Burglary",
  "criminal-damage-arson": "Criminal damage & arson",
  "drugs": "Drugs",
  "other-theft": "Other theft",
  "possession-of-weapons": "Weapons possession",
  "public-order": "Public order",
  "robbery": "Robbery",
  "shoplifting": "Shoplifting",
  "theft-from-the-person": "Theft from person",
  "vehicle-crime": "Vehicle crime",
  "violent-crime": "Violence & sexual offences",
  "bicycle-theft": "Bicycle theft",
  "other-crime": "Other crime",
};

const CATEGORY_COLORS = [
  P.red, P.navy, P.teal, P.sienna, P.yellow, P.grey,
  "#6B5B4E", "#4A7A58", "#607DAA", "#D97040", "#8A7868",
  "#2E8B7A", "#C04A3E", "#B0A898",
];

function formatLabel(cat) {
  return CATEGORY_LABELS[cat] || cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Safety() {
  const isMobile = useIsMobile();
  const [chartView, setChartView] = useState("bar");

  // First get the latest available date
  const { data: dates, loading: datesLoading } = useDataset(getAvailableDates, []);
  const latestDate = dates?.[0]?.date ?? null;

  // Then fetch snapshot for that date
  const { data: snapshot, loading: snapLoading, error } = useDataset(
    () => latestDate ? getNationalSnapshot(latestDate) : Promise.resolve(null),
    [latestDate]
  );

  const loading = datesLoading || snapLoading;

  const chartData = useMemo(() => {
    if (!snapshot?.byCategory) return [];
    return Object.entries(snapshot.byCategory)
      .map(([cat, count]) => ({ category: formatLabel(cat), count, key: cat }))
      .sort((a, b) => b.count - a.count);
  }, [snapshot]);

  const topCategories = chartData.slice(0, 8);
  const totalCrimes = snapshot?.total ?? 0;

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Safety</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading Police API data (10 city centres)...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Safety</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const violentCount = snapshot.byCategory["violent-crime"] ?? 0;
  const asbCount = snapshot.byCategory["anti-social-behaviour"] ?? 0;
  const theftCount = (snapshot.byCategory["other-theft"] ?? 0) +
    (snapshot.byCategory["shoplifting"] ?? 0) +
    (snapshot.byCategory["bicycle-theft"] ?? 0) +
    (snapshot.byCategory["theft-from-the-person"] ?? 0);

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Safety</h2>
        <span style={{ fontSize: "12px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Street-level crime — {latestDate}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Crimes Sampled"
          value={totalCrimes.toLocaleString()}
          change={`${snapshot.cityCount} major city centres`}
          up={false}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Violence & Sexual"
          value={violentCount.toLocaleString()}
          change={`${((violentCount / totalCrimes) * 100).toFixed(1)}% of total`}
          up={true}
          color={P.red}
          delay={0.18}
        />
        <MetricCard
          label="Theft (all types)"
          value={theftCount.toLocaleString()}
          change={`${((theftCount / totalCrimes) * 100).toFixed(1)}% of total`}
          up={true}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="Anti-social Behaviour"
          value={asbCount.toLocaleString()}
          change={`${((asbCount / totalCrimes) * 100).toFixed(1)}% of total`}
          up={false}
          color={P.grey}
          delay={0.34}
        />
      </div>

      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px", marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: "10px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
            Crime by category — {latestDate}
          </span>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
            {["bar", "pie"].map((t) => (
              <button
                key={t}
                onClick={() => setChartView(t)}
                style={{
                  background: chartView === t ? "rgba(28,43,69,0.06)" : "transparent",
                  border: "none",
                  color: chartView === t ? P.text : P.textLight,
                  padding: "4px 12px", fontSize: "9px", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  transition: "all 0.15s", borderRadius: 2,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          {chartView === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={140}
                paddingAngle={1}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : (
            <BarChart
              data={topCategories}
              layout="vertical"
              margin={{ top: 5, right: 20, left: isMobile ? 10 : 120, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: isMobile ? 9 : 10, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 85 : 115}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Crimes" radius={[0, 3, 3, 0]}>
                {topCategories.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>

        <div style={{ marginTop: 8, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
          SOURCE:{" "}
          <a href="https://data.police.uk/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            data.police.uk
          </a>
          {" "}&middot; Street-level crime data for {latestDate} &middot; Sample: 10 major city centres (not nationally comprehensive)
        </div>
      </div>

      <AnalysisBox color={P.navy} label="Context">
        Street-level crime data for {latestDate}, sampled from {snapshot.cityCount} major city centres.
        {" "}{totalCrimes.toLocaleString()} crimes recorded.
        {" "}Largest category: {chartData[0]?.category} ({chartData[0]?.count.toLocaleString()}).
        {" "}Note: this is a geographic sample, not a national total. For comprehensive national crime statistics,
        see the ONS Crime Survey for England and Wales.
      </AnalysisBox>
    </div>
  );
}
