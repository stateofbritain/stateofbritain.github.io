import { useEffect, useState } from "react";
import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";
import Tile, { MiniTile } from "../components/Tile";
import MetricTile from "../dashboard/MetricTile";
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

// Standard 24-month range for monthly tiles
const RANGE_MONTHLY_2Y = { start: "Apr 2024", end: "Apr 2026" };
const RANGE_QUARTERLY_2Y = { start: "Q2 2024", end: "Q1 2026" };

// ── Overview ────────────────────────────────────────────────────────

// Each metric carries deltas across the three available windows; the
// Overview's period toggle picks which one is shown.
const OVERVIEW_SERVICE_DELIVERY = [
  { title: "NHS RTT waiting list",     direction: "up-bad",  deltas: { mom: { percent: -1.2 }, q:  { percent: -3.5 },  y: { percent: -6.4 } } },
  { title: "A&E 4-hour standard",      direction: "up-good", deltas: { mom: { percent: 1.8 },  q:  { percent: 3.2 },   y: { percent: 5.5 } } },
  { title: "Police 999 answer time",   direction: "up-bad",  deltas: { mom: { percent: -1.0 }, q:  { percent: -3.5 },  y: { percent: -8.2 } } },
  { title: "Asylum decisions backlog", direction: "up-bad",  deltas: { mom: { percent: -4.2 }, q:  { percent: -12.5 }, y: { percent: -41.3 } } },
];

const OVERVIEW_SOVEREIGN_CAPABILITY = [
  { title: "Renewable share of generation", direction: "up-good", deltas: { mom: { percent: 2.1 },  q: { percent: 4.8 },   y: { percent: 9.3 } } },
  { title: "UK gas storage",                direction: "neutral", deltas: { mom: { percent: -8.4 }, q: { percent: -32.0 }, y: { percent: -10.0 } } },
  { title: "UK regular forces",             direction: "up-good", deltas: { mom: { percent: -0.7 }, q: { percent: -1.5 },  y: { percent: -3.4 } } },
  { title: "Food self-sufficiency",         direction: "up-good", deltas: { mom: { percent: -0.3 }, q: { percent: -0.5 },  y: { percent: -1.8 } } },
];

const OVERVIEW_CONSTRUCTION = [
  { title: "Housing completions", direction: "up-good", deltas: { mom: { percent: 3.8 },  q: { percent: 9.2 },  y: { percent: 14.5 } } },
  { title: "Brick deliveries",    direction: "up-good", deltas: { mom: { percent: 5.2 },  q: { percent: 12.4 }, y: { percent: 21.0 } } },
  { title: "Planning approvals",  direction: "up-good", deltas: { mom: { percent: -1.8 }, q: { percent: -3.2 }, y: { percent: -7.0 } } },
  { title: "NSIP consents (24m)", direction: "up-good", deltas: { mom: { value: 1 },      q: { value: 2 },      y: { value: 3 } } },
];

const OVERVIEW_QUALITY_OF_LIFE = [
  { title: "Real wages",               direction: "up-good", deltas: { mom: { percent: 0.3 },  q: { percent: 0.4 },  y: { percent: 1.1 } } },
  { title: "CPIH inflation",           direction: "up-bad",  deltas: { mom: { percent: -0.2 }, q: { percent: -0.4 }, y: { percent: -0.8 } } },
  { title: "House price to earnings",  direction: "up-bad",  deltas: { mom: { percent: -0.2 }, q: { percent: -0.6 }, y: { percent: -1.5 } } },
  { title: "Life expectancy at birth", direction: "up-good", deltas: { mom: { percent: 0.05 }, q: { percent: 0.07 }, y: { percent: 0.1 } } },
];

