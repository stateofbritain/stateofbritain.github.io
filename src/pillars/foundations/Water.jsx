import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";

const VIEWS = ["leakage", "pollution", "overview"];
const VIEW_LABELS = {
  leakage: "Leakage",
  pollution: "Pollution Incidents",
  overview: "Sector Performance",
};

export default function Water() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("leakage");

  const overviewData = useMemo(() => {
    if (!data?.sectorPerformance?.metrics) return [];
    return data.sectorPerformance.metrics.map((m) => ({
      ...m,
      improved: m.change < 0 || (m.metric === "Priority services register" && m.change > 0) || (m.metric === "Treatment works compliance" && m.change > 0),
    }));
  }, [data]);

  useEffect(() => {
    fetch("/data/water.json")
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
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Water</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading water data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Water</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestLeakage = data.leakage[data.leakage.length - 1];
  const latestPollution = data.pollutionIncidents[data.pollutionIncidents.length - 1];
  const cats = data.companyCategories;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Water</h2>
        <span style={{ fontSize: "12px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Ofwat WCPR 2024-25 &middot; Environment Agency 2024
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Leakage"
          value={`${latestLeakage.value.toLocaleString()} Ml/d`}
          change="43% reduction since privatisation"
          up={false}
          color={P.teal}
          delay={0.1}
        />
        <MetricCard
          label="Pollution Incidents"
          value={latestPollution.total.toLocaleString()}
          change={`+29% vs 2023 (${latestPollution.year})`}
          up={true}
          color={P.red}
          delay={0.18}
        />
        <MetricCard
          label="Serious Incidents"
          value={latestPollution.serious.toString()}
          change={`cat 1-2 (${latestPollution.year})`}
          up={true}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="Storm Overflow Spills"
          value={`${data.stormOverflows.avgSpillsPerOverflow2024}/overflow`}
          change={`avg spills per year (2024)`}
          up={true}
          color={P.navy}
          delay={0.34}
        />
      </div>

      {/* Chart area */}
      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px", marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: "10px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
            {VIEW_LABELS[view]}
          </span>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background: view === v ? "rgba(28,43,69,0.06)" : "transparent",
                  border: "none",
                  color: view === v ? P.text : P.textLight,
                  padding: "4px 10px", fontSize: "9px", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  transition: "all 0.15s", borderRadius: 2,
                }}
              >
                {VIEW_LABELS[v].split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {view === "leakage" && <LeakageChart data={data.leakage} />}
        {view === "pollution" && <PollutionChart data={data.pollutionIncidents} />}
        {view === "overview" && <OverviewTable data={overviewData} />}

        <div style={{ marginTop: 12, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
          SOURCES:{" "}
          <a href="https://www.ofwat.gov.uk/regulated-companies/company-obligations/outcomes/water-company-performance-report-2024-25/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            Ofwat WCPR 2024-25
          </a>
          {" "}&middot;{" "}
          <a href="https://www.gov.uk/government/publications/water-and-sewerage-companies-in-england-pollution-incident-report-for-2016-to-2024" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            EA Pollution Incidents 2016-2024
          </a>
          {" "}&middot;{" "}
          <a href="https://www.gov.uk/government/news/environment-agency-storm-overflow-spill-data-for-2024" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            EA Storm Overflow EDM 2024
          </a>
        </div>
      </div>

      {/* Company categorisation */}
      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "20px 24px", marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ fontSize: "10px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
          Ofwat company categorisation 2024-25
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <CategoryGroup label="Leading" color={P.teal} companies={cats.leading} />
          <CategoryGroup label="Average" color={P.navy} companies={cats.average} />
          <CategoryGroup label="Lagging" color={P.red} companies={cats.lagging} />
        </div>
      </div>

      <AnalysisBox color={P.navy} label="Context">
        Sector leakage: {latestLeakage.value.toLocaleString()} Ml/d (2024-25), down 43% since privatisation but
        missing the 2020-25 target of 16% reduction (achieved 9%).
        {" "}Pollution incidents: {latestPollution.total.toLocaleString()} in {latestPollution.year}, up 29% year-on-year —
        third consecutive annual increase.
        {" "}{latestPollution.serious} serious incidents (category 1-2).
        {" "}Storm overflows averaged {data.stormOverflows.avgSpillsPerOverflow2024} spills per overflow in 2024.
        {" "}Ofwat categorised {cats.lagging.length} of 16 companies as "lagging behind" in 2024-25.
      </AnalysisBox>
    </div>
  );
}

function CategoryGroup({ label, color, companies }) {
  return (
    <div style={{ flex: "1 1 200px" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color, marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      {companies.map((c) => (
        <div key={c} style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'Playfair Display', serif", lineHeight: 1.8 }}>
          {c}
        </div>
      ))}
    </div>
  );
}

function LeakageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} interval={2} />
        <YAxis
          tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false} domain={[2500, 5200]}
          label={{ value: "Ml/d", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="value" name="Leakage (Ml/d)" stroke={P.teal} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PollutionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} label={{ value: "Incidents", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total" name="All incidents (cat 1-3)" fill={P.red} opacity={0.7} radius={[3, 3, 0, 0]} />
        <Bar dataKey="serious" name="Serious (cat 1-2)" fill={P.navy} opacity={0.9} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function OverviewTable({ data }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${P.border}` }}>
            <th style={{ textAlign: "left", padding: "8px 10px", color: P.textMuted, fontWeight: 500, fontSize: "10px", letterSpacing: "0.06em" }}>METRIC</th>
            <th style={{ textAlign: "right", padding: "8px 10px", color: P.textMuted, fontWeight: 500, fontSize: "10px" }}>2019-20</th>
            <th style={{ textAlign: "right", padding: "8px 10px", color: P.textMuted, fontWeight: 500, fontSize: "10px" }}>2024-25</th>
            <th style={{ textAlign: "right", padding: "8px 10px", color: P.textMuted, fontWeight: 500, fontSize: "10px" }}>CHANGE</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${P.border}` }}>
              <td style={{ padding: "8px 10px", color: P.text, fontFamily: "'Playfair Display', serif", fontSize: "13px" }}>{m.metric}</td>
              <td style={{ textAlign: "right", padding: "8px 10px", color: P.textMuted }}>{formatVal(m.baseline)}</td>
              <td style={{ textAlign: "right", padding: "8px 10px", color: P.text, fontWeight: 500 }}>{formatVal(m.latest)}</td>
              <td style={{ textAlign: "right", padding: "8px 10px", color: m.improved ? P.teal : P.red, fontWeight: 500 }}>
                {m.change > 0 ? "+" : ""}{m.change}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatVal(v) {
  if (typeof v === "string") return v;
  if (v >= 1000) return v.toLocaleString();
  return v.toString();
}
