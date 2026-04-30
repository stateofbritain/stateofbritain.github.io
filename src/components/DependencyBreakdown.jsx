import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import P from "../theme/palette";
import { useJsonDataset } from "../hooks/useDataset";
import {
  ALIGNMENT_BUCKETS, BUCKET_LABELS, BUCKET_DESCRIPTIONS, BUCKET_THRESHOLDS,
} from "../dashboard/alignmentBuckets";

// Bucket colours, anchored on the site palette. Domestic = navy
// (most "ours"); aligned = teal; neutral = parchment; low = sienna.
// Unknown/unclassified imports fall through to a soft grey.
const BUCKET_COLOR = {
  domestic: P.navy,
  aligned: P.teal,
  neutral: P.parchment,
  low: P.sienna,
  unknown: "#c8c4ba",
};

const STACK_KEYS = ["domestic", "aligned", "neutral", "low", "unknown"];

const CARD = {
  background: P.bgCard,
  border: `1px solid ${P.border}`,
  borderRadius: 4,
  marginBottom: 14,
};
// Collapsed tiles are narrow (4-5 across on desktop, 2 on mobile);
// expanded tiles take the full row and need more breathing room.
const CARD_PADDING_COLLAPSED = "14px 12px 12px";
const CARD_PADDING_EXPANDED = "20px 22px 18px";

/**
 * Strategic dependency widget for one commodity.
 *
 * Reads a v1 dataset shaped like steel-dependency.json (production +
 * import buckets per month, plus a byPartner totals list) and renders:
 *   - Latest-month four-way stacked bar (domestic / aligned / neutral / low)
 *   - Headline alignment numbers
 *   - Click-to-expand: monthly stacked area + top partners list
 *
 * @param {Object} props
 * @param {string} props.dataset   filename in /public/data
 * @param {string} props.title
 * @param {string} props.unit         label suffix for tonnage values (default "tonnes")
 * @param {string} [props.subtitle]
 * @param {string} [props.href]       optional click-through (e.g. to a /data page)
 */
