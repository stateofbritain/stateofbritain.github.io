import { useMemo } from "react";
import P from "../theme/palette";

/**
 * Horizontal timeline render for off-screen export to PNG.
 *
 * Layout (1600 × 900 SVG units):
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Project Name                                           │
 *   │  Year range subtitle                                    │
 *   │                                                         │
 *   │           event label (rotated -35°)                    │
 *   │            │                                            │
 *   │  ────●──●──●─────●───────●──────●──●────                │
 *   │  1989   1995    2002   2014   2021  2024                │
 *   │                                                         │
 *   │  ■ Proposal  ■ Examination  ■ Consented  ■ Build  …    │
 *   └─────────────────────────────────────────────────────────┘
 */
export default function TimelineExport({
  projectName,
  milestones = [],
  width = 1600,
  height = 900,
}) {
  const events = useMemo(() => {
    return milestones
      .map((m) => ({ ...m, year: parseYear(m.date) }))
      .filter((m) => m.year != null)
      .sort((a, b) => a.year - b.year);
  }, [milestones]);

  if (events.length < 2) return null;

  const yearMin = Math.floor(events[0].year);
  const yearMax = Math.ceil(events[events.length - 1].year);
  const yearSpan = Math.max(yearMax - yearMin, 1);

  // Layout
  const PAD_X = 64;
  const TITLE_TOP = 56;
  const TITLE_H = 90;
  const LABEL_H = 360;
  const BAND_H = 36;
  const AXIS_H = 60;
  const LEGEND_H = 80;

  const innerW = width - 2 * PAD_X;
  const bandY = TITLE_H + LABEL_H;
  const axisY = bandY + BAND_H;

  const yearToX = (year) =>
    PAD_X + ((year - yearMin) / yearSpan) * innerW;

  // Build phase segments along the band
  const segments = events.map((m, i) => {
    const startYear = i === 0 ? yearMin : events[i - 1].year;
    return {
      phase: m.phase || "other",
      x1: yearToX(startYear),
      x2: yearToX(m.year),
      expected: !!m.expected,
    };
  });

  // Year tick marks: event years plus 5-year breakpoints for long arcs
  const tickYears = [];
  const seen = new Set();
  for (const e of events) {
    const y = Math.floor(e.year);
    if (!seen.has(y)) { seen.add(y); tickYears.push(y); }
  }
  if (yearSpan > 20) {
    for (let y = Math.ceil(yearMin / 5) * 5; y <= yearMax; y += 5) {
      if (!seen.has(y)) { seen.add(y); tickYears.push(y); }
    }
  }
  tickYears.sort((a, b) => a - b);
  // Dedup ticks within 60px so labels don't crash on the axis
  const dedupedTicks = [];
  let lastX = -Infinity;
  for (const ty of tickYears) {
    const xp = yearToX(ty);
    if (xp - lastX >= 60) { dedupedTicks.push(ty); lastX = xp; }
  }

  // Concrete vs expected portion of the band
  const firstExpectedIdx = segments.findIndex((s) => s.expected);
  const concreteEndX = firstExpectedIdx === -1
    ? segments[segments.length - 1].x2
    : segments[firstExpectedIdx].x1;
  const expectedStartX = firstExpectedIdx === -1
    ? null
    : segments[firstExpectedIdx].x1;
  const expectedEndX = firstExpectedIdx === -1
    ? null
    : segments[segments.length - 1].x2;

  const legendY = axisY + AXIS_H + 30;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", background: "#FFFDF8", width: "100%", height: "100%" }}
    >
      {/* Sienna top-rail to match the rest of the export branding */}
      <rect x={0} y={0} width={width} height={3} fill={P.sienna} />

      {/* Title */}
      <text
        x={PAD_X}
        y={TITLE_TOP}
        fontFamily="'Playfair Display', serif"
        fontSize={40}
        fontWeight={600}
        fill={P.text}
      >
        {projectName}
      </text>
      <text
        x={PAD_X}
        y={TITLE_TOP + 28}
        fontFamily="'DM Mono', monospace"
        fontSize={16}
        fill={P.textMuted}
        letterSpacing="0.04em"
      >
        Project lifecycle, {yearMin}–{yearMax}
      </text>

      {/* Phase-coloured segments */}
      {segments.map((seg, i) => (
        <rect
          key={i}
          x={seg.x1}
          y={bandY}
          width={Math.max(0.5, seg.x2 - seg.x1)}
          height={BAND_H}
          fill={fillForPhase(seg.phase)}
          fillOpacity={seg.expected ? 0.35 : 1}
        />
      ))}

      {/* Concrete band outline */}
      <rect
        x={segments[0].x1}
        y={bandY}
        width={Math.max(0, concreteEndX - segments[0].x1)}
        height={BAND_H}
        fill="none"
        stroke={P.text}
        strokeWidth="1"
      />

      {/* Dashed outline over the expected (future) portion */}
      {expectedStartX != null && (
        <rect
          x={expectedStartX}
          y={bandY}
          width={Math.max(0, expectedEndX - expectedStartX)}
          height={BAND_H}
          fill="none"
          stroke={P.text}
          strokeWidth="1.2"
          strokeDasharray="6 4"
          opacity={0.65}
        />
      )}

      {/* Year axis tick marks + labels */}
      {dedupedTicks.map((y) => {
        const xp = yearToX(y);
        return (
          <g key={y}>
            <line
              x1={xp}
              y1={axisY}
              x2={xp}
              y2={axisY + 8}
              stroke={P.text}
              strokeWidth="1"
            />
            <text
              x={xp}
              y={axisY + 28}
              textAnchor="middle"
              fontFamily="'Playfair Display', serif"
              fontSize={18}
              fontWeight={600}
              fill={P.text}
            >
              {y}
            </text>
          </g>
        );
      })}

      {/* Event dots and rotated labels above */}
      {events.map((m, i) => {
        const xp = yearToX(m.year);
        const cy = bandY + BAND_H / 2;
        const labelY = bandY - 24;
        return (
          <g key={i}>
            {/* leader line from label baseline down to dot */}
            <line
              x1={xp}
              y1={labelY + 4}
              x2={xp}
              y2={cy - 8}
              stroke={P.textLight}
              strokeWidth="0.7"
            />
            <circle
              cx={xp}
              cy={cy}
              r={7}
              fill="#FFFDF8"
              stroke={P.text}
              strokeWidth={1.4}
              strokeDasharray={m.expected ? "2 1.5" : "none"}
              opacity={m.expected ? 0.75 : 1}
            />
            <text
              x={xp}
              y={labelY}
              textAnchor="start"
              transform={`rotate(-35 ${xp} ${labelY})`}
              fontFamily="'Playfair Display', serif"
              fontSize={15}
              fontWeight={500}
              fill={P.text}
            >
              {truncate(m.title, 60)}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <PhaseLegendSVG xStart={PAD_X} y={legendY} />

      {/* Footer attribution */}
      <text
        x={width - PAD_X}
        y={height - 24}
        textAnchor="end"
        fontFamily="'DM Mono', monospace"
        fontSize={14}
        fill={P.textMuted}
        opacity={0.55}
      >
        stateofbritain.uk
      </text>
    </svg>
  );
}

function truncate(s, n) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1).trim() + "…";
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
  proposal:     "Proposal",
  examination:  "In examination",
  jr:           "Judicial review",
  dormant:      "Dormant",
  consent:      "Consented",
  build:        "Construction",
  operational:  "Operational",
  cancelled:    "Cancelled",
};

const LEGEND_ORDER = ["proposal", "examination", "jr", "dormant", "consent", "build", "operational", "cancelled"];

function fillForPhase(phase) {
  return PHASE_FILL[phase] || "#bdb6a3";
}

function PhaseLegendSVG({ xStart, y }) {
  // Approximate ~150px per legend entry
  const ENTRY_W = 165;
  return (
    <g>
      {LEGEND_ORDER.map((k, i) => {
        const cx = xStart + i * ENTRY_W;
        return (
          <g key={k} transform={`translate(${cx}, ${y})`}>
            <rect
              x={0}
              y={-12}
              width={18}
              height={18}
              fill={PHASE_FILL[k]}
              stroke={P.text}
              strokeWidth="0.7"
            />
            <text
              x={24}
              y={2}
              fontFamily="'DM Mono', monospace"
              fontSize={14}
              fill={P.text}
            >
              {PHASE_LABELS[k]}
            </text>
          </g>
        );
      })}
    </g>
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
