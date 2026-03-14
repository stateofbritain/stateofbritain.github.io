import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  CHART_CARD, CHART_TITLE, CHART_SUBTITLE, SOURCE_TEXT,
  AXIS_TICK_MONO, yAxisLabel,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";

const VIEWS = ["waitlist", "performance", "ae"];
const VIEW_LABELS = {
  waitlist: "Waiting List",
  performance: "18-Week Target",
  ae: "A&E Performance",
};

export default function HealthcareAccess() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("waitlist");

  // useMemo must be before early returns
  const chartData = useMemo(() => {
    if (!data?.rtt) return [];
    // Sample every 3 months for cleaner chart
    return data.rtt.filter((_, i) => i % 3 === 0 || i === data.rtt.length - 1);
  }, [data]);

  useEffect(() => {
    fetch("/data/nhs.json")
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
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Healthcare Access</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading NHS England data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Healthcare Access</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.summary;
  const waitingMillions = s.totalWaiting ? (s.totalWaiting / 1e6).toFixed(2) : "--";
  const over52kFormatted = s.over52Weeks ? s.over52Weeks.toLocaleString() : "--";

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Healthcare Access</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          NHS England waiting times & A&E
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Waiting List"
          value={`${waitingMillions}m`}
          change={`incomplete pathways (${s.rttPeriod})`}
          up={true}
          color={P.red}
          delay={0.1}
        />
        <MetricCard
          label="Within 18 Weeks"
          value={`${s.pctWithin18Weeks ?? "--"}%`}
          change="target: 92%"
          up={false}
          color={P.navy}
          delay={0.18}
        />
        <MetricCard
          label="Waiting 52+ Weeks"
          value={over52kFormatted}
          change={`patients (${s.rttPeriod})`}
          up={true}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="A&E Within 4 Hours"
          value={`${s.aePctWithin4Hours ?? "--"}%`}
          change={`target: 95% (${s.aePeriod})`}
          up={false}
          color={P.teal}
          delay={0.34}
        />
      </div>

      {/* Chart area */}
      <ShareableChart title="NHS Waiting Times & A&E Performance">
      <div style={{ ...CHART_CARD, marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ marginBottom: 10 }}>
          <div style={CHART_TITLE}>NHS Waiting Times &amp; A&amp;E</div>
          <div style={CHART_SUBTITLE}>RTT pathways &amp; emergency department performance, England</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
            {VIEW_LABELS[view]} — {view === "ae" ? "quarterly 2025-26" : `${data.rtt[0]?.period} to ${s.rttPeriod}`}
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
                  padding: "4px 10px", fontSize: "10px", fontWeight: 500,
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

        {view === "waitlist" && <WaitlistChart data={chartData} />}
        {view === "performance" && <PerformanceChart data={chartData} />}
        {view === "ae" && <AEChart data={data.ae} />}

        <div style={SOURCE_TEXT}>
          SOURCE:{" "}
          <a href="https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            NHS England RTT Waiting Times
          </a>
          {" "}&middot;{" "}
          <a href="https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            A&E Attendances
          </a>
        </div>
      </div>
      </ShareableChart>

      <AnalysisBox color={P.navy} label="Context">
        NHS England RTT waiting list: {waitingMillions}m incomplete pathways ({s.rttPeriod}).
        {" "}{s.pctWithin18Weeks}% treated within 18 weeks (target: 92%).
        {" "}{over52kFormatted} patients waiting over 52 weeks.
        {" "}A&E: {s.aePctWithin4Hours}% seen within 4 hours ({s.aePeriod}, target: 95%).
        {" "}Median referral-to-treatment wait: {s.medianWait} weeks.
      </AnalysisBox>
    </div>
  );
}

function WaitlistChart({ data }) {
  const formatted = data.map((d) => ({
    ...d,
    waitingMillions: d.totalWaiting ? Math.round(d.totalWaiting / 1000) / 1000 : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="period" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="m" label={yAxisLabel("Waiting (millions)")} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="waitingMillions" name="Waiting (millions)" stroke={P.red} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PerformanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="period" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[40, 100]} label={yAxisLabel("% within 18 weeks")} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={92} stroke={P.teal} strokeDasharray="6 4" label={{ value: "92% target", position: "right", fontSize: 10, fill: P.teal, fontFamily: "'DM Mono', monospace" }} />
        <Line type="monotone" dataKey="pctWithin18" name="% within 18 weeks" stroke={P.navy} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AEChart({ data }) {
  if (!data?.length) return <p style={{ fontSize: "13px", color: P.textMuted }}>No A&E data available.</p>;

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="period" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Attendances")} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[60, 85]} label={yAxisLabel("% within 4 hours", { angle: 90, position: "insideRight" })} />
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="left" dataKey="totalAttendances" name="Attendances" fill={P.grey} opacity={0.5} radius={[3, 3, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="pctWithin4Hours" name="% within 4 hours" stroke={P.teal} strokeWidth={2.5} dot />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
