import P from "../theme/palette";
import { track } from "../analytics";

const TABS = [
  { key: "dashboard", label: "Dashboard", path: ["dashboard"] },
  { key: "data",      label: "Data",      path: ["data"] },
  { key: "policy",    label: "Policy",    path: ["policy"] },
];

const ACCENT = P.sienna;

function isActiveTab(tabKey, section) {
  if (tabKey === "dashboard") return section === null || section === "dashboard";
  return section === tabKey;
}

export default function TopNav({ section, onNavigate, isMobile }) {
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
      {TABS.map((tab) => {
        const active = isActiveTab(tab.key, section);
        return (
          <button
            key={tab.key}
            onClick={() => {
              track("topnav_select", { tab: tab.key });
              onNavigate(...tab.path);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: isMobile ? "8px 14px 10px" : "10px 22px 12px",
              borderBottom: active
                ? `2px solid ${ACCENT}`
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
                fontWeight: active ? 500 : 400,
                color: active ? P.text : P.textLight,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "'DM Mono', monospace",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
