import PILLARS from "../pillars/config";
import P from "../theme/palette";
import { track } from "../analytics";

/**
 * Pillar tab strip. Used as the inner nav inside the Data section.
 *
 * Props:
 *   activePillar  — currently-selected pillar key, or null
 *   onSelect(p, firstTopic, firstSub)  — called when a tab is clicked
 *   pillarKeys    — list of pillar keys to render (required)
 *   isMobile
 */
export default function PillarNav({ activePillar, onSelect, pillarKeys, isMobile }) {
  const keys = pillarKeys || [];
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
      {keys.map((key) => {
        const pillar = PILLARS[key];
        if (!pillar) return null;
        const isActive = key === activePillar;
        return (
          <button
            key={key}
            onClick={() => {
              track("pillar_select", { pillar: pillar.label });
              const firstTopic = Object.keys(pillar.topics)[0];
              const topicDef = pillar.topics[firstTopic];
              const firstSub = topicDef?.subtopics ? Object.keys(topicDef.subtopics)[0] : null;
              onSelect(key, firstTopic, firstSub);
            }}
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
