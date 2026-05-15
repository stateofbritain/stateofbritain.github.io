import { useState } from "react";
import P from "../../theme/palette";
import DependencyBreakdown from "../../components/DependencyBreakdown";

const h2Style = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "clamp(24px, 4vw, 34px)",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 12px",
};
const blurbStyle = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 13,
  color: P.textMuted,
  margin: "0 0 24px",
  lineHeight: 1.55,
  maxWidth: 760,
};

const DEPENDENCY_CARDS = [
  { dataset: "steel-dependency.json",              title: "Steel",                 subtitle: "Finished steel (HS 7208–7229), monthly tonnage." },
  { dataset: "pharma-dependency.json",             title: "Pharmaceuticals",       subtitle: "HS 30 medicines and active ingredients, monthly £.",       unit: "£" },
  { dataset: "gas-dependency.json",                title: "Natural gas",           subtitle: "HS 2711.11 + 2711.21, imports only.",                       unit: "£" },
  { dataset: "semiconductor-dependency.json",      title: "Semiconductors",        subtitle: "HS 8541 + 8542, imports only.",                             unit: "£" },
  { dataset: "food-dependency.json",               title: "Food",                  subtitle: "HS 02 meat · 04 dairy · 07 veg · 08 fruit · 10 cereals.",   unit: "£" },
  { dataset: "critical-minerals-dependency.json",  title: "Critical minerals",     subtitle: "UK Critical Minerals Strategy minerals (excl. PGMs).",      unit: "£" },
  { dataset: "pgms-dependency.json",               title: "Platinum-group metals", subtitle: "HS 7110 — Pt, Pd, Rh; UK secondary supply via autocatalyst recycling.", unit: "£" },
  { dataset: "petroleum-dependency.json",          title: "Refined petroleum",     subtitle: "HS 2710.12 gasoline + 2710.19 diesel/jet/heating.",         unit: "£" },
  { dataset: "crude-oil-dependency.json",          title: "Crude oil",             subtitle: "HS 2709 — UKCS production + crude imports.",                unit: "£" },
  { dataset: "aluminium-dependency.json",          title: "Aluminium",             subtitle: "HS 76 — raw + downstream aluminium products.",              unit: "£" },
  { dataset: "copper-dependency.json",             title: "Copper",                subtitle: "HS 74 — imports only; near-zero UK production.",            unit: "£" },
  { dataset: "polymers-dependency.json",           title: "Polymers",              subtitle: "HS 39 — plastics resin + downstream products.",             unit: "£" },
  { dataset: "fertilisers-dependency.json",        title: "Fertilisers",           subtitle: "HS 31 — nitrogen, phosphate, potash, compounds.",           unit: "£" },
  { dataset: "tropical-dependency.json",           title: "Coffee, tea & cocoa",   subtitle: "HS 09 + 18 — tropical commodities, no domestic production.", unit: "£" },
];

function DependencyGrid() {
  const [expandedKey, setExpandedKey] = useState(null);
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
      gridAutoFlow: "dense",
    }}>
      {DEPENDENCY_CARDS.map((card) => (
        <DependencyBreakdown
          key={card.dataset}
          dataset={card.dataset}
          title={card.title}
          subtitle={card.subtitle}
          unit={card.unit}
          isExpanded={expandedKey === card.dataset}
          onToggle={(next) => {
            setExpandedKey((prev) => {
              if (next) return card.dataset;
              return prev === card.dataset ? null : prev;
            });
          }}
        />
      ))}
    </div>
  );
}

export default function StrategicDependencies() {
  return (
    <div style={{ padding: "8px 0 40px", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={h2Style}>Strategic Dependencies</h2>
      <p style={blurbStyle}>
        Where the goods Britain depends on come from, with imports split by trade-partner{" "}
        <a href="/data/state/foreignAffairs" style={{ color: P.teal, textDecoration: "underline" }}>
          UN alignment
        </a>
        . Country of origin reflects last point of treatment, as recorded by HMRC; full upstream supply history is not available.
      </p>
      <DependencyGrid />
    </div>
  );
}
