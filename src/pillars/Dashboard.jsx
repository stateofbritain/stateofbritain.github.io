import { useEffect, useState } from "react";
import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";
import MetricTile, { OverviewMiniTile } from "../dashboard/MetricTile";
import { METRICS } from "../dashboard/metrics";
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
  margin: "0 0 24px",
  letterSpacing: "0.02em",
};
const pStyle = {
  fontSize: "13px",
  color: P.textMuted,
  lineHeight: 1.7,
  fontFamily: "'DM Mono', monospace",
  fontWeight: 300,
  margin: "0 0 14px",
};
const noticeStyle = {
  fontSize: "11px",
  fontFamily: "'DM Mono', monospace",
  color: P.textLight,
  letterSpacing: "0.04em",
  marginBottom: 16,
  paddingLeft: 10,
  borderLeft: `2px solid ${P.border}`,
};

// ── Overview ────────────────────────────────────────────────────────

// Overview pulls live deltas from the metric registry. Pick four
// distinctive metrics per sub-tab — the rest live in the sub-tab itself.
const OVERVIEW_SECTIONS = [
  {
    key: "service-delivery",
    label: "Service Delivery",
    metricIds: [
      "sd-nhs-rtt-waiting-list",
      "sd-gp-appointments",
      "sd-court-backlog",
      "sd-asylum-backlog",
    ],
  },
  {
    key: "sovereign-capability",
    label: "Sovereign Capability",
    metricIds: [
      "sc-co2-intensity",
      "sc-defence-spending",
      "sc-ghg-emissions",
      "sc-iop-chemicals",
    ],
  },
  {
    key: "construction",
    label: "Construction",
    metricIds: [
      "bd-housing-completions",
      "bd-brick-deliveries",
      "bd-epc-new-builds",
      "bd-battery-storage",
    ],
  },
  {
    key: "quality-of-life",
    label: "Quality of Life",
    metricIds: [
      "ql-cpih-inflation",
      "ql-real-wages-monthly",
      "ql-house-price",
      "ql-gilt-yield-10y",
    ],
  },
];

const PERIOD_OPTIONS = [
  { key: "mom", label: "MoM" },
  { key: "q",   label: "3M" },
  { key: "y",   label: "1Y" },
];

