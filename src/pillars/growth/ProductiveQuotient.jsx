import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, Cell,
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

const SERVICES = [
  {
    key: "nhs",
    label: "NHS",
    frontlineLabel: "Clinical staff",
    backLabel: "Infrastructure support",
    color: P.teal,
    note: "Clinical = qualified professionals + clinical support. Non-clinical = admin, management, estates.",
  },
  {
    key: "education",
    label: "Schools",
    frontlineLabel: "Teachers + TAs",
    backLabel: "Admin & support",
    color: P.sienna,
    note: "Frontline = teachers + teaching assistants. Back office = admin, technicians, auxiliary staff.",
  },
  {
    key: "police",
    label: "Police",
    frontlineLabel: "Officers + PCSOs",
    backLabel: "Civilian staff",
    color: P.navy,
    note: "Frontline = warranted officers + PCSOs. Back office = police staff + designated officers.",
  },
  {
    key: "universities",
    label: "Universities",
    frontlineLabel: "Academic staff",
    backLabel: "Professional staff",
    color: "#4A7A58",
    note: "Academic = teaching, research, or both. Professional = management, admin, technical, clerical.",
  },
];

export default function ProductiveQuotient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartView, setChartView] = useState("comparison");
  const [trendService, setTrendService] = useState("nhs");

  useEffect(() => {
    fetch("/data/workforce.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Latest frontline % for each service
  const latestPcts = useMemo(() => {
    if (!data) return {};
    const result = {};
    for (const svc of SERVICES) {
      const series = data[svc.key];
      if (series?.length) {
        const latest = series[series.length - 1];
        result[svc.key] = latest;
      }
    }
    return result;
  }, [data]);

  // Comparison bar chart data
  const comparisonData = useMemo(() => {
    return SERVICES.map((svc) => {
      const latest = latestPcts[svc.key];
      if (!latest) return null;
      return {
        service: svc.label,
        frontlinePct: latest.frontlinePct,
        backOfficePct: +(100 - latest.frontlinePct).toFixed(1),
        color: svc.color,
        year: latest.year,
      };
    }).filter(Boolean);
  }, [latestPcts]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Productive Quotient</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Productive Quotient</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const trendSvc = SERVICES.find((s) => s.key === trendService);
  const trendData = data[trendService] || [];

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Productive Quotient
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        What share of public service workforces is on the frontline?
        Compares the ratio of operational/frontline staff to back-office/support
        across four major services.
      </p>

      {/* Metric cards — latest frontline % for each service */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        {SERVICES.map((svc) => {
          const latest = latestPcts[svc.key];
          if (!latest) return null;
          return (
            <MetricCard
              key={svc.key}
              label={`${svc.label} frontline`}
              value={`${latest.frontlinePct}%`}
              sub={`${latest.year} · ${(latest.frontline / 1000).toFixed(0)}k of ${(latest.total / 1000).toFixed(0)}k FTE`}
            />
          );
        })}
      </div>

      {/* Section 1: Cross-service comparison */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Frontline Ratio by Service</h3>
        <p style={sectionNote}>
          Share of each workforce classified as frontline/operational (dark) vs
          back-office/support (light). Definitions vary by service — see methodology below.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button style={toggleBtn(chartView === "comparison")} onClick={() => setChartView("comparison")}>Comparison</button>
          <button style={toggleBtn(chartView === "trend")} onClick={() => setChartView("trend")}>Trends over time</button>
        </div>

        {chartView === "comparison" ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData} layout="vertical" margin={{ left: 90, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="service" tick={{ fontSize: 12, fill: P.textMuted }} width={85} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
              <Bar dataKey="frontlinePct" name="Frontline" stackId="a" isAnimationActive={false}>
                {comparisonData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="backOfficePct" name="Back office" stackId="a" isAnimationActive={false}>
                {comparisonData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.25} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {SERVICES.map((svc) => (
                <button
                  key={svc.key}
                  style={toggleBtn(trendService === svc.key)}
                  onClick={() => setTrendService(svc.key)}
                >
                  {svc.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
                <YAxis
                  domain={[
                    Math.max(0, Math.floor((Math.min(...trendData.map((d) => d.frontlinePct)) - 5) / 5) * 5),
                    100,
                  ]}
                  tick={{ fontSize: 11, fill: P.textMuted }}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "%", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
                />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}%`} />} />
                <Line
                  type="monotone"
                  dataKey="frontlinePct"
                  stroke={trendSvc.color}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name={`${trendSvc.label} frontline %`}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </section>

      {/* Section 2: Workforce composition detail */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Workforce Composition</h3>
        <p style={sectionNote}>
          Absolute FTE numbers over time, showing how each workforce has grown and how the
          balance between frontline and support has shifted.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {SERVICES.map((svc) => (
            <button
              key={svc.key}
              style={toggleBtn(trendService === svc.key)}
              onClick={() => setTrendService(svc.key)}
            >
              {svc.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
            <YAxis
              tick={{ fontSize: 10, fill: P.textMuted }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              label={{ value: "FTE", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k FTE` : `${v} FTE`
                  }
                />
              }
            />
            <Bar dataKey="frontline" name={trendSvc.frontlineLabel} stackId="a" fill={trendSvc.color} />
            <Bar dataKey="backOffice" name={trendSvc.backLabel} stackId="a" fill={trendSvc.color} opacity={0.3} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Section 3: Methodology */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={sectionHeading}>Methodology</h3>
        <p style={sectionNote}>
          "Frontline" and "back office" are simplified categories applied to official workforce taxonomies.
          The boundaries are debatable — for instance, teaching assistants directly support learning
          (counted as frontline here), while some NHS infrastructure roles (IT, procurement) are
          essential enablers of clinical work. These ratios describe workforce composition, not efficiency.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 720 }}>
          {SERVICES.map((svc) => (
            <div
              key={svc.key}
              style={{
                background: P.bgCard,
                border: `1px solid ${P.border}`,
                borderRadius: 6,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: svc.color, marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>
                {svc.label}
              </div>
              <div style={{ fontSize: 11, color: P.textMuted, lineHeight: 1.6, fontFamily: "'DM Mono', monospace" }}>
                {svc.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Context */}
      <AnalysisBox>
        The NHS has the highest frontline ratio ({latestPcts.nhs?.frontlinePct}%), followed
        by police ({latestPcts.police?.frontlinePct}%), universities ({latestPcts.universities?.frontlinePct}%),
        and schools ({latestPcts.education?.frontlinePct}%). Schools have the lowest ratio
        partly because teaching assistants (288k FTE) are counted as frontline — without them
        the teacher-only share would be ~47.5%. The NHS frontline ratio has been stable
        at 83-84% since 2013, rising slightly as infrastructure headcount was cut during
        austerity. Police officer numbers fell from 146k (2009) to 125k (2018) before
        recovering to 149k (2025) under the uplift programme.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://digital.nhs.uk/data-and-information/publications/statistical/nhs-workforce-statistics" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          NHS Digital HCHS Workforce Statistics (Feb 2026)
        </a>
        {" · "}
        <a href="https://explore-education-statistics.service.gov.uk/find-statistics/school-workforce-in-england" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          DfE School Workforce Census 2024/25
        </a>
        {" · "}
        <a href="https://www.gov.uk/government/statistics/police-workforce-open-data-tables" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          Home Office Police Workforce (Jan 2026)
        </a>
        {" · "}
        <a href="https://www.hesa.ac.uk/data-and-analysis/staff" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          HESA Staff Statistics 2022/23
        </a>
      </div>
    </div>
  );
}
