import P from "../theme/palette";

const PURPLE = "#7B4B8A";

export default function DebateHeader({ title, subtitle, status = "archive", updatedDate, color = PURPLE }) {
  const isLive = status === "live";

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "28px",
          fontWeight: 600,
          color: P.text,
          margin: 0,
        }}>
          {title}
        </h2>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: "10px",
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: isLive ? color : P.textLight,
          padding: "3px 10px",
          border: `1px solid ${isLive ? color : P.border}`,
          borderRadius: 3,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isLive ? color : P.textLight,
            animation: isLive ? "debatePulse 2s ease-in-out infinite" : "none",
          }} />
          {isLive ? "Live" : "Archive"}
        </span>
      </div>

      {subtitle && (
        <p style={{
          fontSize: "14px",
          lineHeight: 1.7,
          color: P.textMuted,
          fontFamily: "'Playfair Display', serif",
          margin: "0 0 6px",
          maxWidth: 720,
        }}>
          {subtitle}
        </p>
      )}

      {updatedDate && (
        <span style={{
          fontSize: "10px",
          fontFamily: "'DM Mono', monospace",
          color: P.textLight,
          letterSpacing: "0.05em",
        }}>
          Updated {updatedDate}
        </span>
      )}

      <style>{`
        @keyframes debatePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
