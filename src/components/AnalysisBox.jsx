import P from "../theme/palette";

export default function AnalysisBox({ color, children, visible = true, label = "Context" }) {
  return (
    <div
      style={{
        background: P.bgCard,
        border: `1px solid ${P.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 3,
        padding: "20px 24px",
        marginBottom: 36,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "all 0.5s ease",
        boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color,
          fontWeight: 500,
          marginBottom: 10,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {label}
      </div>
      <p
        style={{
          fontSize: "15px",
          lineHeight: 1.75,
          color: P.textMuted,
          margin: 0,
          fontFamily: "'Playfair Display', serif",
          fontWeight: 400,
          fontStyle: "normal",
        }}
      >
        {children}
      </p>
    </div>
  );
}
