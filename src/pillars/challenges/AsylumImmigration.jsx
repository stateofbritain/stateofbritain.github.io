import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_TITLE, CHART_SUBTITLE,
  AXIS_TICK, GRID_PROPS,
} from "../../theme/chartStyles";
import useIsMobile from "../../hooks/useIsMobile";
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import CustomTooltip from "../../components/CustomTooltip";
import { sourceFrom } from "../../hooks/useDataset";
import { track } from "../../analytics";
import ShareableChart from "../../components/ShareableChart";
import DebateHeader from "../../components/DebateHeader";
import DebateTabs from "../../components/DebateTabs";

const PURPLE = "#7B4B8A";

const TYPE_COLORS = {
  international: "#2E5B9E",
  bilateral: P.sienna,
  domestic: "#4A7A58",
  "eu-retained": P.textLight,
};

const TYPE_LABELS = {
  international: "International Treaty",
  bilateral: "Bilateral Agreement",
  domestic: "Domestic Statute",
  "eu-retained": "Lost (Brexit)",
};

const STATUS_LABELS = {
  "in-force": "In force",
  "in-force-partial": "In force (partially implemented)",
  "partially-repealed": "Partially repealed",
  "repealed": "Repealed",
  "dead-letter": "Dead letter",
  "lost-brexit": "Lost at Brexit",
};

const EFFECT_COLORS = {
  expanded: "#2E5B9E",
  reduced: P.sienna,
  uncertain: P.textMuted,
};

// ── Legal framework node ─────────────────────────────────────────────
function InstrumentNode({ instrument, isSelected, onClick, isMobile }) {
  const col = TYPE_COLORS[instrument.type] || P.textMuted;
  const isDead = instrument.status === "dead-letter" || instrument.status === "lost-brexit" || instrument.status === "repealed";
  return (
    <button
      onClick={onClick}
      style={{
        background: isSelected ? "rgba(123,75,138,0.08)" : P.bgCard,
        border: `1.5px solid ${isSelected ? PURPLE : P.border}`,
        borderLeft: `4px solid ${col}`,
        borderRadius: 4,
        padding: isMobile ? "10px 12px" : "12px 16px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        opacity: isDead ? 0.6 : 1,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontSize: isMobile ? "12px" : "13px",
          fontWeight: 600,
          color: P.text,
          fontFamily: "'Playfair Display', serif",
          textDecoration: isDead ? "line-through" : "none",
        }}>
          {instrument.short}
        </span>
        <span style={{
          fontSize: "10px",
          color: col,
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          flexShrink: 0,
        }}>
          {instrument.year} · {STATUS_LABELS[instrument.status] || instrument.status}
        </span>
      </div>
    </button>
  );
}

