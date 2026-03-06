import P from "../theme/palette";

export default function MetricCard({ label, value, change, up, color, delay = 0 }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        background: P.bgCard,
        border: `1px solid ${P.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 3,
        animation: `fadeSlideIn 0.5s ease ${delay}s both`,
        boxShadow: "0 1px 4px rgba(28,43,69,0.04)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 400,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 600,
          fontFamily: "'Playfair Display', serif",
          color: P.text,
          margin: "5px 0 3px",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "11px",
          fontFamily: "'DM Mono', monospace",
          color: up ? P.red : P.teal,
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}
      >
        {change}
      </div>
    </div>
  );
}
