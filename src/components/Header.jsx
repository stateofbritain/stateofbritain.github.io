import P from "../theme/palette";
import Search from "./Search";

export default function Header({ onHome, onNavigate, isMobile }) {
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
        <div style={{ marginLeft: "auto" }}>
          <Search onNavigate={onNavigate} isMobile={isMobile} />
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
