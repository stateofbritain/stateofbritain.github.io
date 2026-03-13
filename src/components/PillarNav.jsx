import PILLARS, { PILLAR_KEYS } from "../pillars/config";
import P from "../theme/palette";
import { track } from "../analytics";

export default function PillarNav({ activePillar, onSelect, isMobile }) {
  return (
    <nav
      className={isMobile ? "scroll-hide" : undefined}
      style={{
        display: "flex",
        gap: 0,
        marginBottom: 0,
        borderBottom: `1px solid ${P.border}`,
        ...(isMobile && { overflowX: "auto" }),
      }}
    >
      <button
        onClick={() => { track("pillar_select", { pillar: "overview" }); onSelect(null); }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: isMobile ? "8px 12px 10px" : "10px 18px 12px",
          borderBottom: !activePillar
            ? `2px solid ${P.sienna}`
            : "2px solid transparent",
          transition: "all 0.2s",
          position: "relative",
          top: 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: !activePillar ? 500 : 400,
            color: !activePillar ? P.text : P.textLight,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "'DM Mono', monospace",
            whiteSpace: "nowrap",
          }}
        >
          Overview
        </span>
      </button>
      {PILLAR_KEYS.map((key) => {
        const pillar = PILLARS[key];
        const isActive = key === activePillar;
        return (
          <button
            key={key}
            onClick={() => { track("pillar_select", { pillar: pillar.label }); onSelect(key); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: isMobile ? "8px 12px 10px" : "10px 18px 12px",
              borderBottom: isActive
                ? `2px solid ${pillar.color}`
                : "2px solid transparent",
              transition: "all 0.2s",
              position: "relative",
              top: 1,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? P.text : P.textLight,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "'DM Mono', monospace",
                transition: "color 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {pillar.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
