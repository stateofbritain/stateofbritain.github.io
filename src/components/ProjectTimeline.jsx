import { useMemo } from "react";
import P from "../theme/palette";

/**
 * Vertical orange-stripe timeline for a single NSIP project. Renders
 * the long arc — proposal → planning rounds → judicial review →
 * dormant → revived → consent → build → operational — that the PINS
 * register doesn't capture on its own.
 *
 * Input: an array of milestones with shape
 *   { date, phase, title, description?, source? }
 * The component sorts, parses dates leniently, and lays each milestone
 * out in vertical year-space. Phase determines the band fill colour
 * for the segment running up to that milestone.
 *
 * @param {Object} props
 * @param {Array}  props.milestones
 * @param {string} [props.summary]
 * @param {string} [props.researcher]
 * @param {string} [props.lastResearched]
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

  if (events.length < 2) {
    return null;
  }

  const yearMin = Math.floor(events[0].year);
  const yearMax = Math.ceil(events[events.length - 1].year);
  // Ensure the band has room to breathe at the bottom (still in progress).
  const yearSpan = Math.max(yearMax - yearMin, 1);

  // Layout: total height scales with year span, capped to keep the
  // panel readable on smaller screens.
  const PX_PER_YEAR = 10;
  const MIN_H = 280;
  const MAX_H = 720;
  const innerH = Math.min(MAX_H, Math.max(MIN_H, yearSpan * PX_PER_YEAR));
  const height = innerH + 40;

  // x-positions inside the SVG.
  const yearColX = 8;
  const yearColW = 56;
  const bandX = yearColX + yearColW;
  const bandW = 26;
  const eventX = bandX + bandW + 12;

  const yearToY = (year) => {
    const t = (year - yearMin) / yearSpan;
    return 20 + t * innerH;
  };

  // Year ticks: every 5 years if span > 25, every 2 if 10-25, every year otherwise.
  const tickStep = yearSpan > 25 ? 5 : yearSpan > 10 ? 2 : 1;
  const ticks = [];
  for (let y = Math.ceil(yearMin / tickStep) * tickStep; y <= yearMax; y += tickStep) {
    ticks.push(y);
  }
  if (ticks[0] !== yearMin) ticks.unshift(yearMin);
  if (ticks[ticks.length - 1] !== yearMax) ticks.push(yearMax);

  // Build segments: each is the band between two consecutive milestones,
  // its phase determined by the milestone *ending* the segment (the
  // arrival phase is what the band has been doing).
  const segments = events.map((m, i) => {
    const startYear = i === 0 ? yearMin : events[i - 1].year;
    const endYear = m.year;
    const phase = m.phase || "other";
    return {
      phase,
      y1: yearToY(startYear),
      y2: yearToY(endYear),
    };
  });

  return (
    <div style={{ marginTop: 14 }}>
      <SectionLabel>Project lifecycle</SectionLabel>
      {summary && (
        <p style={{
          fontFamily: "'DM Mono', monospace", fontSize: 12, color: P.text,
          margin: "4px 0 8px", lineHeight: 1.5,
        }}>
          {summary}
        </p>
      )}
      <svg
        width="100%"
        viewBox={`0 0 360 ${height}`}
        height={height}
        style={{ display: "block", overflow: "visible" }}
      >

        {/* Year ticks (left column) */}
        {ticks.map((y) => (
          <g key={y}>
            <text
              x={yearColX + yearColW - 4}
              y={yearToY(y) + 4}
              textAnchor="end"
              fontFamily="'Playfair Display', serif"
              fontSize="14"
              fontWeight="600"
              fill={P.text}
            >
              {y}
            </text>
          </g>
        ))}

        {/* Vertical band, painted in segments by phase */}
        {segments.map((seg, i) => (
          <rect
            key={i}
            x={bandX}
            y={seg.y1}
            width={bandW}
            height={Math.max(0, seg.y2 - seg.y1)}
            fill={fillForPhase(seg.phase)}
          />
        ))}
        {/* Band outline so it reads as one bar even with mixed fills */}
        <rect
          x={bandX}
          y={segments[0]?.y1 ?? 20}
          width={bandW}
          height={Math.max(0, (segments[segments.length - 1]?.y2 ?? height) - (segments[0]?.y1 ?? 20))}
          fill="none"
          stroke={P.text}
          strokeWidth="0.5"
        />

        {/* Event tickmarks + labels (right column) */}
        {events.map((m, i) => {
          const y = yearToY(m.year);
          return (
            <g key={i}>
              {/* tick from the band into the label area */}
              <line
                x1={bandX + bandW}
                y1={y}
                x2={bandX + bandW + 8}
                y2={y}
                stroke={P.text}
                strokeWidth="1"
              />
              <text
                x={eventX}
                y={y + 4}
                fontFamily="'Playfair Display', serif"
                fontSize="13"
                fontWeight="600"
                fill={P.text}
              >
                {m.title}
              </text>
              {m.description && (
                <text
                  x={eventX}
                  y={y + 18}
                  fontFamily="'DM Mono', monospace"
                  fontSize="10"
                  fill={P.textMuted}
                  style={{ letterSpacing: "0.04em" }}
                >
                  {m.description.length > 56 ? m.description.slice(0, 56) + "…" : m.description}
                </text>
              )}
            </g>
          );
        })}
      </svg>

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

// Solid palette colour per phase. Idea: distinct hue for each lifecycle
// stage so the band reads as a coloured timeline at a glance.
//   proposal / consultation: parchment      (early, soft)
//   application / examination / revived:    yellow (system in motion)
//   jr:        sienna   (contested)
//   dormant:   grey     (idle)
//   consent / fid:       navy    (decided)
//   build:     teal      (physically being built)
//   operational:         deep teal (running)
//   cancelled:           red     (terminated)
function fillForPhase(phase) {
  return PHASE_FILL[phase] || "#bdb6a3";
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

const PHASE_LABELS = {
  proposal:     "Proposal / consultation",
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

/**
 * Lenient date → numeric year. Accepts:
 *   "2013-03-19" → 2013.21
 *   "2013-03"    → 2013.17
 *   "2013"       → 2013.0
 *   "early 2010s" → 2012.0  (best-effort midpoint of decade-prefix)
 *   "mid 1990s"  → 1995.0
 *   "late 1980s" → 1988.0
 */
function parseYear(s) {
  if (s == null) return null;
  if (typeof s === "number" && Number.isFinite(s)) return s;
  const str = String(s).trim();
  // Exact ISO date / year-month / year
  const iso = str.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = iso[2] ? Number(iso[2]) : 1;
    const d = iso[3] ? Number(iso[3]) : 1;
    return y + (m - 1) / 12 + (d - 1) / 365;
  }
  // dd/mm/yyyy
  const dm = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dm) return Number(dm[3]) + (Number(dm[2]) - 1) / 12;
  // Decade prefix
  const decade = str.match(/(early|mid|late)\s+(\d{4})s/i);
  if (decade) {
    const base = Number(decade[2]);
    const offset = decade[1].toLowerCase() === "early" ? 2 : decade[1].toLowerCase() === "mid" ? 5 : 8;
    return base + offset;
  }
  // Bare four-digit year embedded in text
  const yearOnly = str.match(/(\d{4})/);
  if (yearOnly) return Number(yearOnly[1]);
  return null;
}
