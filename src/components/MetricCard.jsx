import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";

export default function MetricCard({ label, value, change, up, color, delay = 0 }) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        padding: isMobile ? "14px 14px" : "18px 20px",
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
          fontSize: "11px",
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
          fontSize: isMobile ? "22px" : "28px",
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
          fontSize: "12px",
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
