import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";

const PURPLE = "#7B4B8A";

export default function DebateTabs({ tabs, activeTab, onTabChange, children }) {
  const isMobile = useIsMobile();

  return (
    <div>
      <div style={{
        display: "flex",
        gap: 2,
        borderBottom: `1px solid ${P.border}`,
        marginBottom: 28,
        overflowX: isMobile ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }} className="scroll-hide">
        {tabs.map(({ key, label }) => {
          const active = key === activeTab;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? PURPLE : "transparent"}`,
                color: active ? P.text : P.textLight,
                padding: isMobile ? "8px 14px" : "8px 20px",
                fontSize: "12px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ animation: "fadeSlideIn 0.3s ease both" }} key={activeTab}>
        {children}
      </div>
    </div>
  );
}
