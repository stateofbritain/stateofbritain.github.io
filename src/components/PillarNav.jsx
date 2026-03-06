import PILLARS, { PILLAR_KEYS } from "../pillars/config";
import P from "../theme/palette";

export default function PillarNav({ activePillar, onSelect }) {
  return (
    <nav
      style={{
        display: "flex",
        gap: 0,
        marginBottom: 0,
        borderBottom: `1px solid ${P.border}`,
      }}
    >
      <button
        onClick={() => onSelect(null)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "10px 18px 12px",
          borderBottom: !activePillar
            ? `2px solid ${P.sienna}`
            : "2px solid transparent",
          transition: "all 0.2s",
          position: "relative",
          top: 1,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: !activePillar ? 500 : 400,
            color: !activePillar ? P.text : P.textLight,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "'DM Mono', monospace",
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
            onClick={() => onSelect(key)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 18px 12px",
              borderBottom: isActive
                ? `2px solid ${pillar.color}`
                : "2px solid transparent",
              transition: "all 0.2s",
              position: "relative",
              top: 1,
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? P.text : P.textLight,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "'DM Mono', monospace",
                transition: "color 0.2s",
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
