import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import P from "../theme/palette";
import CustomTooltip from "./CustomTooltip";

export default function TopicChart({ topicKey, chart, lines, chartType }) {
  const axisTickStyle = {
    fontSize: 10,
    fill: P.textLight,
    fontFamily: "'DM Mono', monospace",
  };
  const margin = { top: 5, right: 10, left: -10, bottom: 0 };

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chart} margin={margin}>
          <defs>
            {lines.map((l) => (
              <linearGradient
                key={l.key}
                id={`grad-${topicKey}-${l.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={l.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(28,43,69,0.06)"
          />
          <XAxis
            dataKey="year"
            tick={axisTickStyle}
            axisLine={{ stroke: P.border }}
            tickLine={false}
          />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {lines.map((l) => (
            <Area
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              fill={`url(#grad-${topicKey}-${l.key})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chart} margin={margin}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(28,43,69,0.06)"
          />
          <XAxis
            dataKey="year"
            tick={axisTickStyle}
            axisLine={{ stroke: P.border }}
            tickLine={false}
          />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {lines.map((l) => (
            <Bar
              key={l.key}
              dataKey={l.key}
              name={l.name}
              fill={l.color}
              opacity={0.8}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chart} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis
          dataKey="year"
          tick={axisTickStyle}
          axisLine={{ stroke: P.border }}
          tickLine={false}
        />
        <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: l.color,
              stroke: P.bgCard,
              strokeWidth: 2,
            }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
