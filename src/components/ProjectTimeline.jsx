import { useMemo, useRef, useState } from "react";
import P from "../theme/palette";

/**
 * Vertical project-lifecycle timeline for a single NSIP.
 *
 * Renders a colour-blocked band (proportional to time) with dots at
 * every event. Hovering or focusing a dot expands a tooltip with the
 * event title, date, description and source link. The band itself
 * tells the lifecycle story at a glance; the dots are the deep dive.
 *
 * Layout:
 *   ┌── year ──┐ band ┐ events list (clickable)
 *   │   1989   │██████│ • A303 trunk-route priority
 *   │   1995   │░░░░░░│ • First tunnel proposal
 *
 * The right-hand list mirrors the dots — clicking a list row scrolls
 * focus to that dot; hovering a dot highlights the matching row.
 */
export default function ProjectTimeline({
  milestones = [],
  summary,
  researcher,
  lastResearched,
}) {
  const events = useMemo(() => {
    return milestones
      .map((m) => ({ ...m, year: parseYear(m.date) }))
      .filter((m) => m.year != null)
      .sort((a, b) => a.year - b.year);
  }, [milestones]);

  const [activeIdx, setActiveIdx] = useState(null);
  const containerRef = useRef(null);

  if (events.length < 2) return null;

  const yearMin = Math.floor(events[0].year);
  const yearMax = Math.ceil(events[events.length - 1].year);
  const yearSpan = Math.max(yearMax - yearMin, 1);

  // Layout
  const VIEW_W = 110;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 10;
  const PX_PER_YEAR = 9;
  const innerH = Math.max(280, yearSpan * PX_PER_YEAR);
  const totalH = innerH + PAD_TOP + PAD_BOTTOM;

  const YEAR_COL_X = 4;
  const YEAR_COL_W = 44;
  const BAND_X = YEAR_COL_X + YEAR_COL_W + 8;
  const BAND_W = 24;

  const yearToY = (year) => PAD_TOP + ((year - yearMin) / yearSpan) * innerH;

  // Year ticks: every event year, plus 5-year breaks for long arcs
  const tickYears = [];
  const seen = new Set();
  for (const e of events) {
    const y = Math.floor(e.year);
    if (!seen.has(y)) { seen.add(y); tickYears.push(y); }
  }
  if (yearSpan > 25) {
    for (let y = Math.ceil(yearMin / 5) * 5; y <= yearMax; y += 5) {
      if (!seen.has(y)) { seen.add(y); tickYears.push(y); }
    }
  }
  tickYears.sort((a, b) => a - b);
  // Dedup adjacent ticks within 14 px
  const dedupedTicks = [];
  let lastTickY = -Infinity;
  for (const ty of tickYears) {
    const ypx = yearToY(ty);
    if (ypx - lastTickY >= 14) { dedupedTicks.push(ty); lastTickY = ypx; }
  }

  // Build segments along the band
  const segments = events.map((m, i) => {
    const startYear = i === 0 ? yearMin : events[i - 1].year;
    const endYear = m.year;
    const phase = m.phase || "other";
    return { phase, y1: yearToY(startYear), y2: yearToY(endYear) };
  });

  return (
    <div style={{ marginTop: 14 }} ref={containerRef}>
      <SectionLabel>Project lifecycle</SectionLabel>
      {summary && (
        <p style={{
          fontFamily: "'DM Mono', monospace", fontSize: 12, color: P.text,
          margin: "4px 0 10px", lineHeight: 1.5,
        }}>
          {summary}
        </p>
      )}

      <div style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `${VIEW_W}px 1fr`,
        gap: 12,
        alignItems: "start",
      }}>
        {/* Band column */}
        <svg
          width={VIEW_W}
          height={totalH}
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Year tick labels */}
          {dedupedTicks.map((y) => (
            <text
              key={y}
              x={YEAR_COL_X + YEAR_COL_W - 4}
              y={yearToY(y) + 4}
              textAnchor="end"
              fontFamily="'Playfair Display', serif"
              fontSize="13"
              fontWeight="600"
              fill={P.text}
            >
              {y}
            </text>
          ))}

          {/* Phase-coloured segments */}
          {segments.map((seg, i) => (
            <rect
              key={i}
              x={BAND_X}
              y={seg.y1}
              width={BAND_W}
              height={Math.max(0.5, seg.y2 - seg.y1)}
              fill={fillForPhase(seg.phase)}
            />
          ))}
          {/* Outline */}
          <rect
            x={BAND_X}
            y={segments[0].y1}
            width={BAND_W}
            height={Math.max(0, segments[segments.length - 1].y2 - segments[0].y1)}
            fill="none"
            stroke={P.text}
            strokeWidth="0.5"
          />

          {/* Event dots */}
          {events.map((m, i) => {
            const cy = yearToY(m.year);
            const isActive = activeIdx === i;
            return (
              <g key={i}>
                <circle
                  cx={BAND_X + BAND_W / 2}
                  cy={cy}
                  r={isActive ? 6 : 4}
                  fill={P.bgCard}
                  stroke={P.text}
                  strokeWidth={isActive ? 2 : 1.2}
                  style={{ cursor: "pointer", transition: "r 0.12s" }}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Event list — chronological, hoverable, mirrors band */}
        <ol style={{
          listStyle: "none", padding: 0, margin: 0,
          maxHeight: totalH, overflowY: "auto", paddingRight: 4,
        }}>
          {events.map((m, i) => {
            const isActive = activeIdx === i;
            return (
              <li
                key={i}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                style={{
                  padding: "6px 8px",
                  marginBottom: 4,
                  borderLeft: `3px solid ${PHASE_FILL[m.phase] || "#bdb6a3"}`,
                  background: isActive ? "rgba(28,43,69,0.05)" : "transparent",
                  borderRadius: "0 3px 3px 0",
                  transition: "background 0.12s",
                  cursor: "default",
                }}
              >
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  gap: 8, marginBottom: 2,
                }}>
                  <span style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 13, fontWeight: 600, color: P.text, lineHeight: 1.25,
                  }}>
                    {m.title}
                  </span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                    color: P.textLight, whiteSpace: "nowrap",
                  }}>
                    {formatDate(m.date)}
                  </span>
                </div>
                {m.description && (
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 11,
                    color: P.textMuted, lineHeight: 1.4, marginTop: 1,
                  }}>
                    {m.description}
                  </div>
                )}
                {m.source && (
                  <a
                    href={m.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: 10, fontFamily: "'DM Mono', monospace",
                      color: P.teal, textDecoration: "none",
                      letterSpacing: "0.04em",
                    }}
                  >
                    source ↗
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <PhaseLegend />

      {(researcher || lastResearched) && (
        <div style={{
          marginTop: 6, fontSize: 10, color: P.textLight,
          fontFamily: "'DM Mono', monospace",
        }}>
          {researcher === "claude-agent" && "Researched by Claude agent"}
          {researcher === "manual" && "Hand-curated"}
          {researcher === "stub" && "Stub"}
          {lastResearched && ` · ${lastResearched}`}
        </div>
      )}
    </div>
  );
}

