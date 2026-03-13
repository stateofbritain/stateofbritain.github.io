import P from "../theme/palette";
import { track } from "../analytics";

export default function TopicSidebar({ pillar, topics, activeTopic, onSelect, isMobile }) {
  if (isMobile) {
    return (
      <div
        className="scroll-hide"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 10,
          marginBottom: 10,
          borderBottom: `1px solid ${P.border}`,
        }}
      >
        {Object.entries(topics).map(([key, topic]) => {
          const isActive = key === activeTopic;
          return (
            <button
              key={key}
              onClick={() => { track("topic_select", { topic: topic.label }); onSelect(key); }}
              style={{
                background: isActive ? "rgba(28,43,69,0.07)" : "rgba(28,43,69,0.02)",
                border: isActive ? `1.5px solid ${pillar.color}` : `1px solid ${P.border}`,
                cursor: "pointer",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                borderRadius: 20,
                transition: "all 0.15s",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "13px", opacity: isActive ? 1 : 0.4 }}>
                {topic.icon}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? P.text : P.textMuted,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {topic.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 200,
        paddingRight: 20,
        borderRight: `1px solid ${P.border}`,
      }}
    >
      {Object.entries(topics).map(([key, topic]) => {
        const isActive = key === activeTopic;
        return (
          <button
            key={key}
            onClick={() => { track("topic_select", { topic: topic.label }); onSelect(key); }}
            style={{
              background: isActive ? "rgba(28,43,69,0.04)" : "transparent",
              border: "none",
              borderLeft: isActive
                ? `3px solid ${pillar.color}`
                : "3px solid transparent",
              cursor: "pointer",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderRadius: "0 3px 3px 0",
              transition: "all 0.15s",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                opacity: isActive ? 1 : 0.4,
                transition: "opacity 0.2s",
                width: 18,
                textAlign: "center",
              }}
            >
              {topic.icon}
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? P.text : P.textMuted,
                fontFamily: "'DM Mono', monospace",
                transition: "color 0.2s",
              }}
            >
              {topic.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
