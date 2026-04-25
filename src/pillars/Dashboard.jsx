import { useEffect } from "react";
import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";
import { track } from "../analytics";

const SUBTABS = [
  { key: null,                   label: "Overview",            path: [] },
  { key: "service-delivery",     label: "Service Delivery",    path: ["service-delivery"] },
  { key: "sovereign-capability", label: "Sovereign Capability", path: ["sovereign-capability"] },
  { key: "construction",         label: "Construction",        path: ["construction"] },
  { key: "quality-of-life",      label: "Quality of Life",     path: ["quality-of-life"] },
];

const ACCENT = P.navy;

const h2Style = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "clamp(24px, 4vw, 34px)",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};

const subStyle = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "13px",
  color: P.textMuted,
  margin: "0 0 28px",
  letterSpacing: "0.02em",
};

const pStyle = {
  fontSize: "13px",
  color: P.textMuted,
  lineHeight: 1.7,
  fontFamily: "'DM Mono', monospace",
  fontWeight: 300,
  margin: "0 0 16px",
};

const placeholderBox = {
  borderLeft: `3px solid ${P.grey}`,
  background: P.bgCard,
  padding: "20px 24px",
  borderRadius: 3,
  marginTop: 16,
};

function Overview() {
  return (
    <div>
      <h2 style={h2Style}>Dashboard</h2>
      <p style={subStyle}>The state of the state, at a glance.</p>
      <p style={{ ...pStyle, maxWidth: 720 }}>
        A single view of whether Britain is improving on the things that
        matter. Headline outcomes are paired with the fastest available
        proxy, so changes show up here in days or weeks rather than years.
      </p>
      <p style={{ ...pStyle, maxWidth: 720 }}>
        Four areas, each with its own tab above. Service Delivery covers
        how well the state runs the services it provides. Sovereign
        Capability covers what Britain can produce, defend, and supply on
        its own. Construction covers what the country is physically
        building. Quality of Life covers what daily life in Britain looks
        like.
      </p>
      <div style={placeholderBox}>
        <p style={{ ...pStyle, margin: 0, color: P.text, fontWeight: 500 }}>
          Tile content is being built out.
        </p>
        <p style={{ ...pStyle, margin: "8px 0 0" }}>
          Each sub-tab will show a small set of high-frequency metrics
          and proxies. Long-run series remain available under the Data
          tab.
        </p>
      </div>
    </div>
  );
}

function SubtabPlaceholder({ title, blurb }) {
  return (
    <div>
      <h2 style={h2Style}>{title}</h2>
      <p style={subStyle}>{blurb}</p>
      <div style={placeholderBox}>
        <p style={{ ...pStyle, margin: 0, color: P.text, fontWeight: 500 }}>
          Tiles in development.
        </p>
        <p style={{ ...pStyle, margin: "8px 0 0" }}>
          Headline metrics and high-frequency proxies for this area
          will appear here.
        </p>
      </div>
    </div>
  );
}

export default function Dashboard({ subtab, navigate, isMobile: parentIsMobile }) {
  const isMobile = useIsMobile() || parentIsMobile;

  useEffect(() => { window.scrollTo(0, 0); }, [subtab]);

  const renderContent = () => {
    if (!subtab) return <Overview />;
    if (subtab === "service-delivery") {
      return <SubtabPlaceholder
        title="Service Delivery"
        blurb="How well the state runs the services it provides." />;
    }
    if (subtab === "sovereign-capability") {
      return <SubtabPlaceholder
        title="Sovereign Capability"
        blurb="What Britain can produce, defend, and supply on its own." />;
    }
    if (subtab === "construction") {
      return <SubtabPlaceholder
        title="Construction"
        blurb="What the country is physically building." />;
    }
    if (subtab === "quality-of-life") {
      return <SubtabPlaceholder
        title="Quality of Life"
        blurb="What daily life in Britain looks like." />;
    }
    return <Overview />;
  };

  return (
    <div style={{ padding: "8px 0 40px", animation: "fadeSlideIn 0.4s ease both" }}>
      <nav
        className={isMobile ? "scroll-hide" : undefined}
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 32,
          borderBottom: `1px solid ${P.border}`,
          ...(isMobile && { overflowX: "auto" }),
        }}
      >
        {SUBTABS.map((tab) => {
          const active = subtab === tab.key || (!subtab && tab.key === null);
          return (
            <button
              key={tab.label}
              onClick={() => {
                track("dashboard_subtab", { subtab: tab.label });
                navigate("dashboard", ...tab.path);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: isMobile ? "8px 12px 10px" : "10px 18px 12px",
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

      {renderContent()}
    </div>
  );
}