export default function DependencyBreakdown({
  dataset,
  title,
  unit = "tonnes",
  subtitle,
  href,
  // Optional controlled-expanded API. When `isExpanded` and `onToggle`
  // are both supplied, the parent owns the state — useful when a row of
  // cards needs to ensure only one is open at a time. Falls back to
  // local state otherwise.
  isExpanded,
  onToggle,
}) {
  const { data, loading, error } = useJsonDataset(dataset);
  const controlled = typeof isExpanded === "boolean" && typeof onToggle === "function";
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = controlled ? isExpanded : localExpanded;
  const setExpanded = (next) => {
    const value = typeof next === "function" ? next(expanded) : next;
    if (controlled) onToggle(value);
    else setLocalExpanded(value);
  };
  const [selectedFacetKey, setSelectedFacetKey] = useState(null);
  // 1st-order = HMRC COO (where last substantially transformed)
  // 2nd-order = re-attributed by feedstock origin (where the partner's
  //             upstream inputs came from). Only available when the
  //             dataset has been augmented; toggle is hidden otherwise.
  const [orderMode, setOrderMode] = useState("1st");
  const cardRef = useRef(null);

  const compositeMonthly = data?.monthly || [];
  const compositeByPartner = data?.byPartner || [];
  const facets = data?.facets || null;
  const compositeLatest = compositeMonthly[compositeMonthly.length - 1] || null;

  // When a facet is selected, swap the bar/trend/partners view to that
  // facet's data; otherwise show the composite. Each facet carries its
  // own monthly + byPartner under data.facets.{key}.
  const activeFacet = selectedFacetKey && facets ? facets[selectedFacetKey] : null;

  const monthly = activeFacet ? activeFacet.monthly : compositeMonthly;
  const byPartner = activeFacet ? activeFacet.byPartner : compositeByPartner;
  const latest = activeFacet
    ? (activeFacet.monthly[activeFacet.monthly.length - 1] || null)
    : compositeLatest;

  // Show toggle if any monthly row carries 2nd-order data
  const has2ndOrder = monthly.some((m) => m.imports2ndOrder);
  const importsKey = orderMode === "2nd" && has2ndOrder ? "imports2ndOrder" : "imports";

  const latestRow = useMemo(() => {
    if (!latest) return null;
    const imports = latest[importsKey] || latest.imports || {};
    return {
      domestic: latest.production || 0,
      aligned: imports.aligned || 0,
      neutral: imports.neutral || 0,
      low: imports.low || 0,
      unknown: imports.unknown || 0,
    };
  }, [latest, importsKey]);

  const stackedSeries = useMemo(() => {
    return monthly.map((m) => {
      const imp = m[importsKey] || m.imports || {};
      return {
        month: m.month,
        domestic: m.production || 0,
        aligned: imp.aligned || 0,
        neutral: imp.neutral || 0,
        low: imp.low || 0,
        unknown: imp.unknown || 0,
      };
    });
  }, [monthly, importsKey]);

  // Reset facet selection when the card collapses.
  useEffect(() => {
    if (!expanded) setSelectedFacetKey(null);
  }, [expanded]);

  // Click-outside + Esc to close, mirroring the Tile.jsx pattern.
  useEffect(() => {
    if (!expanded) return;
    const onMouseDown = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const placeholderStyle = { ...CARD, padding: CARD_PADDING_COLLAPSED };
  if (loading) return <div style={placeholderStyle}><Loading title={title} /></div>;
  if (error || !data) return <div style={placeholderStyle}><ErrorRow title={title} message={error ?? "no data"} /></div>;
  if (!latest) return <div style={placeholderStyle}><ErrorRow title={title} message="no rows" /></div>;

  // When expanded the card spans both columns of the parent grid so
  // the bar + trend chart have room to breathe; matches Tile.jsx.
  const cardStyle = expanded
    ? {
        ...CARD,
        padding: CARD_PADDING_EXPANDED,
        gridColumn: "1 / -1",
        boxShadow: "0 6px 18px rgba(28,43,69,0.10)",
        cursor: "default",
      }
    : {
        ...CARD,
        padding: CARD_PADDING_COLLAPSED,
        boxShadow: "0 1px 4px rgba(28,43,69,0.04)",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      };

  const onCardClick = (e) => {
    if (expanded) return;
    e.preventDefault();
    setExpanded(true);
  };

  return (
    <div
      ref={cardRef}
      onClick={onCardClick}
      onMouseEnter={!expanded ? (e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(28,43,69,0.10)";
      } : undefined}
      onMouseLeave={!expanded ? (e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(28,43,69,0.04)";
      } : undefined}
      style={cardStyle}
    >
      {expanded ? (
        <ExpandedCard
          title={activeFacet ? `${title} · ${activeFacet.label}` : title}
          subtitle={subtitle}
          latest={latest}
          row={latestRow}
          monthly={stackedSeries}
          byPartner={byPartner}
          facets={facets}
          selectedFacetKey={selectedFacetKey}
          onSelectFacet={setSelectedFacetKey}
          orderMode={orderMode}
          setOrderMode={setOrderMode}
          has2ndOrder={has2ndOrder}
          unit={unit}
          onClose={() => setExpanded(false)}
        />
      ) : (
        <CollapsedCard
          title={title}
          row={latestRow}
          latest={latest}
          unit={unit}
        />
      )}
    </div>
  );
}

function CollapsedCard({ title, row, latest, unit }) {
  return (
    <>
      <div style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.10em",
        color: P.textLight,
        fontFamily: "'DM Mono', monospace",
        marginBottom: 8,
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <Donut row={row} size={108} thickness={22} />
      </div>
      <div style={{
        textAlign: "center",
        fontFamily: "'Playfair Display', serif",
        fontSize: 18,
        fontWeight: 600,
        color: P.text,
        lineHeight: 1.15,
      }}>
        {latest.alignedShare != null ? `${latest.alignedShare.toFixed(0)}%` : "—"}
        <span style={{ fontSize: 11, color: P.textMuted, fontFamily: "'DM Mono', monospace", fontWeight: 400, marginLeft: 3 }}>
          aligned
        </span>
      </div>
      <div style={{
        textAlign: "center",
        fontSize: 10,
        color: P.textLight,
        fontFamily: "'DM Mono', monospace",
        marginTop: 3,
        letterSpacing: "0.03em",
      }}>
        {latest.domesticShare != null ? `${latest.domesticShare.toFixed(0)}% domestic` : ""}
        {latest.domesticShare != null ? " · " : ""}
        {latest.month}
      </div>
    </>
  );
}

function ExpandedCard({
  title, subtitle, latest, row, monthly, byPartner, facets,
  selectedFacetKey, onSelectFacet,
  orderMode, setOrderMode, has2ndOrder,
  unit, onClose,
}) {
  return (
    <>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        marginBottom: 14,
        flexWrap: "wrap",
      }}>
        <div>
          <h3 style={{
            fontSize: 22,
            fontWeight: 600,
            color: P.text,
            fontFamily: "'Playfair Display', serif",
            margin: 0,
          }}>
            {title}
          </h3>
          {subtitle && (
            <div style={{ fontSize: 11, color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em", marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {has2ndOrder && setOrderMode && (
            <OrderModeToggle value={orderMode} onChange={setOrderMode} />
          )}
          {selectedFacetKey && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelectFacet(null); }}
              style={{
                background: "transparent",
                border: "none",
                color: P.textMuted,
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              ← all
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              background: "transparent",
              border: "none",
              color: P.textMuted,
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            Close ↑
          </button>
        </div>
      </div>
      <StackedBar row={row} unit={unit} />
      <Footnote latest={latest} unit={unit} />
      {facets && (
        <FacetGrid
          facets={facets}
          selectedKey={selectedFacetKey}
          onSelect={onSelectFacet}
          unit={unit}
        />
      )}
      <Expanded monthly={monthly} byPartner={byPartner} unit={unit} />
    </>
  );
}

/**
 * Renders a sub-grid of small donut cards, one per facet, showing each
 * sub-category's import bucket mix and aligned share. Used by composite
 * cards (e.g. food, where one card aggregates 5 HS chapters).
 */
function FacetGrid({ facets, unit, selectedKey, onSelect }) {
  const entries = Object.entries(facets);
  if (entries.length === 0) return null;
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${P.border}` }}>
      <SectionLabel>
        Per-category breakdown {onSelect ? "— click a tile to drill in" : ""}
      </SectionLabel>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
      }}>
        {entries.map(([key, facet]) => {
          const li = facet.latest || {};
          const row = {
            domestic: li.production || 0,
            aligned: li.imports?.aligned || 0,
            neutral: li.imports?.neutral || 0,
            low: li.imports?.low || 0,
            unknown: li.imports?.unknown || 0,
          };
          const total = row.domestic + row.aligned + row.neutral + row.low + row.unknown;
          const isSelected = selectedKey === key;
          const isClickable = !!onSelect;
          return (
            <div
              key={key}
              onClick={isClickable ? (e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : key);
              } : undefined}
              onMouseEnter={isClickable && !isSelected ? (e) => {
                e.currentTarget.style.background = "rgba(28,43,69,0.03)";
              } : undefined}
              onMouseLeave={isClickable && !isSelected ? (e) => {
                e.currentTarget.style.background = P.bgCard;
              } : undefined}
              style={{
                border: `1px solid ${isSelected ? P.navy : P.border}`,
                borderRadius: 3,
                padding: "10px 10px 8px",
                background: isSelected ? "rgba(28,43,69,0.05)" : P.bgCard,
                cursor: isClickable ? "pointer" : "default",
                transition: "background 0.12s, border-color 0.12s",
              }}>
              <div style={{
                fontSize: 10,
                color: P.textLight,
                fontFamily: "'DM Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
                textAlign: "center",
              }}>
                {facet.label}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Donut row={row} size={70} thickness={14} />
              </div>
              <div style={{
                textAlign: "center",
                marginTop: 6,
                fontFamily: "'Playfair Display', serif",
                fontSize: 14,
                fontWeight: 600,
                color: P.text,
              }}>
                {li.domesticShare != null ? `${li.domesticShare.toFixed(0)}% domestic` : (li.alignedShare != null ? `${li.alignedShare.toFixed(0)}% aligned` : "—")}
              </div>
              <div style={{
                textAlign: "center",
                fontSize: 10,
                color: P.textLight,
                fontFamily: "'DM Mono', monospace",
                marginTop: 2,
              }}>
                {li.alignedShare != null ? `+${li.alignedShare.toFixed(0)}% aligned imp` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CollapsedView({ row, latest, unit }) {
  const total = STACK_KEYS.reduce((s, k) => s + (row[k] || 0), 0);
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: 18,
      alignItems: "center",
      marginTop: 4,
    }}>
      <Donut row={row} size={140} thickness={28} />
      <div>
        <KeyStat
          label="Aligned"
          value={latest.alignedShare != null ? `${latest.alignedShare.toFixed(1)}%` : "—"}
          color={BUCKET_COLOR.aligned}
        />
        <KeyStat
          label="Domestic"
          value={latest.domesticShare != null ? `${latest.domesticShare.toFixed(1)}%` : "—"}
          color={BUCKET_COLOR.domestic}
        />
        <KeyStat
          label="Total supply"
          value={formatTonnes(total, unit)}
        />
      </div>
    </div>
  );
}

function ExpandedView({ row, latest, monthly, byPartner, unit }) {
  return (
    <>
      <StackedBar row={row} unit={unit} />
      <Footnote latest={latest} unit={unit} />
      <Expanded monthly={monthly} byPartner={byPartner} unit={unit} />
    </>
  );
}

function KeyStat({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: 10,
        color: P.textLight,
        fontFamily: "'DM Mono', monospace",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        {color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />}
        {label}
      </div>
      <div style={{
        fontSize: 20,
        fontWeight: 600,
        fontFamily: "'Playfair Display', serif",
        color: P.text,
        marginTop: 2,
      }}>
        {value}
      </div>
    </div>
  );
}

/**
 * Lightweight SVG donut. Renders one filled segment per non-zero key
 * in `row`, in the order defined by STACK_KEYS so colours line up
 * with the bar chart and legend.
 */
function Donut({ row, size = 120, thickness = 24 }) {
  const total = STACK_KEYS.reduce((s, k) => s + (row[k] || 0), 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = (size / 2) - 2;
  const rInner = rOuter - thickness;

  const segments = [];
  let acc = 0;
  for (const k of STACK_KEYS) {
    const v = row[k] || 0;
    if (v <= 0) continue;
    const startAngle = (acc / total) * 360;
    const endAngle = ((acc + v) / total) * 360;
    acc += v;
    segments.push({
      key: k,
      d: arcPath(cx, cy, rOuter, rInner, startAngle, endAngle),
      color: BUCKET_COLOR[k],
    });
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {segments.map((s) => (
        <path key={s.key} d={s.d} fill={s.color} stroke="#fff" strokeWidth={1} />
      ))}
    </svg>
  );
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  // Special-case a full 360° segment (single-bucket pie); split into
  // two halves so the arc doesn't collapse to a zero-length path.
  if (Math.abs(endAngle - startAngle) >= 359.999) {
    const halfA = arcPath(cx, cy, rOuter, rInner, startAngle, startAngle + 180);
    const halfB = arcPath(cx, cy, rOuter, rInner, startAngle + 180, endAngle);
    return `${halfA} ${halfB}`;
  }
  const outerStart = polar(cx, cy, rOuter, startAngle);
  const outerEnd = polar(cx, cy, rOuter, endAngle);
  const innerEnd = polar(cx, cy, rInner, endAngle);
  const innerStart = polar(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    "M", outerStart.x, outerStart.y,
    "A", rOuter, rOuter, 0, largeArc, 1, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", rInner, rInner, 0, largeArc, 0, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}

function polar(cx, cy, r, angleDeg) {
  // 0° points to 12-o'clock; clockwise from there.
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function Header({ title, subtitle, latest, href }) {
  const titleStyle = {
    fontSize: 18,
    fontWeight: 600,
    color: P.text,
    fontFamily: "'Playfair Display', serif",
    margin: 0,
    cursor: href ? "pointer" : "default",
  };
  return (
    <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
      <div>
        {href ? <a href={href} style={{ color: "inherit", textDecoration: "none" }}><h3 style={titleStyle}>{title}</h3></a> : <h3 style={titleStyle}>{title}</h3>}
        {subtitle && (
          <div style={{ fontSize: 11, color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em", marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" }}>
        {latest.month}
      </div>
    </div>
  );
}

function StackedBar({ row, unit }) {
  const total = STACK_KEYS.reduce((s, k) => s + (row[k] || 0), 0);
  if (total === 0) return null;

  const segments = STACK_KEYS
    .map((k) => ({ key: k, value: row[k] || 0 }))
    .filter((s) => s.value > 0);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex",
        height: 32,
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${P.border}`,
      }}>
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          return (
            <div
              key={seg.key}
              title={`${labelFor(seg.key)}: ${formatTonnes(seg.value, unit)} (${pct.toFixed(1)}%)`}
              style={{
                flexBasis: `${pct}%`,
                background: BUCKET_COLOR[seg.key],
                transition: "flex-basis 0.2s",
              }}
            />
          );
        })}
      </div>
      <Legend2 />
    </div>
  );
}

