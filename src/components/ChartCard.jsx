import { ResponsiveContainer } from "recharts";
import P from "../theme/palette";
import ShareableChart from "./ShareableChart";
import Legend from "./Legend";
import { CHART_CARD, CHART_TITLE, CHART_SUBTITLE, SOURCE_TEXT } from "../theme/chartStyles";

/**
 * Standard chart card wrapper used across all pillar pages.
 *
 * Props:
 *  - title (required): Title Case heading
 *  - subtitle: geography, units, date range
 *  - source (required): data citation — use sourceFrom(raw, seriesId) for v1 datasets
 *  - legend: array of { key, label, color } for colour-swatch legend rendered inside the card
 *  - views/viewLabels/activeView/onViewChange: multi-view toggle
 *  - height: wraps children in ResponsiveContainer (use for single Recharts element)
 *  - style: extra card styles
 */
export default function ChartCard({
  title, subtitle,
  source,
  legend,
  views, viewLabels, activeView, onViewChange,
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
        {legend && <div style={{ marginBottom: 8 }}><Legend items={legend} /></div>}
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