function PeriodToggle({ value, onChange }) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${P.border}`,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {PERIOD_OPTIONS.map((o, i) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              padding: "6px 14px",
              background: active ? P.text : "transparent",
              color: active ? P.bgCard : P.textMuted,
              border: "none",
              borderLeft: i > 0 ? `1px solid ${P.border}` : "none",
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ label, onClick }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.querySelector("h3").style.textDecoration = "underline"; }}
      onMouseLeave={(e) => { e.currentTarget.querySelector("h3").style.textDecoration = "none"; }}
      style={{
        cursor: "pointer",
        marginBottom: 12,
        display: "flex",
        alignItems: "baseline",
        gap: 10,
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "18px",
          fontWeight: 600,
          color: P.text,
          margin: 0,
        }}
      >
        {label}
      </h3>
      <span
        style={{
          fontSize: "11px",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.06em",
        }}
      >
        →
      </span>
    </div>
  );
}

function Overview({ navigate, period }) {
  return (
    <div>
      <h2 style={{ ...h2Style, margin: "0 0 18px" }}>Dashboard</h2>
      <div style={noticeStyle}>{PLACEHOLDER_NOTICE}</div>

      {OVERVIEW_SECTIONS.map((section) => (
        <div key={section.key} style={{ marginBottom: 28 }}>
          <SectionHeader
            label={section.label}
            onClick={() => navigate("dashboard", section.key)}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 6,
            }}
          >
            {section.metricIds.map((id) => {
              const metric = METRICS[id];
              if (!metric) return null;
              return (
                <OverviewMiniTile
                  key={id}
                  metric={metric}
                  period={period}
                  href={`/dashboard/${section.key}`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sub-tab content ─────────────────────────────────────────────────

const PLACEHOLDER_NOTICE = "Illustrative tiles. Real metrics will be wired in a later phase.";

function TileGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gridAutoFlow: "row dense",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function ServiceDelivery({ period }) {
  return (
    <div>
      <h2 style={h2Style}>Service Delivery</h2>
      <p style={subStyle}>How well the state runs the services it provides.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile period={period} metric={METRICS["sd-nhs-rtt-waiting-list"]} />
        <MetricTile period={period} metric={METRICS["sd-gp-appointments"]} />
        <MetricTile period={period} metric={METRICS["sd-court-backlog"]} />
        <MetricTile period={period} metric={METRICS["sd-rail-punctuality"]} />
        <MetricTile period={period} metric={METRICS["sd-water-leakage"]} />
        <MetricTile period={period} metric={METRICS["sd-hospital-occupancy"]} />
        <MetricTile period={period} metric={METRICS["sd-mental-health-iapt"]} />
        <MetricTile period={period} metric={METRICS["sd-police-officers"]} />
        <MetricTile period={period} metric={METRICS["sd-prison-population"]} />
        <MetricTile period={period} metric={METRICS["sd-energy-bill"]} />
        <MetricTile period={period} metric={METRICS["sd-public-sector-debt"]} />
        <MetricTile period={period} metric={METRICS["sd-asylum-backlog"]} />
      </TileGrid>
    </div>
  );
}

function SovereignCapability({ period }) {
  return (
    <div>
      <h2 style={h2Style}>Sovereign Capability</h2>
      <p style={subStyle}>What Britain can produce, defend, and supply on its own.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile period={period} metric={METRICS["sc-co2-intensity"]} />
        <MetricTile period={period} metric={METRICS["sc-mfg-output"]} />
        <MetricTile period={period} metric={METRICS["sc-iop-chemicals"]} />
        <MetricTile period={period} metric={METRICS["sc-defence-spending"]} />
        <MetricTile period={period} metric={METRICS["sc-army-personnel"]} />
        <MetricTile period={period} metric={METRICS["sc-naval-escorts"]} />
        <MetricTile period={period} metric={METRICS["sc-combat-aircraft"]} />
        <MetricTile period={period} metric={METRICS["sc-ghg-emissions"]} />
        <MetricTile period={period} metric={METRICS["sc-rd-pct-gdp"]} />
        <MetricTile period={period} metric={METRICS["sc-vc-investment"]} />
        <MetricTile period={period} metric={METRICS["sc-high-growth-firms"]} />
        <MetricTile period={period} metric={METRICS["sc-productivity"]} />
      </TileGrid>
    </div>
  );
}

function Construction({ period }) {
  return (
    <div>
      <h2 style={h2Style}>Construction</h2>
      <p style={subStyle}>What the country is physically building.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile period={period} metric={METRICS["bd-housing-completions"]} />
        <MetricTile period={period} metric={METRICS["bd-brick-deliveries"]} />
        <MetricTile period={period} metric={METRICS["bd-epc-new-builds"]} />
        <MetricTile period={period} metric={METRICS["bd-fttp-coverage"]} />
        <MetricTile period={period} metric={METRICS["bd-gigabit-coverage"]} />
        <MetricTile period={period} metric={METRICS["bd-rail-electrification"]} />
        <MetricTile period={period} metric={METRICS["bd-motorway-km"]} />
        <MetricTile period={period} metric={METRICS["bd-reservoir-capacity"]} />
        <MetricTile period={period} metric={METRICS["bd-battery-storage"]} />
        <MetricTile period={period} metric={METRICS["qol-construction-output"]} />
      </TileGrid>
    </div>
  );
}

function QualityOfLife({ period }) {
  return (
    <div>
      <h2 style={h2Style}>Quality of Life</h2>
      <p style={subStyle}>What daily life in Britain looks like.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile period={period} metric={METRICS["ql-real-wages-annual"]} />
        <MetricTile period={period} metric={METRICS["ql-real-wages-monthly"]} />
        <MetricTile period={period} metric={METRICS["ql-cpih-inflation"]} />
        <MetricTile period={period} metric={METRICS["ql-house-price"]} />
        <MetricTile period={period} metric={METRICS["ql-unemployment-rate"]} />
        <MetricTile period={period} metric={METRICS["qol-monthly-gdp"]} />
        <MetricTile period={period} metric={METRICS["ql-gilt-yield-10y"]} />
        <MetricTile period={period} metric={METRICS["ql-pm25"]} />
        <MetricTile period={period} metric={METRICS["ql-tfr"]} />
        <MetricTile period={period} metric={METRICS["ql-household-size"]} />
        <MetricTile period={period} metric={METRICS["ql-life-expectancy"]} />
        <MetricTile period={period} metric={METRICS["ql-healthy-life-expectancy"]} />
        <MetricTile period={period} metric={METRICS["ql-knife-crime"]} />
        <MetricTile period={period} metric={METRICS["ql-violent-crime"]} />
        <MetricTile period={period} metric={METRICS["ql-fear-of-crime"]} />
        <MetricTile period={period} metric={METRICS["ql-suicide-rate"]} />
        <MetricTile period={period} metric={METRICS["ql-mortgage-rate"]} />
        <MetricTile period={period} metric={METRICS["ql-mortgage-approvals"]} />
        <MetricTile period={period} metric={METRICS["ql-net-migration"]} />
        <MetricTile period={period} metric={METRICS["qol-services-output"]} />
        <MetricTile period={period} metric={METRICS["ql-avg-hours"]} />
      </TileGrid>
    </div>
  );
}

// ── shell ───────────────────────────────────────────────────────────

export default function Dashboard({ subtab, navigate, isMobile: parentIsMobile }) {
  const isMobile = useIsMobile() || parentIsMobile;
  const [period, setPeriod] = useState("mom");

  useEffect(() => { window.scrollTo(0, 0); }, [subtab]);

  const renderContent = () => {
    if (!subtab) return <Overview navigate={navigate} period={period} />;
    if (subtab === "service-delivery") return <ServiceDelivery period={period} />;
    if (subtab === "sovereign-capability") return <SovereignCapability period={period} />;
    if (subtab === "construction") return <Construction period={period} />;
    if (subtab === "quality-of-life") return <QualityOfLife period={period} />;
    return <Overview navigate={navigate} period={period} />;
  };

  return (
    <div style={{ padding: "8px 0 40px", animation: "fadeSlideIn 0.4s ease both" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 32,
          borderBottom: `1px solid ${P.border}`,
          flexWrap: isMobile ? "wrap" : "nowrap",
        }}
      >
        <nav
          className={isMobile ? "scroll-hide" : undefined}
          style={{
            display: "flex",
            gap: 0,
            ...(isMobile && { overflowX: "auto", width: "100%" }),
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
        <div style={{ paddingBottom: 8, paddingRight: isMobile ? 0 : 4 }}>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