// ── Instrument detail panel ──────────────────────────────────────────
function InstrumentDetail({ instrument }) {
  const col = TYPE_COLORS[instrument.type] || P.textMuted;
  return (
    <div style={{
      background: P.bgCard,
      border: `1px solid ${P.border}`,
      borderTop: `3px solid ${col}`,
      borderRadius: 4,
      padding: "20px 22px",
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", fontWeight: 600, color: P.text, margin: 0 }}>
          {instrument.name}
        </h4>
        <span style={{ fontSize: "10px", color: col, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>
          {TYPE_LABELS[instrument.type]} · {instrument.year}
        </span>
      </div>
      <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'Playfair Display', serif", lineHeight: 1.7, margin: "0 0 14px" }}>
        {instrument.summary}
      </p>

      {instrument.keyArticles?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "10px", color: PURPLE, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Key provisions
          </div>
          {instrument.keyArticles.map((art, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, marginBottom: 8,
              padding: "6px 8px",
              background: "rgba(28,43,69,0.02)",
              borderRadius: 3,
            }}>
              <span style={{
                fontSize: "11px", fontWeight: 600, color: col,
                fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 70,
              }}>
                {art.ref}
              </span>
              <span style={{ fontSize: "11px", color: P.text, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
                {art.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{
        padding: "10px 12px",
        background: "rgba(123,75,138,0.05)",
        borderLeft: `3px solid ${PURPLE}`,
        borderRadius: 3,
      }}>
        <div style={{ fontSize: "10px", color: PURPLE, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Constraint
        </div>
        <div style={{ fontSize: "12px", color: P.text, fontFamily: "'Playfair Display', serif", lineHeight: 1.7 }}>
          {instrument.constraints}
        </div>
      </div>

      {instrument.legislationRef && (
        <div style={{ marginTop: 10, fontSize: "10px", fontFamily: "'DM Mono', monospace" }}>
          <a href={`https://www.legislation.gov.uk/${instrument.legislationRef}`} target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
            View on legislation.gov.uk →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Knot (cause-effect chain) ────────────────────────────────────────
function KnotCard({ knot, isOpen, onToggle }) {
  return (
    <div style={{
      background: P.bgCard,
      border: `1px solid ${isOpen ? PURPLE : P.border}`,
      borderRadius: 4,
      marginBottom: 10,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "none", border: "none",
          padding: "14px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: P.text, fontFamily: "'Playfair Display', serif" }}>
            {knot.title}
          </div>
          <div style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {knot.question}
          </div>
        </div>
        <span style={{ fontSize: "14px", color: P.textLight, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px" }}>
          {knot.chain.map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, marginBottom: i < knot.chain.length - 1 ? 0 : 0,
              position: "relative",
            }}>
              {/* Vertical connector line */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                width: 20, flexShrink: 0,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i === knot.chain.length - 1 ? PURPLE : P.border,
                  border: `2px solid ${i === knot.chain.length - 1 ? PURPLE : P.textLight}`,
                  flexShrink: 0,
                  marginTop: 4,
                }} />
                {i < knot.chain.length - 1 && (
                  <div style={{ width: 1.5, flex: 1, background: P.border, minHeight: 20 }} />
                )}
              </div>
              <div style={{ paddingBottom: 14 }}>
                <span style={{
                  fontSize: "10px", fontWeight: 600,
                  color: i === knot.chain.length - 1 ? PURPLE : P.textLight,
                  fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {step.step}
                </span>
                <div style={{
                  fontSize: "12px", color: P.text,
                  fontFamily: "'Playfair Display', serif",
                  lineHeight: 1.6, marginTop: 2,
                  fontWeight: i === knot.chain.length - 1 ? 600 : 400,
                  fontStyle: i === knot.chain.length - 1 ? "italic" : "normal",
                }}>
                  {step.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── What-if scenario ─────────────────────────────────────────────────
function ScenarioCard({ scenario, isOpen, onToggle }) {
  return (
    <div style={{
      background: P.bgCard,
      border: `1px solid ${isOpen ? PURPLE : P.border}`,
      borderRadius: 4,
      marginBottom: 10,
      transition: "border-color 0.15s",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "none", border: "none",
          padding: "14px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 600, color: P.text, fontFamily: "'Playfair Display', serif" }}>
          Scenario: {scenario.trigger}
        </div>
        <span style={{ fontSize: "14px", color: P.textLight, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px" }}>
          {scenario.consequences.map((c, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, padding: "8px 10px",
              background: i % 2 === 0 ? "rgba(28,43,69,0.02)" : "transparent",
              borderRadius: 3,
            }}>
              <span style={{
                fontSize: "13px", flexShrink: 0,
              }}>
                {c.effect === "expanded" ? "+" : c.effect === "reduced" ? "−" : "○"}
              </span>
              <div>
                <span style={{
                  fontSize: "11px", fontWeight: 600,
                  color: EFFECT_COLORS[c.effect],
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {c.area}
                </span>
                <div style={{
                  fontSize: "12px", color: P.text,
                  fontFamily: "'Playfair Display', serif",
                  lineHeight: 1.6, marginTop: 2,
                }}>
                  {c.text}
                </div>
              </div>
            </div>
          ))}
          {scenario.source && (
            <div style={{
              marginTop: 10, padding: "6px 10px",
              fontSize: "10px", color: P.textLight,
              fontFamily: "'DM Mono', monospace",
              borderTop: `1px solid ${P.border}`,
            }}>
              Source: {scenario.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function AsylumImmigration() {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [openKnots, setOpenKnots] = useState({});
  const [openScenarios, setOpenScenarios] = useState({});
  const [decisionsView, setDecisionsView] = useState("volume");
  const [backlogView, setBacklogView] = useState("annual");
  const [activeTab, setActiveTab] = useState("data");
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.all([
      fetch("/data/asylum-framework.json").then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch("/data/asylum-statistics.json").then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).catch(() => null),
    ])
      .then(([framework, statistics]) => { setData(framework); setStats(statistics); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const instrumentMap = useMemo(() => {
    if (!data) return {};
    const m = {};
    data.instruments.forEach((inst) => { m[inst.id] = inst; });
    return m;
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text }}>Asylum & Immigration</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading framework data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text }}>Asylum & Immigration</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load: {error ?? "No data"}</p>
      </div>
    );
  }

  const selected = selectedInstrument ? instrumentMap[selectedInstrument] : null;
  const crossings = data.context.channelCrossings;
  const backlog = data.context.asylumBacklog;
  const fnosInCommunity = data.context.fnosInCommunity;
  const latestCrossing = crossings[crossings.length - 1];
  const latestBacklog = backlog[backlog.length - 1];

  const layers = {
    international: data.instruments.filter((i) => i.type === "international"),
    bilateral: data.instruments.filter((i) => i.type === "bilateral" || i.type === "eu-retained"),
    domestic: data.instruments.filter((i) => i.type === "domestic"),
  };

  const toggleKnot = (id) => {
    track("knot_toggle", { knot: id });
    setOpenKnots((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleScenario = (id) => {
    track("scenario_toggle", { scenario: id });
    setOpenScenarios((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const TABS = [
    { key: "data", label: "Data" },
    { key: "legislation", label: "Legislation" },
  ];

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <DebateHeader
        title="Asylum & Immigration"
        subtitle="Irregular migration to the UK across the English Channel is not a new problem. Before small boat crossings began in 2018, people arrived concealed in lorries and freight trains through the Channel Tunnel. Successive governments have each encountered the same structural constraint: the UK's obligations under international treaties, bilateral agreements, and domestic statutes create interlocking legal commitments that limit the available policy options."
        status="archive"
        updatedDate="March 2025"
      />

      <DebateTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>

      {activeTab === "data" && (
        <>
          {/* ── Headline metrics ─────────────────────────────────────────── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
            <MetricCard label="Channel crossings" value={latestCrossing.value.toLocaleString()} sub={`${latestCrossing.year}`} accent={PURPLE} />
            <MetricCard label="Asylum backlog" value={`~${(latestBacklog.value / 1000).toFixed(0)}k`} sub={`${latestBacklog.year} cases pending`} accent={P.sienna} />
            {stats?.snapshot && <MetricCard label="Grant rate" value={`${stats.snapshot.grantRatePct}%`} sub={`${stats.snapshot.grantRateYear} initial decisions`} accent={P.teal} />}
            {stats?.snapshot && <MetricCard label="Processing time" value={`${stats.snapshot.processingWeeksUK} wks`} sub={`${stats.snapshot.processingWeeksYear} median`} accent={PURPLE} />}
            {stats?.snapshot && <MetricCard label="Accommodation cost" value={`£${(stats.snapshot.accommodationCostMn / 1000).toFixed(1)}bn`} sub={stats.snapshot.accommodationCostYear} accent={P.sienna} />}
            {stats?.snapshot && <MetricCard label="Appeal overturn rate" value={`${stats.snapshot.appealOverturnPct}%`} sub={`${stats.snapshot.appealOverturnYear}`} accent={P.teal} />}
          </div>

          {/* ── Channel Crossings ────────────────────────────────────────── */}
          {stats?.series?.channelCrossings && (
            <ChartCard
              title="Channel Crossings"
              subtitle="UK, small boat arrivals, 2018-2024"
              source={sourceFrom(stats, "channelCrossings")}
              height={240}
            >
              <BarChart data={stats.series.channelCrossings.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString()} />} />
                <Bar dataKey="crossings" name="Crossings" fill={PURPLE} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}

          {/* ── Applications vs Decisions ────────────────────────────────── */}
          {stats?.series?.asylumDecisions && (
            <ChartCard
              title="Asylum Applications and Decisions"
              subtitle="UK, 2001-2024, persons"
              source={sourceFrom(stats, "asylumDecisions")}
              legend={[
                { key: "applications", label: "Applications", color: PURPLE },
                { key: "initialDecisions", label: "Initial decisions", color: P.teal },
                { key: "grants", label: "Grants", color: "#4A7A58" },
              ]}
              height={280}
            >
              <LineChart data={stats.series.asylumDecisions.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString()} />} />
                <Line type="monotone" dataKey="applications" name="Applications" stroke={PURPLE} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="initialDecisions" name="Decisions" stroke={P.teal} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="grants" name="Grants" stroke="#4A7A58" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              </LineChart>
            </ChartCard>
          )}

          {/* ── Grant Rate Over Time ─────────────────────────────────────── */}
          {stats?.series?.asylumDecisions && (
            <ChartCard
              title="Overall Grant Rate"
              subtitle="UK, initial decisions, 2001-2024"
              source={sourceFrom(stats, "asylumDecisions")}
              height={220}
            >
              <AreaChart data={stats.series.asylumDecisions.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                <Area type="monotone" dataKey="grantRatePct" name="Grant rate" stroke={P.teal} fill="rgba(30,107,94,0.12)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ChartCard>
          )}

          {/* ── Grant Rate by Nationality Over Time ──────────────────────── */}
          {stats?.series?.grantRateTimeSeries && (
            <ChartCard
              title="Grant Rates by Nationality"
              subtitle="UK, initial decision grant rate (%), 2019-2024"
              source={sourceFrom(stats, "grantRateTimeSeries")}
              legend={[
                { key: "afghanistan", label: "Afghanistan", color: "#2E5B9E" },
                { key: "syria", label: "Syria", color: "#4A7A58" },
                { key: "iran", label: "Iran", color: PURPLE },
                { key: "albania", label: "Albania", color: P.sienna },
                { key: "eritrea", label: "Eritrea", color: P.teal },
                { key: "iraq", label: "Iraq", color: P.yellow },
              ]}
              height={260}
            >
              <LineChart data={stats.series.grantRateTimeSeries.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                <Line type="monotone" dataKey="afghanistan" name="Afghanistan" stroke="#2E5B9E" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="syria" name="Syria" stroke="#4A7A58" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="iran" name="Iran" stroke={PURPLE} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="albania" name="Albania" stroke={P.sienna} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="eritrea" name="Eritrea" stroke={P.teal} strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="iraq" name="Iraq" stroke={P.yellow} strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} isAnimationActive={false} />
              </LineChart>
            </ChartCard>
          )}

          {/* ── Decisions by Nationality (table) ─────────────────────────── */}
          {data.context.decisionsByNationality && (() => {
            const dbn = data.context.decisionsByNationality;
            const byTotal = [...dbn.data].sort((a, b) => b.decisions - a.decisions);
            const byRate = [...dbn.data].sort((a, b) => b.grantRate - a.grantRate);
            const viewMode = decisionsView;
            return (
              <ChartCard
                title={viewMode === "volume" ? "Asylum Decisions by Nationality" : "Grant Rates by Nationality"}
                subtitle={`Initial decisions, main applicants, ${dbn.year}`}
                source={<>{dbn.source}</>}
                views={["volume", "rate"]}
                viewLabels={{ volume: "Decisions", rate: "Grant rate" }}
                activeView={decisionsView}
                onViewChange={setDecisionsView}
              >
                {viewMode === "volume" ? (
                  <ResponsiveContainer width="100%" height={byTotal.length * 32 + 40}>
                    <BarChart
                      data={byTotal}
                      layout="vertical"
                      margin={{ top: 4, right: 10, bottom: 4, left: isMobile ? 70 : 100 }}
                    >
                      <CartesianGrid {...GRID_PROPS} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <YAxis
                        type="category"
                        dataKey="nationality"
                        tick={{ fontSize: isMobile ? 9 : 10, fill: P.text, fontFamily: "'DM Mono', monospace" }}
                        width={isMobile ? 65 : 95}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} iconSize={8} />
                      <Bar dataKey="grants" name="Granted" stackId="a" fill="#4A7A58" isAnimationActive={false} />
                      <Bar dataKey="refusals" name="Refused" stackId="a" fill="#A83428" isAnimationActive={false} />
                      <Bar dataKey="withdrawn" name="Withdrawn" stackId="a" fill={P.textLight} radius={[0, 2, 2, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr 50px" : "140px 1fr 70px 70px 70px 60px",
                      gap: 4, padding: "0 0 8px", borderBottom: `1px solid ${P.border}`,
                      fontSize: "10px", fontWeight: 600, color: P.textLight,
                      fontFamily: "'DM Mono', monospace", textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      <span>Nationality</span>
                      {!isMobile && <span>Grant rate</span>}
                      {!isMobile && <span style={{ textAlign: "right" }}>Granted</span>}
                      {!isMobile && <span style={{ textAlign: "right" }}>Refused</span>}
                      {!isMobile && <span style={{ textAlign: "right" }}>Withdrawn</span>}
                      <span style={{ textAlign: "right" }}>{isMobile ? "Grant%" : "Rate"}</span>
                    </div>
                    {byRate.map((row) => {
                      const isHighGrant = row.grantRate >= 70;
                      const isLowGrant = row.grantRate <= 10;
                      return (
                        <div key={row.nationality} style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr 50px" : "140px 1fr 70px 70px 70px 60px",
                          gap: 4, padding: "6px 0", borderBottom: `1px solid rgba(28,43,69,0.04)`,
                          alignItems: "center",
                        }}>
                          <span style={{ fontSize: "12px", color: P.text, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{row.nationality}</span>
                          {!isMobile && (
                            <div style={{ position: "relative", height: 14, background: "rgba(28,43,69,0.03)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{
                                position: "absolute", left: 0, top: 0, bottom: 0,
                                width: `${row.grantRate}%`,
                                background: isHighGrant ? "rgba(30,107,94,0.5)" : isLowGrant ? "rgba(168,52,40,0.3)" : "rgba(123,75,138,0.35)",
                                borderRadius: 2, transition: "width 0.3s",
                              }} />
                            </div>
                          )}
                          {!isMobile && <span style={{ fontSize: "11px", color: "#4A7A58", fontFamily: "'DM Mono', monospace", textAlign: "right" }}>{row.grants.toLocaleString()}</span>}
                          {!isMobile && <span style={{ fontSize: "11px", color: "#A83428", fontFamily: "'DM Mono', monospace", textAlign: "right" }}>{row.refusals.toLocaleString()}</span>}
                          {!isMobile && <span style={{ fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", textAlign: "right" }}>{row.withdrawn.toLocaleString()}</span>}
                          <span style={{
                            fontSize: "12px", fontWeight: 600,
                            color: isHighGrant ? "#1E6B5E" : isLowGrant ? "#A83428" : P.text,
                            fontFamily: "'DM Mono', monospace", textAlign: "right",
                          }}>
                            {row.grantRate}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>
            );
          })()}

          {/* ── Global Displacement Context ────────────────────────────── */}
          {stats?.series?.globalDisplacement && (
            <ChartCard
              title="Global Forced Displacement"
              subtitle="Worldwide, millions of people, 2001-2024"
              source={sourceFrom(stats, "globalDisplacement")}
              legend={[
                { key: "displacedMn", label: "Total forcibly displaced", color: PURPLE },
                { key: "refugeesMn", label: "Refugees (UNHCR mandate)", color: P.teal },
              ]}
              height={260}
            >
              <AreaChart data={stats.series.globalDisplacement.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${v}m`} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}m`} />} />
                <Area type="monotone" dataKey="displacedMn" name="Total displaced" stroke={PURPLE} fill="rgba(123,75,138,0.15)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="refugeesMn" name="Refugees" stroke={P.teal} fill="rgba(30,107,94,0.15)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ChartCard>
          )}

          {/* ── Conflict vs Non-Conflict Origin ──────────────────────────── */}
          {stats?.series?.conflictVsNonConflict && (
            <ChartCard
              title="UK Asylum Applications: Conflict vs Non-Conflict Origin"
              subtitle="UK, 2004-2024, persons (conflict = nationalities with >70% grant rate)"
              source={sourceFrom(stats, "conflictVsNonConflict")}
              legend={[
                { key: "conflictOrigin", label: "Conflict-origin", color: P.sienna },
                { key: "nonConflictOrigin", label: "Non-conflict origin", color: P.textLight },
              ]}
              height={260}
            >
              <AreaChart data={stats.series.conflictVsNonConflict.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString()} />} />
                <Area type="monotone" dataKey="conflictOrigin" name="Conflict-origin" stackId="a" stroke={P.sienna} fill="rgba(184,115,51,0.3)" strokeWidth={1.5} isAnimationActive={false} />
                <Area type="monotone" dataKey="nonConflictOrigin" name="Non-conflict origin" stackId="a" stroke={P.textLight} fill="rgba(139,155,176,0.2)" strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ChartCard>
          )}

          {/* ── Asylum Backlog ───────────────────────────────────────────── */}
          {stats?.series?.asylumBacklog && (
            <ChartCard
              title="Asylum Backlog"
              subtitle={`UK, cases awaiting initial decision, ${backlogView === "annual" ? "2010-2024" : "quarterly 2019-2024"}`}
              source={sourceFrom(stats, "asylumBacklog")}
              views={["annual", "quarterly"]}
              viewLabels={{ annual: "Annual", quarterly: "Quarterly" }}
              activeView={backlogView}
              onViewChange={setBacklogView}
              height={240}
            >
              {backlogView === "annual" ? (
                <AreaChart data={stats.series.asylumBacklog.data}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
                  <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v.toLocaleString()} cases`} />} />
                  <Area type="monotone" dataKey="pending" name="Pending cases" stroke={P.sienna} fill="rgba(184,115,51,0.15)" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                </AreaChart>
              ) : (
                <AreaChart data={stats.series.asylumBacklogQuarterly.data}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="quarter" tick={AXIS_TICK} tickFormatter={(v) => v.slice(0, 4)} interval={isMobile ? 7 : 3} />
                  <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v.toLocaleString()} cases`} />} />
                  <Area type="monotone" dataKey="pending" name="Pending cases" stroke={P.sienna} fill="rgba(184,115,51,0.15)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </AreaChart>
              )}
            </ChartCard>
          )}

          {/* ── Returns and Removals ─────────────────────────────────────── */}
          {stats?.series?.returns && (
            <ChartCard
              title="Returns and Removals"
              subtitle="UK, 2004-2024, persons"
              source={sourceFrom(stats, "returns")}
              legend={[
                { key: "enforced", label: "Enforced", color: P.sienna },
                { key: "voluntary", label: "Voluntary", color: P.teal },
              ]}
              height={260}
            >
              <AreaChart data={stats.series.returns.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString()} />} />
                <ReferenceLine x={2020} stroke={P.grey} strokeDasharray="4 4" label={{ value: "COVID", fontSize: 9, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
                <Area type="monotone" dataKey="enforced" name="Enforced" stackId="a" stroke={P.sienna} fill="rgba(184,115,51,0.25)" strokeWidth={1.5} isAnimationActive={false} />
                <Area type="monotone" dataKey="voluntary" name="Voluntary" stackId="a" stroke={P.teal} fill="rgba(30,107,94,0.2)" strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ChartCard>
          )}

          {/* ── Foreign National Offenders ─────────────────────────────── */}
          {(() => {
            const fnoChart = fnosInCommunity.map(d => ({
              year: d.year,
              criteria: d.broader ? undefined : d.value,
              broader: d.broader ? d.value : undefined,
            }));
            const last = fnosInCommunity.find(d => d.year === 2022);
            if (last) {
              const idx = fnoChart.findIndex(d => d.year === 2022);
              if (idx !== -1) fnoChart[idx].broader = last.value;
            }
            return (
              <ChartCard
                title="Foreign National Offenders in the Community"
                subtitle="UK, FNOs not removable, by year"
                source={<>Home Office Immigration Enforcement transparency data</>}
                legend={[
                  { key: "criteria", label: "Criteria (12+ month sentence)", color: "#A83428" },
                  { key: "broader", label: "Broader measure (from 2022)", color: "#A83428" },
                ]}
                height={220}
              >
                <LineChart data={fnoChart}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" tick={AXIS_TICK} />
                  <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="criteria" name="Criteria only" stroke="#A83428" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="broader" name="Broader measure" stroke="#A83428" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ChartCard>
            );
          })()}

          {/* ── Dublin III Transfers ──────────────────────────────────────── */}
          {stats?.series?.dublinTransfers && (
            <ChartCard
              title="Dublin III Transfers"
              subtitle="UK, persons transferred to/from EU states, 2015-2020 (ceased at Brexit)"
              source={sourceFrom(stats, "dublinTransfers")}
              legend={[
                { key: "outgoing", label: "UK → EU (outgoing)", color: P.sienna },
                { key: "incoming", label: "EU → UK (incoming)", color: P.teal },
              ]}
              height={220}
            >
              <BarChart data={stats.series.dublinTransfers.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} width={32} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} persons`} />} />
                <Bar dataKey="outgoing" name="UK → EU" fill={P.sienna} isAnimationActive={false} />
                <Bar dataKey="incoming" name="EU → UK" fill={P.teal} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}

          {/* ── Appeals ──────────────────────────────────────────────────── */}
          {stats?.series?.asylumAppeals && (
            <ChartCard
              title="Asylum Appeals"
              subtitle="UK, First-tier Tribunal, 2014-2024"
              source={sourceFrom(stats, "asylumAppeals")}
              legend={[
                { key: "allowed", label: "Allowed (overturned)", color: P.teal },
                { key: "dismissed", label: "Dismissed", color: P.sienna },
                { key: "overturnPct", label: "Overturn rate %", color: PURPLE },
              ]}
              height={260}
            >
              <ComposedChart data={stats.series.asylumAppeals.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="allowed" name="Allowed" stackId="a" fill="rgba(30,107,94,0.6)" isAnimationActive={false} />
                <Bar yAxisId="left" dataKey="dismissed" name="Dismissed" stackId="a" fill="rgba(184,115,51,0.5)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="overturnPct" name="Overturn rate" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            </ChartCard>
          )}

          {/* ── International Comparison ──────────────────────────────────── */}
          {stats?.series?.internationalComparison && (
            <ChartCard
              title="Asylum Applications per 100,000 Population"
              subtitle="Selected European countries, 2015-2023"
              source={sourceFrom(stats, "internationalComparison")}
              legend={[
                { key: "uk", label: "UK", color: PURPLE },
                { key: "germany", label: "Germany", color: "#2E5B9E" },
                { key: "france", label: "France", color: P.teal },
                { key: "sweden", label: "Sweden", color: P.yellow },
                { key: "italy", label: "Italy", color: P.sienna },
              ]}
              height={280}
            >
              <LineChart data={stats.series.internationalComparison.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} width={40} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} per 100k`} />} />
                <Line type="monotone" dataKey="uk" name="UK" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="germany" name="Germany" stroke="#2E5B9E" strokeWidth={1.5} dot={{ r: 2 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="france" name="France" stroke={P.teal} strokeWidth={1.5} dot={{ r: 2 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="sweden" name="Sweden" stroke={P.yellow} strokeWidth={1.5} dot={{ r: 2 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="italy" name="Italy" stroke={P.sienna} strokeWidth={1.5} dot={{ r: 2 }} isAnimationActive={false} />
              </LineChart>
            </ChartCard>
          )}

          {/* ── Accommodation Costs ──────────────────────────────────────── */}
          {stats?.series?.accommodationCosts && (
            <ChartCard
              title="Asylum Accommodation Costs"
              subtitle="UK, £ millions, by financial year"
              source={sourceFrom(stats, "accommodationCosts")}
              height={240}
            >
              <BarChart data={stats.series.accommodationCosts.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} tickFormatter={(v) => v.slice(0, 4)} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `£${(v / 1000).toFixed(1)}bn` : `£${v}m`} width={48} />
                <Tooltip content={<CustomTooltip formatter={(v) => `£${v}m`} />} />
                <Bar dataKey="costMnGBP" name="Total cost" fill={P.sienna} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}

          {/* ── Processing Times ─────────────────────────────────────────── */}
          {stats?.series?.processingTimes && (
            <ChartCard
              title="Asylum Processing Times"
              subtitle="UK, median weeks to initial decision, 2014-2024"
              source={sourceFrom(stats, "processingTimes")}
              height={220}
            >
              <LineChart data={stats.series.processingTimes.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => `${v}w`} width={32} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} weeks`} />} />
                <Line type="monotone" dataKey="medianWeeksUK" name="Median weeks" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ChartCard>
          )}

          {/* ── Irregular Routes Comparison ───────────────────────────────── */}
          {stats?.series?.irregularRoutes && (
            <ChartCard
              title="Irregular Migration by Route"
              subtitle="UK, estimated persons, 2019-2024"
              source={sourceFrom(stats, "irregularRoutes")}
              legend={[
                { key: "channelCrossings", label: "Channel crossings", color: PURPLE },
                { key: "estimatedOverstayers", label: "Visa overstayers (est.)", color: P.teal },
                { key: "lorryDetections", label: "Lorry detections", color: P.textLight },
              ]}
              height={260}
            >
              <BarChart data={stats.series.irregularRoutes.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString()} />} />
                <Bar dataKey="channelCrossings" name="Channel crossings" fill={PURPLE} isAnimationActive={false} />
                <Bar dataKey="estimatedOverstayers" name="Visa overstayers" fill={P.teal} isAnimationActive={false} />
                <Bar dataKey="lorryDetections" name="Lorry detections" fill={P.textLight} isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}

          {/* ── Caseworker Staffing vs Backlog ───────────────────────────── */}
          {stats?.series?.caseworkerStaffing && (
            <ChartCard
              title="Caseworker Staffing"
              subtitle="UK, full-time equivalent asylum decision-makers, 2018-2024"
              source={sourceFrom(stats, "caseworkerStaffing")}
              height={220}
            >
              <BarChart data={stats.series.caseworkerStaffing.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v.toLocaleString()} FTE`} />} />
                <Bar dataKey="fte" name="Decision-makers (FTE)" fill={P.teal} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}

          {/* ── Resettlement Schemes ─────────────────────────────────────── */}
          {stats?.series?.resettlement && (
            <ChartCard
              title="Resettlement via Safe/Legal Routes"
              subtitle="UK, persons, 2014-2024"
              source={sourceFrom(stats, "resettlement")}
              height={240}
            >
              <BarChart data={stats.series.resettlement.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={32} />
                <Tooltip content={<CustomTooltip formatter={(v) => v !== null ? v.toLocaleString() : "N/A"} />} />
                <Bar dataKey="total" name="Total resettled" fill="#4A7A58" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartCard>
          )}


          {/* ── Detention ────────────────────────────────────────────────── */}
          {stats?.series?.detention && (
            <ChartCard
              title="Immigration Detention"
              subtitle="UK, persons entering detention and year-end population, 2010-2024"
              source={sourceFrom(stats, "detention")}
              legend={[
                { key: "entering", label: "Entering detention", color: PURPLE },
                { key: "population", label: "Detained (year-end)", color: P.sienna },
              ]}
              height={240}
            >
              <ComposedChart data={stats.series.detention.data}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={36} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={36} />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString()} />} />
                <Bar yAxisId="left" dataKey="entering" name="Entering detention" fill={PURPLE} opacity={0.6} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="population" name="Population (year-end)" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            </ChartCard>
          )}
        </>
      )}

      {activeTab === "legislation" && (
        <>
      {/* ── Legal Framework ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>The Legal Framework</h3>
        <p style={SECTION_NOTE}>
          How the instruments connect. Click any instrument below to see its key provisions
          and how it constrains policy.
          Colour indicates type: <span style={{ color: TYPE_COLORS.international, fontWeight: 600 }}>international treaty</span>,{" "}
          <span style={{ color: TYPE_COLORS.bilateral, fontWeight: 600 }}>bilateral agreement</span>,{" "}
          <span style={{ color: TYPE_COLORS.domestic, fontWeight: 600 }}>domestic statute</span>,{" "}
          <span style={{ color: TYPE_COLORS["eu-retained"], fontWeight: 600 }}>lost at Brexit</span>.
          Struck-through instruments are no longer operative.
        </p>

        {/* Layer: International */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "10px", color: TYPE_COLORS.international, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            International treaties
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8 }}>
            {layers.international.map((inst) => (
              <InstrumentNode
                key={inst.id}
                instrument={inst}
                isSelected={selectedInstrument === inst.id}
                onClick={() => {
                  track("instrument_select", { instrument: inst.short });
                  setSelectedInstrument(selectedInstrument === inst.id ? null : inst.id);
                }}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>

        {/* Layer: Bilateral */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "10px", color: TYPE_COLORS.bilateral, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Bilateral & EU framework
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {layers.bilateral.map((inst) => (
              <InstrumentNode
                key={inst.id}
                instrument={inst}
                isSelected={selectedInstrument === inst.id}
                onClick={() => {
                  track("instrument_select", { instrument: inst.short });
                  setSelectedInstrument(selectedInstrument === inst.id ? null : inst.id);
                }}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>

        {/* Layer: Domestic */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "10px", color: TYPE_COLORS.domestic, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Domestic statutes
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {layers.domestic.map((inst) => (
              <InstrumentNode
                key={inst.id}
                instrument={inst}
                isSelected={selectedInstrument === inst.id}
                onClick={() => {
                  track("instrument_select", { instrument: inst.short });
                  setSelectedInstrument(selectedInstrument === inst.id ? null : inst.id);
                }}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && <InstrumentDetail instrument={selected} />}
      </section>

      {/* ── The Knots ────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Dependencies</h3>
        <p style={SECTION_NOTE}>
          Six areas where legal instruments interact to constrain policy options.
          Each traces a dependency chain showing how provisions in one instrument
          affect the scope of action under another.
        </p>
        {data.knots.map((knot) => (
          <KnotCard
            key={knot.id}
            knot={knot}
            isOpen={!!openKnots[knot.id]}
            onToggle={() => toggleKnot(knot.id)}
          />
        ))}
      </section>

      {/* ── What If scenarios ────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Scenarios</h3>
        <p style={SECTION_NOTE}>
          Structured trade-off analysis for potential changes to the framework.
          Blue marks expanded government scope, orange marks reduced capability, grey marks uncertain outcomes.
        </p>
        {data.scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            isOpen={!!openScenarios[scenario.id]}
            onToggle={() => toggleScenario(scenario.id)}
          />
        ))}
      </section>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Timeline</h3>
        <p style={SECTION_NOTE}>
          How the legal framework evolved, from the post-war conventions to the
          post-Brexit scramble.
        </p>
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 9, top: 4, bottom: 4, width: 1.5, background: P.border }} />
          {data.timeline.map((evt, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, position: "relative" }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: evt.year >= 2020 ? PURPLE : P.textLight,
                border: `2px solid ${evt.year >= 2020 ? PURPLE : P.textLight}`,
                flexShrink: 0,
                marginTop: 3,
                position: "absolute",
                left: -19,
              }} />
              <div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: evt.year >= 2020 ? PURPLE : P.textLight, fontFamily: "'DM Mono', monospace" }}>
                  {evt.year}
                </span>
                <div style={{ fontSize: "12px", color: P.text, fontFamily: "'Playfair Display', serif", lineHeight: 1.6, marginTop: 1 }}>
                  {evt.event}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wiring diagram ── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>How the Instruments Connect</h3>
        <p style={SECTION_NOTE}>
          International treaties on the left, domestic statutes in the centre, bilateral
          and EU instruments on the right. Lines show legal dependencies between instruments.
          Click any node to highlight its connections.
        </p>
        {(() => {
          const NODE_W = isMobile ? 80 : 125;
          const NODE_H = 28;
          const COL_GAP = isMobile ? 14 : 50;
          const ROW_GAP = isMobile ? 44 : 50;
          const PAD_X = isMobile ? 8 : 20;
          const PAD_Y = 30;

          const colX = {
            left: PAD_X,
            centre: PAD_X + NODE_W + COL_GAP,
            right: PAD_X + (NODE_W + COL_GAP) * 2,
          };

          const positions = {
            "refugee-convention": { x: colX.left,   y: PAD_Y },
            "echr":               { x: colX.left,   y: PAD_Y + (NODE_H + ROW_GAP) },
            "council-of-europe":  { x: colX.left,   y: PAD_Y + (NODE_H + ROW_GAP) * 2 },

            "hra":                { x: colX.centre,  y: PAD_Y },
            "nationality-borders":{ x: colX.centre,  y: PAD_Y + (NODE_H + ROW_GAP) },
            "illegal-migration":  { x: colX.centre,  y: PAD_Y + (NODE_H + ROW_GAP) * 2 },
            "rwanda-act":         { x: colX.centre,  y: PAD_Y + (NODE_H + ROW_GAP) * 3 },
            "bsai-act":           { x: colX.centre,  y: PAD_Y + (NODE_H + ROW_GAP) * 4 },
            "modern-slavery":     { x: colX.centre,  y: PAD_Y + (NODE_H + ROW_GAP) * 5 },

            "tca":                { x: colX.right,   y: PAD_Y },
            "dublin-iii":         { x: colX.right,   y: PAD_Y + (NODE_H + ROW_GAP) },
          };

          const W = colX.right + NODE_W + PAD_X;
          const SVG_H = PAD_Y + (NODE_H + ROW_GAP) * 5 + NODE_H + 20;

          const colLabels = [
            { label: "INTERNATIONAL", x: colX.left + NODE_W / 2, color: TYPE_COLORS.international },
            { label: "DOMESTIC", x: colX.centre + NODE_W / 2, color: TYPE_COLORS.domestic },
            { label: "BILATERAL / EU", x: colX.right + NODE_W / 2, color: TYPE_COLORS.bilateral },
          ];

          const edgeSet = new Set();
          const edges = [];
          data.instruments.forEach(inst => {
            (inst.connections || []).forEach(target => {
              if (!positions[target]) return;
              const key = [inst.id, target].sort().join("|");
              if (!edgeSet.has(key)) {
                edgeSet.add(key);
                edges.push({ from: inst.id, to: target });
              }
            });
          });

          const getColor = (id) => {
            const inst = instrumentMap[id];
            if (!inst) return P.textLight;
            return TYPE_COLORS[inst.type] || P.textLight;
          };

          const isDead = (id) => {
            const inst = instrumentMap[id];
            return inst && (inst.status === "dead-letter" || inst.status === "lost-brexit" || inst.status === "repealed");
          };

          const edgePath = (x1, y1, x2, y2) => {
            const dx = Math.abs(x2 - x1);
            if (dx < NODE_W * 0.5) return `M${x1},${y1} L${x2},${y2}`;
            const midY = (y1 + y2) / 2;
            return `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
          };

          return (
            <ShareableChart title="Asylum & Immigration Legal Framework">
            <div style={{
              background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4,
              padding: isMobile ? "12px 4px" : "18px 22px 14px",
              overflowX: "auto",
            }}>
              <div style={{ marginBottom: 10, padding: isMobile ? "0 8px" : 0 }}>
                <div style={CHART_TITLE}>Legal Framework</div>
                <div style={CHART_SUBTITLE}>How international, domestic, and bilateral instruments connect</div>
              </div>
              <svg width={W} height={SVG_H} style={{ display: "block", margin: "0 auto" }}>
                {colLabels.map(c => (
                  <text key={c.label} x={c.x} y={14} textAnchor="middle" fill={c.color}
                    fontSize={isMobile ? "7" : "8"} fontFamily="'DM Mono', monospace"
                    fontWeight="600" letterSpacing="0.1em" opacity="0.5">
                    {c.label}
                  </text>
                ))}

                {edges.map(({ from, to }, i) => {
                  const p1 = positions[from];
                  const p2 = positions[to];
                  if (!p1 || !p2) return null;
                  const x1 = p1.x + NODE_W / 2;
                  const y1 = p1.y + NODE_H / 2;
                  const x2 = p2.x + NODE_W / 2;
                  const y2 = p2.y + NODE_H / 2;
                  const isDeadEdge = isDead(from) || isDead(to);
                  const isHighlighted = selectedInstrument && (from === selectedInstrument || to === selectedInstrument);
                  return (
                    <path
                      key={i}
                      d={edgePath(x1, y1, x2, y2)}
                      fill="none"
                      stroke={isHighlighted ? PURPLE : P.border}
                      strokeWidth={isHighlighted ? 1.5 : 0.8}
                      strokeDasharray={isDeadEdge ? "4 3" : "none"}
                      opacity={selectedInstrument ? (isHighlighted ? 1 : 0.15) : 0.4}
                      style={{ transition: "all 0.2s" }}
                    />
                  );
                })}

                {data.instruments.map(inst => {
                  const pos = positions[inst.id];
                  if (!pos) return null;
                  const col = getColor(inst.id);
                  const dead = isDead(inst.id);
                  const isSelected = selectedInstrument === inst.id;
                  const isConnected = selectedInstrument && instrumentMap[selectedInstrument]?.connections?.includes(inst.id);
                  const dimmed = selectedInstrument && !isSelected && !isConnected;
                  return (
                    <g key={inst.id}
                      onClick={() => {
                        track("instrument_select", { instrument: inst.short });
                        setSelectedInstrument(selectedInstrument === inst.id ? null : inst.id);
                      }}
                      style={{ cursor: "pointer" }}
                      opacity={dimmed ? 0.2 : (dead ? 0.5 : 1)}
                    >
                      <rect
                        x={pos.x} y={pos.y}
                        width={NODE_W} height={NODE_H}
                        rx={3}
                        fill={isSelected ? "rgba(123,75,138,0.12)" : P.bgCard}
                        stroke={isSelected ? PURPLE : col}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={pos.x + NODE_W / 2} y={pos.y + NODE_H / 2 + 1}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={P.text}
                        fontSize={isMobile ? "7.5" : "10"}
                        fontFamily="'DM Mono', monospace"
                        fontWeight={isSelected ? 600 : 400}
                        textDecoration={dead ? "line-through" : "none"}
                      >
                        {inst.short}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            </ShareableChart>
          );
        })()}
      </section>
        </>
      )}

      </DebateTabs>

      {/* ── Sources ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 24, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        <a href="https://www.legislation.gov.uk/ukpga/1998/42" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>Human Rights Act 1998</a>
        {" · "}
        <a href="https://www.legislation.gov.uk/ukpga/2022/36" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>Nationality and Borders Act 2022</a>
        {" · "}
        <a href="https://www.legislation.gov.uk/ukpga/2023/37" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>Illegal Migration Act 2023</a>
        {" · "}
        <a href="https://www.legislation.gov.uk/ukpga/2024/8" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>Safety of Rwanda Act 2024</a>
        {" · "}
        <a href="https://assets.publishing.service.gov.uk/media/608e97bfd3bf7f013e12d323/TS_8.2021__UK_EU_TCA.pdf" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>UK-EU TCA (full text)</a>
        {" · "}
        <a href="https://www.unhcr.org/media/convention-and-protocol-relating-status-refugees" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>1951 Refugee Convention</a>
        {" · "}
        <a href="https://www.gov.uk/government/statistics/irregular-migration-to-the-uk-year-ending-december-2024" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>Home Office irregular migration statistics</a>
      </div>
    </div>
  );
}
