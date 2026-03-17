import { ResponsiveContainer } from "recharts";
import P from "../theme/palette";
import ShareableChart from "./ShareableChart";
import { CHART_CARD, CHART_TITLE, CHART_SUBTITLE, SOURCE_TEXT } from "../theme/chartStyles";

/**
 * Standard chart card wrapper used across all pillar pages.
 *
 * Every chart should have a `source` prop — a React node rendered in
 * SOURCE_TEXT style at the bottom of the card, ensuring all charts are
 * traceable to their data origin.
 *
 * Supports two header styles:
 *   1. title/subtitle (original): bold title with smaller subtitle below
 *   2. label/yearRange (Safety-style): single line "label · yearRange"
 *
 * Optional view toggles for multi-view charts (e.g. "Violent Crime" / "Homicides").
 */
export default function ChartCard({
  title, subtitle,
  // Source citation (should always be provided)
  source,
  // View toggles (optional)
  views, viewLabels, activeView, onViewChange,
  // Layout
  height, style, children,
}) {
  return (
    <ShareableChart title={title}>
      <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)", ...style }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={CHART_TITLE}>{title}</div>
            {subtitle && <div style={CHART_SUBTITLE}>{subtitle}</div>}
          </div>
          {views && onViewChange && (
            <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
              {views.map((v) => (
                <button
                  key={v}
                  onClick={() => onViewChange(v)}
                  style={{
                    background: activeView === v ? "rgba(28,43,69,0.06)" : "transparent",
                    border: "none",
                    color: activeView === v ? P.text : P.textLight,
                    padding: "4px 10px", fontSize: "10px", fontWeight: 500,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    cursor: "pointer", fontFamily: "'DM Mono', monospace",
                    transition: "all 0.15s", borderRadius: 2,
                  }}
                >
                  {viewLabels[v]}
                </button>
              ))}
            </div>
          )}
        </div>
        {height ? (
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        ) : children}
        {source && <div style={SOURCE_TEXT}>{source}</div>}
      </div>
    </ShareableChart>
  );
}
