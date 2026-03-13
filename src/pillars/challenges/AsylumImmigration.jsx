import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import P from "../../theme/palette";
import useIsMobile from "../../hooks/useIsMobile";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import { track } from "../../analytics";

const PURPLE = "#7B4B8A";

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
          fontSize: "9px",
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
        <span style={{ fontSize: "9px", color: col, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>
          {TYPE_LABELS[instrument.type]} · {instrument.year}
        </span>
      </div>
      <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'Playfair Display', serif", lineHeight: 1.7, margin: "0 0 14px" }}>
        {instrument.summary}
      </p>

      {instrument.keyArticles?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "9px", color: PURPLE, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
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
                fontSize: "10px", fontWeight: 600, color: col,
                fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 70,
              }}>
                {art.ref}
              </span>
              <span style={{ fontSize: "10px", color: P.text, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
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
        <div style={{ fontSize: "9px", color: PURPLE, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Constraint
        </div>
        <div style={{ fontSize: "11px", color: P.text, fontFamily: "'Playfair Display', serif", lineHeight: 1.7 }}>
          {instrument.constraints}
        </div>
      </div>

      {instrument.legislationRef && (
        <div style={{ marginTop: 10, fontSize: "9px", fontFamily: "'DM Mono', monospace" }}>
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
          <div style={{ fontSize: "11px", color: P.textMuted, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
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
                  fontSize: "9px", fontWeight: 600,
                  color: i === knot.chain.length - 1 ? PURPLE : P.textLight,
                  fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {step.step}
                </span>
                <div style={{
                  fontSize: "11px", color: P.text,
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
                fontSize: "12px", flexShrink: 0,
              }}>
                {c.effect === "expanded" ? "+" : c.effect === "reduced" ? "−" : "○"}
              </span>
              <div>
                <span style={{
                  fontSize: "10px", fontWeight: 600,
                  color: EFFECT_COLORS[c.effect],
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {c.area}
                </span>
                <div style={{
                  fontSize: "11px", color: P.text,
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
              fontSize: "9px", color: P.textLight,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [openKnots, setOpenKnots] = useState({});
  const [openScenarios, setOpenScenarios] = useState({});
  const [decisionsView, setDecisionsView] = useState("volume");
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/data/asylum-framework.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
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
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading framework data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text }}>Asylum & Immigration</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load: {error ?? "No data"}</p>
      </div>
    );
  }

  const selected = selectedInstrument ? instrumentMap[selectedInstrument] : null;
  const crossings = data.context.channelCrossings;
  const backlog = data.context.asylumBacklog;
  const dublinReturns = data.context.dublinReturns;
  const fnosInCommunity = data.context.fnosInCommunity;
  const latestCrossing = crossings[crossings.length - 1];
  const latestBacklog = backlog[backlog.length - 1];
  const peakDublin = Math.max(...dublinReturns.map((d) => d.value));
  const latestFno = fnosInCommunity[fnosInCommunity.length - 1];

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

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Asylum & Immigration
      </h2>
      <p style={{ ...sectionNote, margin: "0 0 10px" }}>
        Irregular migration to the UK across the English Channel is not a new problem.
        Before small boat crossings began in 2018, people arrived concealed in lorries
        and freight trains through the Channel Tunnel, a route that prompted the closure
        of the Sangatte refugee camp in 2002 and the construction of security fencing
        at Calais and Coquelles. The shift to small boats changed the mode of arrival,
        not the underlying dynamic.
      </p>
      <p style={{ ...sectionNote, margin: "0 0 10px" }}>
        Successive governments, Labour, Coalition, Conservative, and Labour again, have
        each attempted to reduce irregular crossings and accelerate asylum processing.
        The same legal framework also prevents the deportation of foreign nationals
        convicted of serious criminal offences, including violent and sexual crimes,
        where conditions in their home country or their family ties in the UK engage
        Convention rights. As of 2024, approximately 11,000 foreign national offenders
        cannot be removed from the UK.
      </p>
      <p style={{ ...sectionNote, margin: "0 0 10px" }}>
        Each government has encountered the same structural constraint: the UK's
        obligations under international treaties, bilateral agreements, and domestic
        statutes create interlocking legal commitments that limit the available policy
        options. Changing one instrument often has consequences for others.
        A common assumption is that refugees must claim asylum in the first safe
        country they enter. The 1951 Refugee Convention contains no such requirement,
        and UK courts have interpreted its protections to cover refugees who transit
        through intermediate countries.
      </p>
      <p style={{ ...sectionNote, margin: "0 0 24px" }}>
        This page maps those instruments, their key provisions, and the trade-offs
        involved in changing them.
      </p>

      {/* ── Context metrics ──────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Channel crossings" value={latestCrossing.value.toLocaleString()} sub={`${latestCrossing.year}`} />
        <MetricCard label="Asylum backlog" value={`~${(latestBacklog.value / 1000).toFixed(0)}k`} sub={`${latestBacklog.year} cases pending`} />
        <MetricCard label="Peak Dublin returns" value={peakDublin.toLocaleString()} sub="2016 · highest annual total" />
        <MetricCard label="FNOs not removable" value="~11,000" sub="Foreign national offenders (2024)" />
      </div>

      {/* ── Channel crossings + backlog charts ───────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>The Scale</h3>
        <p style={sectionNote}>
          Channel crossings, asylum backlog, foreign national offenders in the community,
          and Dublin III returns. Charts are on independent scales.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4, padding: "16px 18px" }}>
            <div style={{ fontSize: "10px", color: PURPLE, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Channel crossings by year
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={crossings}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} />
                <YAxis tick={{ fontSize: 9, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={32} />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString()} />} />
                <Bar dataKey="value" name="Crossings" fill={PURPLE} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4, padding: "16px 18px" }}>
            <div style={{ fontSize: "10px", color: P.sienna, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Asylum backlog (cases pending)
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={backlog}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} />
                <YAxis tick={{ fontSize: 9, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={32} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${(v / 1000).toFixed(0)}k cases`} />} />
                <Line type="monotone" dataKey="value" name="Backlog" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {(() => {
            const fnoChart = fnosInCommunity.map(d => ({
              year: d.year,
              criteria: d.broader ? undefined : d.value,
              broader: d.broader ? d.value : undefined,
            }));
            // Add a bridge point so the lines connect: repeat 2022's value as the start of the broader series
            const last = fnosInCommunity.find(d => d.year === 2022);
            if (last) {
              const idx = fnoChart.findIndex(d => d.year === 2022);
              if (idx !== -1) fnoChart[idx].broader = last.value;
            }
            return (
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4, padding: "16px 18px" }}>
                <div style={{ fontSize: "10px", color: P.red || "#A83428", fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  FNOs in the community
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={fnoChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} />
                    <YAxis tick={{ fontSize: 9, fill: P.textMuted }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={32} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="criteria" name="Criteria only" stroke={P.red || "#A83428"} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="broader" name="Broader measure" stroke={P.red || "#A83428"} strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginTop: 6, lineHeight: 1.5 }}>
                  Solid: criteria cases only (12+ month sentence). Dashed: broader measure (criteria + non-criteria, from 2022). Source: Home Office Immigration Enforcement transparency data, Q2 snapshots.
                </div>
              </div>
            );
          })()}
          <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4, padding: "16px 18px" }}>
            <div style={{ fontSize: "10px", color: P.textLight, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Dublin III returns (actual)
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dublinReturns}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} />
                <YAxis tick={{ fontSize: 9, fill: P.textMuted }} width={32} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} people`} />} />
                <Bar dataKey="value" name="Dublin returns" fill={P.textLight} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Decisions by nationality ─────────────────────────────────── */}
      {data.context.decisionsByNationality && (() => {
        const dbn = data.context.decisionsByNationality;
        const byTotal = [...dbn.data].sort((a, b) => b.decisions - a.decisions);
        const byRate = [...dbn.data].sort((a, b) => b.grantRate - a.grantRate);
        const viewMode = decisionsView;
        return (
          <section style={{ marginBottom: 48 }}>
            <h3 style={sectionHeading}>Initial Decisions by Nationality</h3>
            <p style={sectionNote}>
              {viewMode === "volume"
                ? "Total initial decisions by nationality, broken down by outcome. Countries with the highest claim volumes are not necessarily those with the highest grant rates."
                : "Grant rates at initial decision vary from under 3% to over 98% depending on the applicant's country of origin. Grant rate is calculated as grants divided by decided cases (excluding withdrawn). Countries with the highest grant rates (Afghanistan, Eritrea, Sudan, Syria) are the same countries where ECHR Article 3 prevents deportation of refused claimants, because conditions in those countries engage the absolute prohibition on return to torture or inhuman treatment."
              } Data: {dbn.year}, main applicants.
            </p>

            {/* Toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
              {[["volume", "Decisions"], ["rate", "Grant rate"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDecisionsView(key)}
                  style={{
                    background: viewMode === key ? PURPLE : "transparent",
                    color: viewMode === key ? "#fff" : P.textMuted,
                    border: `1px solid ${viewMode === key ? PURPLE : P.border}`,
                    padding: "5px 14px",
                    fontSize: "10px",
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderRadius: key === "volume" ? "3px 0 0 3px" : "0 3px 3px 0",
                    marginLeft: key === "rate" ? -1 : 0,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {viewMode === "volume" ? (
              /* ── Stacked bar chart: raw numbers ── */
              <div style={{
                background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4,
                padding: isMobile ? "14px 10px" : "18px 22px",
              }}>
                <ResponsiveContainer width="100%" height={byTotal.length * 32 + 40}>
                  <BarChart
                    data={byTotal}
                    layout="vertical"
                    margin={{ top: 4, right: 10, bottom: 4, left: isMobile ? 70 : 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 9, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <YAxis
                      type="category"
                      dataKey="nationality"
                      tick={{ fontSize: isMobile ? 9 : 10, fill: P.text, fontFamily: "'DM Mono', monospace" }}
                      width={isMobile ? 65 : 95}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", fontFamily: "'DM Mono', monospace" }}
                      iconSize={8}
                    />
                    <Bar dataKey="grants" name="Granted" stackId="a" fill="#4A7A58" isAnimationActive={false} />
                    <Bar dataKey="refusals" name="Refused" stackId="a" fill={P.red || "#A83428"} isAnimationActive={false} />
                    <Bar dataKey="withdrawn" name="Withdrawn" stackId="a" fill={P.textLight} radius={[0, 2, 2, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{
                  marginTop: 10, fontSize: "9px", color: P.textLight,
                  fontFamily: "'DM Mono', monospace", lineHeight: 1.6,
                }}>
                  Source: {dbn.source}
                </div>
              </div>
            ) : (
              /* ── Grant rate table (existing) ── */
              <div style={{
                background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4,
                padding: isMobile ? "14px 10px" : "18px 22px",
              }}>
                {/* Header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr 50px" : "140px 1fr 70px 70px 70px 60px",
                  gap: 4, padding: "0 0 8px", borderBottom: `1px solid ${P.border}`,
                  fontSize: "9px", fontWeight: 600, color: P.textLight,
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
                {/* Rows */}
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
                      <span style={{
                        fontSize: "11px", color: P.text,
                        fontFamily: "'DM Mono', monospace", fontWeight: 500,
                      }}>
                        {row.nationality}
                      </span>
                      {!isMobile && (
                        <div style={{ position: "relative", height: 14, background: "rgba(28,43,69,0.03)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{
                            position: "absolute", left: 0, top: 0, bottom: 0,
                            width: `${row.grantRate}%`,
                            background: isHighGrant ? "rgba(30,107,94,0.5)" : isLowGrant ? "rgba(168,52,40,0.3)" : "rgba(123,75,138,0.35)",
                            borderRadius: 2,
                            transition: "width 0.3s",
                          }} />
                        </div>
                      )}
                      {!isMobile && (
                        <span style={{ fontSize: "10px", color: "#4A7A58", fontFamily: "'DM Mono', monospace", textAlign: "right" }}>
                          {row.grants.toLocaleString()}
                        </span>
                      )}
                      {!isMobile && (
                        <span style={{ fontSize: "10px", color: P.red, fontFamily: "'DM Mono', monospace", textAlign: "right" }}>
                          {row.refusals.toLocaleString()}
                        </span>
                      )}
                      {!isMobile && (
                        <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", textAlign: "right" }}>
                          {row.withdrawn.toLocaleString()}
                        </span>
                      )}
                      <span style={{
                        fontSize: "11px", fontWeight: 600,
                        color: isHighGrant ? "#1E6B5E" : isLowGrant ? P.red : P.text,
                        fontFamily: "'DM Mono', monospace", textAlign: "right",
                      }}>
                        {row.grantRate}%
                      </span>
                    </div>
                  );
                })}
                <div style={{
                  marginTop: 10, fontSize: "9px", color: P.textLight,
                  fontFamily: "'DM Mono', monospace", lineHeight: 1.6,
                }}>
                  Source: {dbn.source}
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* ── Legal Framework ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>The Legal Framework</h3>
        <p style={sectionNote}>
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
          <div style={{ fontSize: "9px", color: TYPE_COLORS.international, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
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
          <div style={{ fontSize: "9px", color: TYPE_COLORS.bilateral, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
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
          <div style={{ fontSize: "9px", color: TYPE_COLORS.domestic, fontWeight: 600, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
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
        <h3 style={sectionHeading}>Dependencies</h3>
        <p style={sectionNote}>
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
        <h3 style={sectionHeading}>Scenarios</h3>
        <p style={sectionNote}>
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
        <h3 style={sectionHeading}>Timeline</h3>
        <p style={sectionNote}>
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
                <span style={{ fontSize: "10px", fontWeight: 600, color: evt.year >= 2020 ? PURPLE : P.textLight, fontFamily: "'DM Mono', monospace" }}>
                  {evt.year}
                </span>
                <div style={{ fontSize: "11px", color: P.text, fontFamily: "'Playfair Display', serif", lineHeight: 1.6, marginTop: 1 }}>
                  {evt.event}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wiring diagram ── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>How the Instruments Connect</h3>
        <p style={sectionNote}>
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
            <div style={{
              background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4,
              padding: isMobile ? "12px 4px" : "20px 22px",
              overflowX: "auto",
            }}>
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
          );
        })()}
      </section>

      {/* ── Sources ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
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
