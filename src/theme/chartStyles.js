import P from "./palette";

// ─── Section-level styles ────────────────────────────────────────────

export const SECTION_HEADING = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "20px",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};

export const SECTION_NOTE = {
  fontSize: "14px",
  lineHeight: 1.7,
  color: P.textMuted,
  fontFamily: "'Playfair Display', serif",
  margin: "0 0 18px",
  maxWidth: 720,
};

// ─── Chart card ──────────────────────────────────────────────────────

export const CHART_CARD = {
  background: P.bgCard,
  border: `1px solid ${P.border}`,
  borderRadius: 3,
  padding: "18px 20px 14px",
};

export const CHART_TITLE = {
  fontSize: "14px",
  fontWeight: 600,
  color: P.text,
  fontFamily: "'Playfair Display', serif",
  marginBottom: 2,
};

export const CHART_SUBTITLE = {
  fontSize: "10px",
  color: P.textLight,
  fontFamily: "'DM Mono', monospace",
};

export const SOURCE_TEXT = {
  marginTop: 6,
  fontSize: "10px",
  color: P.textLight,
  fontFamily: "'DM Mono', monospace",
  letterSpacing: "0.06em",
};

// ─── Axis & grid ─────────────────────────────────────────────────────

export const AXIS_TICK = {
  fontSize: 11,
  fill: P.textMuted,
};

export const AXIS_TICK_MONO = {
  fontSize: 11,
  fill: P.textLight,
  fontFamily: "'DM Mono', monospace",
};

export const yAxisLabel = (value, opts = {}) => ({
  value,
  angle: opts.angle ?? -90,
  position: opts.position ?? "insideLeft",
  style: {
    textAnchor: "middle",
    fontSize: 10,
    fill: P.textLight,
    fontFamily: "'DM Mono', monospace",
  },
});

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: P.border,
};

// ─── Toggle buttons ──────────────────────────────────────────────────

export const toggleBtn = (active) => ({
  padding: "4px 12px",
  border: `1px solid ${active ? P.teal : P.border}`,
  borderRadius: 4,
  background: active ? P.teal : "transparent",
  color: active ? "#fff" : P.textMuted,
  fontSize: "12px",
  fontFamily: "'DM Mono', monospace",
  cursor: "pointer",
  transition: "all 0.15s",
});

// ─── Financial year axis helpers ─────────────────────────────────────
// Use these when charting data with FY string keys ("2003-04") that may
// have uneven spacing. Adds a numeric field for proportional X axis.

/**
 * Add a numeric fyNum field to data with FY strings for proportional axis spacing.
 * e.g. "2003-04" → fyNum: 2003
 */
export const withFyNum = (data, field = "year") =>
  data?.map(d => ({ ...d, fyNum: parseInt(d[field]) })) ?? [];

/**
 * Format a numeric year back to FY string for tick labels.
 * e.g. 2003 → "2003-04"
 */
export const fyTickFormatter = (v) => {
  const n = Math.round(v);
  const next = String(n + 1).slice(-2);
  return `${n}-${next}`;
};

// ─── View toggle strip (Spending / Housing style) ────────────────────

export const VIEW_TOGGLE_BUTTON = (active) => ({
  background: active ? "rgba(28,43,69,0.06)" : "transparent",
  border: "none",
  color: active ? P.text : P.textLight,
  padding: "4px 12px",
  fontSize: "10px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  cursor: "pointer",
  fontFamily: "'DM Mono', monospace",
  transition: "all 0.15s",
  borderRadius: 2,
});