function formatDate(s) {
  if (s == null) return "";
  const str = String(s).trim();
  const iso = str.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (iso) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return iso[3] ? `${iso[3]} ${months[Number(iso[2]) - 1]} ${iso[1]}` : `${months[Number(iso[2]) - 1]} ${iso[1]}`;
  }
  if (/^\d{4}$/.test(str)) return str;
  return str;
}

const PHASE_FILL = {
  proposal:     P.parchment,
  consultation: P.parchment,
  application:  P.yellow,
  examination:  P.yellow,
  revived:      P.yellow,
  jr:           P.sienna,
  dormant:      P.grey,
  consent:      P.navy,
  fid:          P.navy,
  build:        P.teal,
  operational:  "#0F4A40",
  cancelled:    P.red,
};

function fillForPhase(phase) {
  return PHASE_FILL[phase] || "#bdb6a3";
}

const PHASE_LABELS = {
  proposal:     "Proposal",
  examination:  "In examination",
  jr:           "Judicial review",
  dormant:      "Dormant",
  consent:      "Consented",
  build:        "Construction",
  operational:  "Operational",
  cancelled:    "Cancelled",
};

function PhaseLegend() {
  const order = ["proposal", "examination", "jr", "dormant", "consent", "build", "operational", "cancelled"];
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 10,
      marginTop: 10,
      fontSize: 10, color: P.textMuted,
      fontFamily: "'DM Mono', monospace",
    }}>
      {order.map((k) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{
            display: "inline-block", width: 12, height: 12,
            background: PHASE_FILL[k],
            border: `0.5px solid ${P.text}`,
          }} />
          {PHASE_LABELS[k]}
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
      textTransform: "uppercase", letterSpacing: "0.08em",
      marginTop: 14, marginBottom: 6,
      paddingTop: 12, borderTop: `1px dashed ${P.border}`,
    }}>
      {children}
    </div>
  );
}

function parseYear(s) {
  if (s == null) return null;
  if (typeof s === "number" && Number.isFinite(s)) return s;
  const str = String(s).trim();
  const range = str.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const iso = str.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = iso[2] ? Number(iso[2]) : 1;
    const d = iso[3] ? Number(iso[3]) : 1;
    return y + (m - 1) / 12 + (d - 1) / 365;
  }
  const dm = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dm) return Number(dm[3]) + (Number(dm[2]) - 1) / 12;
  const decade = str.match(/(early|mid|late)\s+(\d{4})s/i);
  if (decade) {
    const base = Number(decade[2]);
    const offset = decade[1].toLowerCase() === "early" ? 2 : decade[1].toLowerCase() === "mid" ? 5 : 8;
    return base + offset;
  }
  const yearOnly = str.match(/(\d{4})/);
  if (yearOnly) return Number(yearOnly[1]);
  return null;
}