function Legend2() {
  const items = [
    { key: "domestic", label: "Domestic production" },
    { key: "aligned", label: `Aligned (≥${BUCKET_THRESHOLDS.alignedMin}%)` },
    { key: "neutral", label: `Neutral (${BUCKET_THRESHOLDS.neutralMin}–${BUCKET_THRESHOLDS.alignedMin}%)` },
    { key: "low", label: `Low alignment (<${BUCKET_THRESHOLDS.neutralMin}%)` },
  ];
  return (
    <div style={{
      display: "flex",
      gap: 14,
      flexWrap: "wrap",
      marginTop: 8,
      fontSize: 11,
      color: P.textMuted,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.02em",
    }}>
      {items.map((it) => (
        <span key={it.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: BUCKET_COLOR[it.key], display: "inline-block" }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Footnote({ latest, unit }) {
  const totalImports = latest.totalImports || 0;
  const totalSupply = (latest.production || 0) + totalImports;
  const items = [
    { label: "Total supply", value: formatTonnes(totalSupply, unit) },
    { label: "Aligned share", value: latest.alignedShare != null ? `${latest.alignedShare.toFixed(1)}%` : "—" },
    { label: "Domestic share", value: latest.domesticShare != null ? `${latest.domesticShare.toFixed(1)}%` : "—" },
  ];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: 12,
      marginTop: 10,
      paddingTop: 10,
      borderTop: `1px dashed ${P.border}`,
    }}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={{ fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {it.label}
          </div>
          <div style={{ fontSize: 16, color: P.text, fontFamily: "'Playfair Display', serif", fontWeight: 600, marginTop: 2 }}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpandToggle({ expanded, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: P.textMuted,
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
        marginTop: 12,
        padding: 0,
      }}
    >
      {expanded ? "Hide trend & partners ↑" : "Show trend & top partners ↓"}
    </button>
  );
}

function Expanded({ monthly, byPartner, unit }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${P.border}` }}>
      <SectionLabel>Supply trend</SectionLabel>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthly} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 10, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v) => formatTonnes(v, unit)} tick={{ fontSize: 10, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} width={64} />
            <Tooltip
              contentStyle={{ background: P.text, border: "none", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 11 }}
              itemStyle={{ color: P.bgCard }}
              labelStyle={{ color: P.bgCard, fontWeight: 500 }}
              formatter={(v) => formatTonnes(v, unit)}
            />
            {STACK_KEYS.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stackId="1"
                name={labelFor(k)}
                fill={BUCKET_COLOR[k]}
                stroke={BUCKET_COLOR[k]}
                fillOpacity={0.85}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: P.textMuted }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <SectionLabel style={{ marginTop: 18 }}>Top trade partners (last 24 months)</SectionLabel>
      <PartnerList partners={byPartner.slice(0, 12)} unit={unit} />
    </div>
  );
}

function PartnerList({ partners, unit }) {
  if (partners.length === 0) {
    return <div style={{ fontSize: 12, color: P.textLight, fontFamily: "'DM Mono', monospace" }}>No partners with import flows in window.</div>;
  }
  // Show the feedstock column only if any partner has feedstock data.
  const hasFeedstock = partners.some((p) => p.feedstockTopOrigins?.length > 0);
  const cols = hasFeedstock
    ? "1.4fr 0.9fr 1.2fr 0.9fr"
    : "1.4fr 1fr 1fr";
  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: cols, alignItems: "baseline",
        padding: "4px 0", fontFamily: "'DM Mono', monospace",
        fontSize: 10, color: P.textLight, textTransform: "uppercase",
        letterSpacing: "0.06em", borderBottom: `1px solid ${P.border}`,
      }}>
        <div>Partner</div>
        <div style={{ textAlign: "right" }}>1st-order</div>
        {hasFeedstock && <div style={{ textAlign: "right" }}>Feedstock origin</div>}
        <div style={{ textAlign: "right" }}>Imports</div>
      </div>
      {partners.map((p) => (
        <div
          key={p.iso3}
          style={{
            display: "grid", gridTemplateColumns: cols, alignItems: "baseline",
            padding: "6px 0", borderBottom: `1px dashed ${P.border}`,
            fontFamily: "'DM Mono', monospace", fontSize: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BucketDot bucket={p.bucket} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: P.text }}>{p.country}</span>
          </div>
          <div style={{ color: P.textMuted, textAlign: "right" }}>
            {p.alignmentPct != null ? `${p.alignmentPct.toFixed(0)}% aligned` : "—"}
          </div>
          {hasFeedstock && <FeedstockCell partner={p} />}
          <div style={{ color: P.text, textAlign: "right", fontWeight: 600 }}>
            {formatTonnes(p.importTonnes, unit)}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Feedstock-origin cell. Three render states:
 *   - data not checked         → em-dash
 *   - checked, ≥5% re-rolling  → top upstream origin + colour-dot + fraction
 *   - checked, <5% re-rolling  → "≈ direct" (genuine primary producer)
 */
function FeedstockCell({ partner }) {
  const tops = partner.feedstockTopOrigins;
  const fraction = partner.reRollingFraction;
  // Coefficients haven't been computed for this partner (missing ISO map etc.)
  if (tops == null || fraction == null) {
    return <div style={{ textAlign: "right", color: P.textLight }}>—</div>;
  }
  // Negligible re-rolling: partner is a primary producer at the
  // semi-finished level. Note: this doesn't speak to deeper raw-material
  // origin (iron ore, coking coal, bauxite, etc.) which sits one layer
  // beneath what trade-stat re-rolling can show.
  if (fraction < 5 || tops.length === 0) {
    return (
      <div style={{ textAlign: "right", color: P.textLight, fontSize: 11 }}
           title="Partner doesn't re-roll significant semi-finished imports. Note: this doesn't speak to deeper raw-material origin (e.g. iron ore for steel)."
      >
        ≈ direct
      </div>
    );
  }
  const top = tops[0];
  return (
    <div style={{
      textAlign: "right", display: "flex",
      alignItems: "center", justifyContent: "flex-end", gap: 6,
    }} title={tops.map((t) => `${t.country} ${(t.share).toFixed(0)}%`).join(", ")}>
      <BucketDot bucket={top.bucket} />
      <span style={{ color: P.text }}>
        {top.iso3} {(top.share).toFixed(0)}%
      </span>
      <span style={{ color: P.textLight, fontSize: 10 }}>
        ({fraction.toFixed(0)}% re-roll)
      </span>
    </div>
  );
}

/**
 * Pill toggle for switching between 1st-order (HMRC COO) and 2nd-order
 * (feedstock origin) attribution. Rendered in the ExpandedCard header
 * when the dataset carries 2nd-order data.
 */
function OrderModeToggle({ value, onChange }) {
  const opts = [
    { key: "1st", label: "1st-order" },
    { key: "2nd", label: "2nd-order" },
  ];
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "inline-flex",
        border: `1px solid ${P.border}`,
        borderRadius: 14,
        overflow: "hidden",
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
      title="1st-order: country of last substantial transformation (HMRC COO). 2nd-order: re-attributed by feedstock origin (where the partner's upstream inputs came from)."
    >
      {opts.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={(e) => { e.stopPropagation(); onChange(o.key); }}
            style={{
              padding: "4px 10px",
              background: active ? P.text : "transparent",
              color: active ? P.bgCard : P.textMuted,
              border: "none",
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function BucketDot({ bucket }) {
  return (
    <span
      title={BUCKET_DESCRIPTIONS[bucket] || ""}
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: BUCKET_COLOR[bucket] || BUCKET_COLOR.unknown,
        display: "inline-block",
      }}
    />
  );
}

function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 11,
      color: P.textLight,
      fontFamily: "'DM Mono', monospace",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 8,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Loading({ title }) {
  return (
    <div style={{ color: P.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
      {title} — loading…
    </div>
  );
}

function ErrorRow({ title, message }) {
  return (
    <div style={{ color: P.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
      {title} — {message}
    </div>
  );
}

function labelFor(key) {
  if (key === "domestic") return "Domestic";
  return BUCKET_LABELS[key] || key;
}

/**
 * Format a magnitude with k / m / bn suffixes. Used for tonnages
 * (no prefix) and £ (prefix with "£"). Tonnage scales: k = thousand,
 * m = million. £ scale: m = million, bn = billion (HMRC values are
 * in pounds, not pence, so anything above 1bn rolls over).
 */
function formatMagnitude(v, unit) {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const isMoney = typeof unit === "string" && unit.includes("£");
  const prefix = isMoney ? "£" : "";
  const suffix = isMoney ? "" : ` ${unit ?? ""}`.trimEnd();
  let value;
  if (abs >= 1_000_000_000) value = `${(v / 1_000_000_000).toFixed(1)}bn`;
  else if (abs >= 1_000_000) value = `${(v / 1_000_000).toFixed(1)}m`;
  else if (abs >= 1_000) value = `${(v / 1_000).toFixed(0)}k`;
  else value = String(Math.round(v));
  return `${prefix}${value}${suffix}`;
}

// Backwards-compat alias used throughout the file.
function formatTonnes(v, unit = "") {
  return formatMagnitude(v, unit);
}

function shortMonth(period) {
  if (typeof period !== "string") return "";
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(m[2], 10) - 1]} ${m[1].slice(2)}`;
}