const OVERVIEW_SECTIONS = [
  { key: "service-delivery",     label: "Service Delivery",     items: OVERVIEW_SERVICE_DELIVERY },
  { key: "sovereign-capability", label: "Sovereign Capability", items: OVERVIEW_SOVEREIGN_CAPABILITY },
  { key: "construction",         label: "Construction",         items: OVERVIEW_CONSTRUCTION },
  { key: "quality-of-life",      label: "Quality of Life",      items: OVERVIEW_QUALITY_OF_LIFE },
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

function Overview({ navigate }) {
  const [period, setPeriod] = useState("mom");

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h2 style={{ ...h2Style, margin: 0 }}>Dashboard</h2>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>
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
            {section.items.map((item) => (
              <MiniTile
                key={item.title}
                title={item.title}
                delta={item.deltas[period]}
                direction={item.direction}
                href={`/dashboard/${section.key}`}
              />
            ))}
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

function ServiceDelivery() {
  return (
    <div>
      <h2 style={h2Style}>Service Delivery</h2>
      <p style={subStyle}>How well the state runs the services it provides.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile metric={METRICS["sd-nhs-rtt-waiting-list"]} />
        <Tile
          title="A&E 4-hour standard"
          value={73}
          unit="%"
          format="percent"
          delta={{ percent: 1.8, period: "vs prior month" }}
          direction="up-good"
          sparkline={[
            65, 64, 63, 65, 66, 65, 66, 67, 68, 67, 69, 68,
            69, 70, 69, 70, 71, 70, 72, 71, 72, 71, 72, 73,
          ]}
          sparklineRange={RANGE_MONTHLY_2Y}
          source="NHS England"
          asOf="May 2026"
        />
        <Tile
          title="Police 999 answer time"
          value={8.2}
          unit="seconds (mean)"
          format="raw"
          delta={{ percent: -3.5, period: "vs prior quarter" }}
          direction="up-bad"
          sparkline={[10.9, 10.6, 10.3, 10.0, 9.5, 9.0, 8.6, 8.2]}
          sparklineRange={RANGE_QUARTERLY_2Y}
          source="Home Office"
          asOf="Q1 2026"
        />
        <MetricTile metric={METRICS["sd-asylum-backlog"]} />
      </TileGrid>
    </div>
  );
}

function SovereignCapability() {
  return (
    <div>
      <h2 style={h2Style}>Sovereign Capability</h2>
      <p style={subStyle}>What Britain can produce, defend, and supply on its own.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile metric={METRICS["sc-co2-intensity"]} />
        <Tile
          title="UK gas storage"
          value={2.1}
          unit="TWh"
          format="raw"
          delta={{ percent: -8.4, period: "vs 7-day prior" }}
          direction="neutral"
          sparkline={[
            5.2, 5.6, 5.9, 5.4, 4.6, 3.9, 3.5, 3.4, 3.5, 3.9, 4.6, 5.4,
            5.5, 5.7, 5.4, 4.7, 3.8, 3.3, 2.9, 2.6, 2.5, 2.3, 2.2, 2.1,
          ]}
          sparklineRange={RANGE_MONTHLY_2Y}
          source="NESO"
          asOf="22 April"
        />
        <Tile
          title="UK regular forces"
          value={142000}
          unit="personnel"
          delta={{ percent: -0.7, period: "vs prior quarter" }}
          direction="up-good"
          sparkline={[151, 150, 148, 147, 146, 144, 143, 142].map((v) => v * 1000)}
          sparklineRange={RANGE_QUARTERLY_2Y}
          source="MoD"
          asOf="Q1 2026"
        />
        <Tile
          title="Food self-sufficiency"
          value={60}
          unit="%"
          format="percent"
          delta={{ percent: -0.3, period: "vs prior year" }}
          direction="up-good"
          sparkline={[63, 62, 62, 61, 61, 61, 60, 60, 60, 60, 60, 60]}
          sparklineRange={{ start: "2014", end: "2025" }}
          source="DEFRA"
          asOf="2025"
        />
      </TileGrid>
    </div>
  );
}

function Construction() {
  return (
    <div>
      <h2 style={h2Style}>Construction</h2>
      <p style={subStyle}>What the country is physically building.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile metric={METRICS["bd-housing-completions"]} />
        <Tile
          title="Brick deliveries"
          value={154}
          unit="million / month"
          delta={{ percent: 5.2, period: "vs prior month" }}
          direction="up-good"
          sparkline={[
            116, 119, 122, 124, 121, 119, 124, 127, 129, 128, 127, 130,
            128, 132, 134, 138, 140, 142, 145, 148, 150, 151, 152, 154,
          ]}
          sparklineRange={RANGE_MONTHLY_2Y}
          source="DBT (proxy for housing)"
          asOf="Apr 2026"
        />
        <Tile
          title="Planning approvals"
          value={18200}
          unit="major + minor"
          delta={{ percent: -1.8, period: "vs prior month" }}
          direction="up-good"
          sparkline={[
            21.0, 20.8, 20.5, 20.4, 20.3, 20.2, 20.0, 19.8, 19.7, 19.6, 19.6, 19.5,
            19.5, 19.2, 19.0, 18.8, 18.6, 18.5, 18.4, 18.3, 18.4, 18.3, 18.2, 18.2,
          ].map((v) => v * 1000)}
          sparklineRange={RANGE_MONTHLY_2Y}
          source="DLUHC"
          asOf="Mar 2026"
        />
        <Tile
          title="NSIP consents (rolling 24m)"
          value={11}
          unit="decisions"
          format="raw"
          delta={{ value: 3, period: "vs same window prior" }}
          direction="up-good"
          sparkline={[
            0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5,
            5, 5, 6, 7, 7, 8, 9, 9, 10, 10, 11, 11,
          ]}
          sparklineRange={RANGE_MONTHLY_2Y}
          source="Planning Inspectorate"
          asOf="Apr 2026"
        />
      </TileGrid>
    </div>
  );
}

function QualityOfLife() {
  return (
    <div>
      <h2 style={h2Style}>Quality of Life</h2>
      <p style={subStyle}>What daily life in Britain looks like.</p>
      <div style={noticeStyle}>Some tiles still illustrative; live tiles wire as fetch scripts land.</div>
      <TileGrid>
        <MetricTile metric={METRICS["ql-real-wages"]} />
        <MetricTile metric={METRICS["ql-cpih-inflation"]} />
        <Tile
          title="House price to earnings"
          value={8.1}
          unit="ratio"
          format="raw"
          delta={{ percent: -0.6, period: "vs prior quarter" }}
          direction="up-bad"
          sparkline={[8.7, 8.6, 8.6, 8.5, 8.4, 8.3, 8.2, 8.1]}
          sparklineRange={RANGE_QUARTERLY_2Y}
          source="ONS"
          asOf="Q1 2026"
        />
        <Tile
          title="Life expectancy at birth"
          value={81.2}
          unit="years"
          format="raw"
          delta={{ percent: 0.1, period: "vs prior year" }}
          direction="up-good"
          sparkline={[81.4, 81.3, 81.2, 80.4, 80.6, 80.7, 80.8, 80.9, 81.0, 81.1, 81.2]}
          sparklineRange={{ start: "2014", end: "2024" }}
          source="ONS"
          asOf="2024"
        />
      </TileGrid>
    </div>
  );
}

// ── shell ───────────────────────────────────────────────────────────

export default function Dashboard({ subtab, navigate, isMobile: parentIsMobile }) {
  const isMobile = useIsMobile() || parentIsMobile;

  useEffect(() => { window.scrollTo(0, 0); }, [subtab]);

  const renderContent = () => {
    if (!subtab) return <Overview navigate={navigate} />;
    if (subtab === "service-delivery") return <ServiceDelivery />;
    if (subtab === "sovereign-capability") return <SovereignCapability />;
    if (subtab === "construction") return <Construction />;
    if (subtab === "quality-of-life") return <QualityOfLife />;
    return <Overview navigate={navigate} />;
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
