import { useState, useEffect, useRef } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";

/**
 * Tile — a single dashboard metric snapshot.
 *
 * Click behaviour:
 *   - If `longSeries` is provided, click expands the tile inline to span
 *     the full row and reveals a long-run chart below the regular content.
 *     Click outside the tile, click the tile again, or press Esc to contract.
 *   - Else if `href` is provided, click navigates via SPA pushState.
 *   - Else, the tile is non-interactive.
 *
 * Inline expansion relies on the parent grid having `gridAutoFlow: "row dense"`
 * so that surrounding tiles backfill the empty cells in the row containing
 * the expanded tile.
 *
 * Props:
 *   title, value, unit, format, delta, direction, sparkline, sparklineRange,
 *   source, asOf, href, accent, size                    — see existing usage
 *   longSeries           — number[] (~10 yearly points)
 *   longSeriesStartYear  — first year of longSeries
 */
export default function Tile({
  title,
  value,
  unit,
  format = "number",
  delta,
  direction = "neutral",
  sparkline,
  sparklineRange,
  source,
  asOf,
  href,
  accent,
  size = "standard",
  longSeries,
  longSeriesStartYear,
}) {
  const [expanded, setExpanded] = useState(false);
  const tileRef = useRef(null);
  const isMobile = useIsMobile();
  const isHero = size === "hero";
  const accentColor = accent || trendColor(delta, direction);
  const dColor = deltaColor(delta, direction);
  const sparkColor = accentColor;
  const isExpandable = !!longSeries;
  const isClickable = isExpandable || !!href;

  // Click-outside + Esc to close when expanded
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e) => {
      if (tileRef.current && !tileRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    const handleKeydown = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [expanded]);

  const handleClick = (e) => {
    if (isExpandable) {
      e.preventDefault();
      setExpanded((prev) => !prev);
    } else if (href) {
      e.preventDefault();
      window.history.pushState(null, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const showHover = isClickable && !expanded;

  return (
    <div
      ref={tileRef}
      onClick={handleClick}
      onMouseEnter={showHover ? (e) => {
        e.currentTarget.style.transform = "scale(1.03)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(28,43,69,0.12)";
      } : undefined}
      onMouseLeave={showHover ? (e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(28,43,69,0.04)";
      } : undefined}
      style={{
        gridColumn: expanded ? "1 / -1" : undefined,
        padding: isHero
          ? (isMobile ? "20px 20px 16px" : "26px 28px 20px")
          : (isMobile ? "14px 16px 12px" : "16px 18px 14px"),
        background: P.bgCard,
        border: `1px solid ${P.border}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 3,
        boxShadow: expanded
          ? "0 6px 18px rgba(28,43,69,0.10)"
          : "0 1px 4px rgba(28,43,69,0.04)",
        cursor: isClickable ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        height: expanded ? "auto" : "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 400,
          lineHeight: 1.4,
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: isHero ? (isMobile ? "30px" : "38px") : (isMobile ? "22px" : "26px"),
            fontWeight: 600,
            fontFamily: "'Playfair Display', serif",
            color: P.text,
            lineHeight: 1.05,
          }}
        >
          {formatValue(value, format)}
        </span>
        {unit && (
          <span style={{ fontSize: "11px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
            {unit}
          </span>
        )}
      </div>

      {delta && (
        <div
          style={{
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            color: dColor,
            fontWeight: 500,
            letterSpacing: "0.02em",
            marginTop: 4,
          }}
        >
          {deltaArrow(delta)} {formatDelta(delta, format)}
          {delta.period && (
            <span style={{ color: P.textLight, fontWeight: 400 }}> {delta.period}</span>
          )}
        </div>
      )}

      {sparkline && sparkline.length >= 2 && (
        <div style={{ marginTop: isHero ? 14 : 10, marginBottom: 4 }}>
          <Sparkline data={sparkline} color={sparkColor} height={isHero ? 48 : 30} />
          {sparklineRange && (sparklineRange.start || sparklineRange.end) && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: P.textLight,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.02em",
                marginTop: 4,
              }}
            >
              <span>{sparklineRange.start}</span>
              <span>{sparklineRange.end}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {(() => {
        const showAsOf = asOf && !(sparklineRange && sparklineRange.end);
        if (!source && !showAsOf) return null;
        return (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              fontSize: "10px",
              color: P.textLight,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.02em",
            }}
          >
            {source && (
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {source}
              </span>
            )}
            {showAsOf && <span style={{ flexShrink: 0 }}>{asOf}</span>}
          </div>
        );
      })()}

      {expanded && longSeries && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: `1px solid ${P.border}`,
          }}
        >
          <ExpandedDetail
            longSeries={longSeries}
            startYear={longSeriesStartYear}
            color={accentColor}
            unit={unit}
            format={format}
          />
        </div>
      )}
    </div>
  );
}

// ── Expanded long-trend chart ───────────────────────────────────────

function ExpandedDetail({ longSeries, startYear, color, unit, format }) {
  const startY = startYear || (2026 - longSeries.length + 1);
  const data = longSeries.map((value, i) => ({
    year: startY + i,
    value,
  }));

  return (
    <>
      <div
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 400,
          marginBottom: 10,
        }}
      >
        Long-run trend ({startY}–{startY + longSeries.length - 1})
        {unit ? ` · ${unit}` : ""}
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 24, left: 16, bottom: 8 }}>
            <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              stroke={P.textLight}
              tick={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fill: P.textMuted }}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              stroke={P.textLight}
              tick={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fill: P.textMuted }}
              tickFormatter={formatNumber}
              width={72}
              domain={[(dataMin) => Math.min(0, dataMin), "auto"]}
              label={unit ? {
                value: unit,
                angle: -90,
                position: "insideLeft",
                offset: 8,
                style: {
                  textAnchor: "middle",
                  fill: P.textMuted,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                },
              } : undefined}
            />
            <Tooltip
              contentStyle={{ background: P.text, border: "none", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 12 }}
              itemStyle={{ color: P.bgCard }}
              labelStyle={{ color: P.bgCard, fontWeight: 500, marginBottom: 4 }}
              formatter={(v) => formatValue(v, format)}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ── helpers ─────────────────────────────────────────────────────────

function formatValue(v, format) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (format === "percent") return `${Number(v).toFixed(1)}%`;
  if (format === "currency") return `£${formatNumber(v)}`;
  if (format === "raw") return String(v);
  return formatNumber(v);
}

function formatNumber(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}bn`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}m`;
  if (abs >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (abs >= 1e3) return n.toLocaleString();
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

function formatDelta(delta, format) {
  if (delta.percent !== undefined && delta.percent !== null) {
    const sign = delta.percent > 0 ? "+" : "";
    return `${sign}${delta.percent.toFixed(1)}%`;
  }
  if (delta.value !== undefined && delta.value !== null) {
    const sign = delta.value > 0 ? "+" : "";
    return `${sign}${formatValue(delta.value, format)}`;
  }
  return "";
}

function deltaArrow(delta) {
  const v = delta.percent ?? delta.value ?? 0;
  if (v === 0) return "→";
  return v > 0 ? "↑" : "↓";
}

function deltaColor(delta, direction) {
  if (!delta) return P.textLight;
  const v = delta.percent ?? delta.value ?? 0;
  if (v === 0) return P.textLight;
  const isUp = v > 0;
  if (direction === "up-good") return isUp ? P.teal : P.red;
  if (direction === "up-bad")  return isUp ? P.red : P.teal;
  return P.textMuted;
}

function trendColor(delta, direction) {
  if (!delta) return P.grey;
  const v = delta.percent ?? delta.value ?? 0;
  if (v === 0 || direction === "neutral") return P.grey;
  const isUp = v > 0;
  if (direction === "up-good") return isUp ? P.teal : P.red;
  if (direction === "up-bad")  return isUp ? P.red : P.teal;
  return P.grey;
}

// ── MiniTile ────────────────────────────────────────────────────────
//
// Compact one-line tile for dense overview grids. Shows title + delta only.
// Trend logic is identical to Tile.

export function MiniTile({ title, delta, direction = "neutral", href, accent }) {
  const accentColor = accent || trendColor(delta, direction);

  const handleClick = (e) => {
    if (!href) return;
    e.preventDefault();
    window.history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const content = (
    <div
      onMouseEnter={href ? (e) => {
        e.currentTarget.style.transform = "scale(1.03)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(28,43,69,0.18)";
      } : undefined}
      onMouseLeave={href ? (e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(28,43,69,0.08)";
      } : undefined}
      style={{
        padding: "12px 14px",
        background: accentColor,
        borderRadius: 3,
        boxShadow: "0 1px 4px rgba(28,43,69,0.08)",
        cursor: href ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
        minHeight: 92,
        height: "100%",
      }}
    >
      <span
        style={{
          fontSize: "14px",
          fontFamily: "'Playfair Display', serif",
          color: P.bgCard,
          fontWeight: 500,
          lineHeight: 1.25,
        }}
      >
        {title}
      </span>
      {delta && (
        <span
          style={{
            fontSize: "16px",
            fontFamily: "'DM Mono', monospace",
            color: P.bgCard,
            fontWeight: 600,
            letterSpacing: "0.02em",
            marginTop: "auto",
            paddingTop: 8,
            opacity: 0.92,
          }}
        >
          {deltaArrow(delta)} {formatDelta(delta, "number")}
        </span>
      )}
    </div>
  );

  if (!href) return content;
  return (
    <a
      href={href}
      onClick={handleClick}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      {content}
    </a>
  );
}

// ── sparkline ───────────────────────────────────────────────────────

function Sparkline({ data, color, height = 30 }) {
  if (!data || data.length < 2) return null;
  // Anchor the y-axis floor at 0 so small fluctuations on positive
  // series don't look dramatic. If any value is negative (e.g. real
  // wages YoY going negative), drop the floor to that min so the line
  // still renders.
  const min = Math.min(0, ...data);
  const max = Math.max(0, ...data);
  const range = max - min || 1;
  const w = 100;
  const h = height;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - pad * 2) - pad;
    return [x, y];
  });
  const linePath = points
    .map((p, i) => (i === 0 ? `M${p[0].toFixed(2)},${p[1].toFixed(2)}` : `L${p[0].toFixed(2)},${p[1].toFixed(2)}`))
    .join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <path d={areaPath} fill={color} fillOpacity={0.1} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
