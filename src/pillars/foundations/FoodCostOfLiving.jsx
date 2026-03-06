import { useState, useEffect } from "react";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";

const AGGREGATES = [
  { id: "CP00", label: "Overall CPIH", color: P.navy },
  { id: "CP01", label: "Food & non-alcoholic beverages", color: P.red },
  { id: "CP04", label: "Housing, water, energy & fuels", color: P.teal },
  { id: "CP07", label: "Transport", color: P.yellow },
  { id: "CP09", label: "Recreation & culture", color: P.grey },
];

export default function FoodCostOfLiving() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/cpih.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Food & Cost of Living</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading CPIH data...</p>
      </div>
    );
  }

  if (error || !data?.series?.length) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Food & Cost of Living</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const series = data.series;
  const latest = series[series.length - 1];
  const earliest = series[0];

  const changes = AGGREGATES.map((agg) => {
    const start = earliest[agg.id];
    const end = latest[agg.id];
    const pctChange = start ? (((end - start) / start) * 100).toFixed(1) : "--";
    return { ...agg, start, end, pctChange };
  });

  // Sample quarterly for cleaner chart
  const quarterly = series.filter((_, i) => i % 3 === 0 || i === series.length - 1);

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Food & Cost of Living</h2>
        <span style={{ fontSize: "12px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>CPIH price indices (2015 = 100)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        {changes.slice(0, 4).map((c, i) => (
          <MetricCard
            key={c.id}
            label={c.label}
            value={c.end?.toFixed(1) ?? "--"}
            change={`+${c.pctChange}% since ${earliest.label}`}
            up={parseFloat(c.pctChange) > 0}
            color={c.color}
            delay={0.1 + i * 0.08}
          />
        ))}
      </div>

      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px", marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
          {AGGREGATES.map((agg) => (
            <div key={agg.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, background: agg.color, display: "inline-block", borderRadius: 1 }} />
              <span style={{ fontSize: "10px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{agg.label}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={quarterly} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
              axisLine={{ stroke: P.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              label={{ value: "Index (2015=100)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
            />
            <Tooltip content={<CustomTooltip />} />
            {AGGREGATES.map((agg) => (
              <Line
                key={agg.id}
                type="monotone"
                dataKey={agg.id}
                name={agg.label}
                stroke={agg.color}
                strokeWidth={agg.id === "CP00" ? 2.5 : 1.5}
                dot={false}
                strokeDasharray={agg.id === "CP00" ? undefined : "4 3"}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div style={{ marginTop: 8, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
          SOURCE:{" "}
          <a href="https://www.ons.gov.uk/economy/inflationandpriceindices" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            ONS Consumer Prices Index including owner occupiers' housing costs (CPIH)
          </a>
          {" "}&middot; Index: 2015 = 100 &middot; {earliest.label} to {latest.label}
        </div>
      </div>

      <AnalysisBox color={P.navy} label="Context">
        CPIH price indices from {earliest.label} to {latest.label} (2015 = 100).
        {" "}Overall: {earliest.CP00?.toFixed(1)} → {latest.CP00?.toFixed(1)} (+{changes[0]?.pctChange}%).
        {" "}Food: +{changes[1]?.pctChange}%.
        {" "}Housing & energy: +{changes[2]?.pctChange}%.
        {" "}Transport: +{changes[3]?.pctChange}%.
      </AnalysisBox>
    </div>
  );
}
