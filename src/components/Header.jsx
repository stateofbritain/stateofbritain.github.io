import P from "../theme/palette";
import Search from "./Search";

export default function Header({ onHome, onNavigate, onAskOpen, isMobile }) {
  return (
    <header style={{ paddingTop: isMobile ? 24 : 44, paddingBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "baseline",
          justifyContent: "space-between",
          gap: isMobile ? 6 : 14,
          flexWrap: "wrap",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <h1
          onClick={onHome}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(30px, 5vw, 46px)",
            fontWeight: 700,
            color: P.text,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            cursor: onHome ? "pointer" : "default",
          }}
        >
          State of Britain
        </h1>
        <span
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: P.sienna,
            fontWeight: 500,
            ...(isMobile
              ? { paddingLeft: 0 }
              : { borderLeft: `2px solid ${P.sienna}`, paddingLeft: 10 }),
            fontFamily: "'DM Mono', monospace",
          }}
        >
          The state of the state
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Search onNavigate={onNavigate} isMobile={isMobile} />
          <button
            onClick={onAskOpen}
            style={{
              fontSize: "11px",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              color: P.navy,
              background: "none",
              border: `1px solid ${P.border}`,
              borderRadius: 3,
              padding: "5px 12px",
              cursor: "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = P.borderStrong}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = P.border}
          >
            Ask
          </button>
        </div>
      </div>
      <p
        style={{
          fontSize: "14px",
          color: P.textMuted,
          marginTop: 8,
          ...(isMobile ? {} : { maxWidth: 580 }),
          lineHeight: 1.6,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 300,
        }}
      >
        Objective data on Britain's public services, economy, and society.
        Because political debate should start with facts.
      </p>
      <div
        style={{
          marginTop: 18,
          height: 2,
          width: 48,
          background: P.sienna,
          animation: "expandLine 0.8s ease both",
          transformOrigin: "left",
        }}
      />
    </header>
  );
}
