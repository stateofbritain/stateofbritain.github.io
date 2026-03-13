import P from "../theme/palette";
import PILLARS, { PILLAR_KEYS } from "./config";
import useIsMobile from "../hooks/useIsMobile";

export default function Landing({ onNavigate }) {
  const isMobile = useIsMobile();

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(24px, 4vw, 34px)",
            fontWeight: 600,
            color: P.text,
            margin: "0 0 8px",
          }}
        >
          The state of Britain, in data
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: P.textMuted,
            ...(isMobile ? {} : { maxWidth: 560 }),
            lineHeight: 1.6,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 300,
          }}
        >
          Data on whether basic needs are met, what drives economic growth,
          and how well public services perform. All sourced from official
          UK government statistics.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(auto-fit, minmax(300px, 1fr))",
          gap: isMobile ? 14 : 20,
          marginBottom: 40,
        }}
      >
        {PILLAR_KEYS.map((key, i) => {
          const pillar = PILLARS[key];
          const topicList = Object.values(pillar.topics);
          return (
            <div
              key={key}
              onClick={() => onNavigate(key)}
              style={{
                background: P.bgCard,
                border: `1px solid ${P.border}`,
                borderTop: `3px solid ${pillar.color}`,
                borderRadius: 3,
                padding: isMobile ? "16px 16px 14px" : "24px 24px 20px",
                cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s",
                boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
                animation: `fadeSlideIn 0.5s ease ${0.1 + i * 0.1}s both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(28,43,69,0.1)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 6px rgba(28,43,69,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "22px",
                  fontWeight: 600,
                  color: pillar.color,
                  margin: "0 0 6px",
                }}
              >
                {pillar.label}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: P.textMuted,
                  margin: "0 0 16px",
                  lineHeight: 1.5,
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 300,
                }}
              >
                {pillar.description}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {topicList.map((t) => (
                  <span
                    key={t.label}
                    style={{
                      fontSize: "11px",
                      color: P.textLight,
                      background: "rgba(28,43,69,0.04)",
                      padding: "3px 8px",
                      borderRadius: 2,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {t.icon} {t.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
