import { ResponsiveContainer } from "recharts";
import ShareableChart from "./ShareableChart";
import { CHART_CARD, CHART_TITLE, CHART_SUBTITLE, SOURCE_TEXT } from "../theme/chartStyles";

export default function ChartCard({ title, subtitle, source, height = 320, children, style }) {
  return (
    <ShareableChart title={title}>
      <div style={{ ...CHART_CARD, ...style }}>
        <div style={{ marginBottom: 10 }}>
          <div style={CHART_TITLE}>{title}</div>
          {subtitle && <div style={CHART_SUBTITLE}>{subtitle}</div>}
        </div>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
        {source && <div style={SOURCE_TEXT}>{source}</div>}
      </div>
    </ShareableChart>
  );
}
