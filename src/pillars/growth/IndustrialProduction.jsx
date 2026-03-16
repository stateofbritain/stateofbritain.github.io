import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_TITLE, CHART_SUBTITLE,
  AXIS_TICK, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import useIsMobile from "../../hooks/useIsMobile";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { fetchDataset } from "../../hooks/useDataset";

const toggleBtn = (active) => ({
  padding: "4px 12px",
  border: `1px solid ${active ? P.sienna : P.border}`,
  borderRadius: 4,
  background: active ? P.sienna : "transparent",
  color: active ? "#fff" : P.textMuted,
  fontSize: "12px",
  fontFamily: "'DM Mono', monospace",
  cursor: "pointer",
  transition: "all 0.15s",
});

const CATEGORY_KEYS = ["all", "metals", "chemicals", "construction", "polymers", "gases", "intermediates"];
const CATEGORY_LABELS = {
  all: "All",
  metals: "Metals",
  chemicals: "Chemicals",
  construction: "Construction",
  polymers: "Polymers",
  gases: "Gases",
  intermediates: "Intermediates",
};

const CHART_COLOURS = [
  P.teal, P.navy, P.sienna, P.red, P.yellow, P.grey, "#4A7A58", "#6B8EC4", "#9B6B8C",
];

function statusColour(product) {
  if (product.ceased) return P.red;
  const s = product.series;
  const peak = Math.max(...s.map((d) => d.value));
  const latest = s[s.length - 1].value;
  if (peak === 0) return P.red;
  const pct = (latest / peak) * 100;
  if (pct >= 80) return P.teal;
  if (pct >= 40) return P.yellow;
  return P.red;
}

function statusLabel(product) {
  if (product.ceased) return "Ceased";
  const s = product.series;
  const peak = Math.max(...s.map((d) => d.value));
  const latest = s[s.length - 1].value;
  if (peak === 0) return "None";
  const pct = (latest / peak) * 100;
  if (pct >= 80) return "Stable";
  return "Declining";
}

function getPeak(product) {
  let best = product.series[0];
  for (const d of product.series) {
    if (d.value > best.value) best = d;
  }
  return best;
}

function getLatest(product) {
  return product.series[product.series.length - 1];
}

export default function IndustrialProduction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [chartMode, setChartMode] = useState("indexed");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDataset("industrial.json")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Flatten all products
  const allProducts = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.categories).flatMap(([catKey, cat]) =>
      cat.products.map((p) => ({ ...p, categoryKey: catKey, categoryLabel: cat.label }))
    );
  }, [data]);

  // Split category products into chart groups by unit (so Mt and kt get separate charts)
  const chartGroups = useMemo(() => {
    if (!data || activeCategory === "all") return [];
    const cat = data.categories[activeCategory];
    if (!cat) return [];

    // In indexed mode, all products share one chart (same 0-100 scale)
    if (chartMode === "indexed") {
      return [{ unit: null, products: cat.products }];
    }

    // In absolute mode, group by unit so axes are consistent
    const byUnit = {};
    for (const p of cat.products) {
      if (!byUnit[p.unit]) byUnit[p.unit] = [];
      byUnit[p.unit].push(p);
    }
    return Object.entries(byUnit).map(([unit, products]) => ({ unit, products }));
  }, [data, activeCategory, chartMode]);

  // Build chart data rows for a given set of products
  function buildChartRows(products) {
    const yearSet = new Set();
    for (const p of products) {
      for (const d of p.series) yearSet.add(d.year);
    }
    const years = [...yearSet].sort((a, b) => a - b);
    return years.map((year) => {
      const row = { year };
      for (const p of products) {
        const match = p.series.find((d) => d.year === year);
        if (chartMode === "indexed") {
          const peak = Math.max(...p.series.map((d) => d.value));
          row[p.id] = match && peak > 0 ? Math.round((match.value / peak) * 100) : null;
        } else {
          row[p.id] = match ? match.value : null;
        }
      }
      return row;
    });
  }

  const activeProducts = useMemo(() => {
    if (!data || activeCategory === "all") return [];
    return data.categories[activeCategory]?.products ?? [];
  }, [data, activeCategory]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Industrial Production</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Industrial Production</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const { snapshot } = data;
  const decliningCount = allProducts.filter((p) => !p.ceased && statusLabel(p) === "Declining").length;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Industrial Production
      </h2>
      <p style={SECTION_NOTE}>
        Domestic production of core industrial materials in physical units (tonnes/year).
        Once a smelter, kiln, or reactor closes it rarely reopens — disruption propagates up
        the value chain. Owning the production base is the foundation of industrial resilience.
      </p>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}>
        <MetricCard
          label="Crude steel"
          value={`${snapshot.steelLatest} Mt`}
          sub={`${snapshot.steelPctOfPeak}% of ${snapshot.steelPeakYear} peak (${snapshot.steelPeak} Mt)`}
        />
        <MetricCard
          label="Cement"
          value={`${snapshot.cementLatest} Mt`}
          sub={`${snapshot.cementPctOfPeak}% of ${snapshot.cementPeakYear} peak (${snapshot.cementPeak} Mt)`}
        />
        <MetricCard
          label="Production ceased"
          value={`${snapshot.ceasedCount}`}
          sub={`of ${snapshot.totalProducts} products tracked`}
        />
        <MetricCard
          label="Products tracked"
          value={`${snapshot.totalProducts}`}
          sub={`across ${Object.keys(data.categories).length} categories`}
        />
      </div>

      {/* Category toggle bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            style={toggleBtn(activeCategory === key)}
            onClick={() => setActiveCategory(key)}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}
      </div>

      {/* ALL view — Summary Table */}
      {activeCategory === "all" && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>All Products</h3>
          <p style={SECTION_NOTE}>
            {snapshot.totalProducts} core industrial materials tracked across {Object.keys(data.categories).length} categories.
            {" "}{snapshot.ceasedCount} products have ceased domestic production entirely;{" "}
            {decliningCount} are in significant decline from their peak.
          </p>
          {isMobile ? (
            /* ─── Mobile: compact 3-column table + stacked detail card ─── */
            <div>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                fontFamily: "'DM Mono', monospace",
              }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${P.borderStrong}` }}>
                    {["Product", "% of Peak", "Status"].map((h) => (
                      <th key={h} style={{
                        textAlign: h === "Product" || h === "Status" ? "left" : "right",
                        padding: "8px 6px",
                        color: P.textMuted,
                        fontWeight: 500,
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((p, i) => {
                    const peak = getPeak(p);
                    const latest = getLatest(p);
                    const pctOfPeak = peak.value > 0 ? Math.round((latest.value / peak.value) * 100) : 0;
                    const sc = statusColour(p);
                    const isExpanded = expandedProduct === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                          style={{
                            borderBottom: isExpanded ? "none" : `1px solid ${P.border}`,
                            background: isExpanded ? "rgba(30,107,94,0.06)" : i % 2 === 0 ? "transparent" : "rgba(28,43,69,0.02)",
                            cursor: "pointer",
                          }}
                        >
                          <td style={{ padding: "7px 6px", fontWeight: 500, color: P.text, fontSize: "12px" }}>
                            <span style={{ marginRight: 4, fontSize: "9px", color: P.textLight }}>{isExpanded ? "▼" : "▶"}</span>
                            {p.name}
                          </td>
                          <td style={{ padding: "7px 6px", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                              <div style={{ width: 40, height: 5, background: P.border, borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(pctOfPeak, 100)}%`, height: "100%", background: sc, borderRadius: 3 }} />
                              </div>
                              <span style={{ minWidth: 28, color: P.text, fontSize: "12px" }}>{pctOfPeak}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "7px 6px", textAlign: "left" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: 3,
                              fontSize: "10px",
                              fontWeight: 600,
                              color: "#fff",
                              background: sc,
                            }}>
                              {statusLabel(p)}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={3} style={{
                              padding: "8px 0 16px",
                              borderBottom: `1px solid ${P.border}`,
                              background: "rgba(30,107,94,0.04)",
                            }}>
                              <ShareableChart title={`${p.name} — UK Production`}>
                              <div style={{
                                background: P.bgCard,
                                border: `1px solid ${P.borderStrong}`,
                                borderRadius: 6,
                                padding: "12px 10px",
                              }}>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={CHART_TITLE}>{p.name}</div>
                                  <div style={CHART_SUBTITLE}>UK production ({p.unit})</div>
                                </div>
                                <ResponsiveContainer width="100%" height={220}>
                                  <LineChart data={p.series}>
                                    <CartesianGrid {...GRID_PROPS} />
                                    <XAxis dataKey="year" tick={AXIS_TICK} />
                                    <YAxis
                                      tick={{ fontSize: 10, fill: P.textMuted }}
                                      tickFormatter={(v) => v.toLocaleString()}
                                      width={45}
                                      label={yAxisLabel(`Production (${p.unit})`)}
                                    />
                                    <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()} ${p.unit}`} />} />
                                    <Line
                                      type="monotone"
                                      dataKey="value"
                                      stroke={sc === P.yellow ? P.sienna : sc}
                                      strokeWidth={2.5}
                                      dot={{ r: 3, fill: sc === P.yellow ? P.sienna : sc }}
                                      name={p.name}
                                      isAnimationActive={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                                <div style={{ marginTop: 4, fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
                                  {p.source}
                                </div>
                              </div>
                              </ShareableChart>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ─── Desktop: full 8-column table ─── */
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                fontFamily: "'DM Mono', monospace",
              }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${P.borderStrong}` }}>
                    {["Product", "Category", "Latest", "Unit", "Peak", "Peak Yr", "% of Peak", "Status"].map((h) => (
                      <th key={h} style={{
                        textAlign: h === "Product" || h === "Category" || h === "Status" ? "left" : "right",
                        padding: "8px 10px",
                        color: P.textMuted,
                        fontWeight: 500,
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((p, i) => {
                    const peak = getPeak(p);
                    const latest = getLatest(p);
                    const pctOfPeak = peak.value > 0 ? Math.round((latest.value / peak.value) * 100) : 0;
                    const sc = statusColour(p);
                    const isExpanded = expandedProduct === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                          style={{
                            borderBottom: isExpanded ? "none" : `1px solid ${P.border}`,
                            background: isExpanded ? "rgba(30,107,94,0.06)" : i % 2 === 0 ? "transparent" : "rgba(28,43,69,0.02)",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                        >
                          <td style={{ padding: "7px 10px", fontWeight: 500, color: P.text }}>
                            <span style={{ marginRight: 6, fontSize: "10px", color: P.textLight }}>{isExpanded ? "▼" : "▶"}</span>
                            {p.name}
                            {p.note && (
                              <span title={p.note} style={{ marginLeft: 4, cursor: "help", color: P.textLight }}>*</span>
                            )}
                          </td>
                          <td style={{ padding: "7px 10px", color: P.textMuted }}>{p.categoryLabel}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: P.text }}>{latest.value}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: P.textMuted }}>{p.unit}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: P.textMuted }}>{peak.value}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: P.textMuted }}>{peak.year}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <div style={{
                                width: 60,
                                height: 6,
                                background: P.border,
                                borderRadius: 3,
                                overflow: "hidden",
                              }}>
                                <div style={{
                                  width: `${Math.min(pctOfPeak, 100)}%`,
                                  height: "100%",
                                  background: sc,
                                  borderRadius: 3,
                                }} />
                              </div>
                              <span style={{ minWidth: 32, color: P.text }}>{pctOfPeak}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "7px 10px", textAlign: "left" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 3,
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#fff",
                              background: sc,
                            }}>
                              {statusLabel(p)}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{
                              padding: "12px 10px 20px",
                              borderBottom: `1px solid ${P.border}`,
                              background: "rgba(30,107,94,0.04)",
                            }}>
                              <ShareableChart title={`${p.name} — UK Production`}>
                              <div style={{
                                background: P.bgCard,
                                border: `1px solid ${P.borderStrong}`,
                                borderRadius: 6,
                                padding: "18px 20px 14px",
                              }}>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <div style={CHART_TITLE}>{p.name}</div>
                                    <span style={{ fontSize: "10px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
                                      {p.source}
                                    </span>
                                  </div>
                                  <div style={CHART_SUBTITLE}>UK production ({p.unit})</div>
                                </div>
                                {p.note && (
                                  <p style={{ fontSize: "12px", color: P.textLight, margin: "0 0 10px", fontFamily: "'DM Mono', monospace" }}>
                                    {p.note}
                                  </p>
                                )}
                                <ResponsiveContainer width="100%" height={220}>
                                  <LineChart data={p.series}>
                                    <CartesianGrid {...GRID_PROPS} />
                                    <XAxis dataKey="year" tick={AXIS_TICK} />
                                    <YAxis
                                      tick={AXIS_TICK}
                                      tickFormatter={(v) => `${v.toLocaleString()} ${p.unit}`}
                                      label={yAxisLabel(`Production (${p.unit})`)}
                                    />
                                    <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()} ${p.unit}`} />} />
                                    <Line
                                      type="monotone"
                                      dataKey="value"
                                      stroke={sc === P.yellow ? P.sienna : sc}
                                      strokeWidth={2.5}
                                      dot={{ r: 4, fill: sc === P.yellow ? P.sienna : sc }}
                                      name={p.name}
                                      isAnimationActive={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                              </ShareableChart>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Category view — Charts */}
      {activeCategory !== "all" && data.categories[activeCategory] && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>{data.categories[activeCategory].label}</h3>
          <p style={SECTION_NOTE}>
            {chartMode === "indexed"
              ? "Each product normalised to 100 at its peak year, revealing the pattern of decline across different scales."
              : "Absolute production values. Products with different units are shown on separate charts."}
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button style={toggleBtn(chartMode === "indexed")} onClick={() => setChartMode("indexed")}>
              Indexed (peak = 100)
            </button>
            <button style={toggleBtn(chartMode === "absolute")} onClick={() => setChartMode("absolute")}>
              Absolute
            </button>
          </div>

          {chartGroups.map((group, gi) => {
            const rows = buildChartRows(group.products);
            // Colour offset: indexed mode uses global index, absolute uses per-group
            const colourOffset = chartMode === "indexed" ? 0
              : chartGroups.slice(0, gi).reduce((s, g) => s + g.products.length, 0);
            return (
              <ShareableChart key={group.unit ?? "indexed"} title={`${data.categories[activeCategory].label} — UK Industrial Production`}>
              <div style={{ marginBottom: chartGroups.length > 1 ? 28 : 0 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={CHART_TITLE}>{data.categories[activeCategory].label}</div>
                  <div style={CHART_SUBTITLE}>
                    {chartMode === "indexed" ? "Indexed to peak (100)" : `Absolute production (${group.unit ?? "mixed units"})`}
                  </div>
                </div>
                {group.unit && chartGroups.length > 1 && (
                  <p style={{ fontSize: "13px", fontFamily: "'DM Mono', monospace", color: P.textMuted, margin: "0 0 8px" }}>
                    {group.products.map((p) => p.name).join(", ")} ({group.unit})
                  </p>
                )}
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={rows}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="year" tick={AXIS_TICK} />
                    <YAxis
                      tick={AXIS_TICK}
                      tickFormatter={chartMode === "indexed" ? (v) => `${v}` : (v) => v?.toLocaleString()}
                      domain={chartMode === "indexed" ? [0, 105] : undefined}
                      label={chartMode === "indexed"
                        ? yAxisLabel("Production (% of peak)")
                        : yAxisLabel(`Production (${group.unit})`)}
                    />
                    <Tooltip
                      content={<CustomTooltip
                        formatter={chartMode === "indexed"
                          ? (v) => `${v}%`
                          : (v) => `${v?.toLocaleString()} ${group.unit ?? ""}`}
                      />}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
                    {group.products.map((p, i) => (
                      <Line
                        key={p.id}
                        type="monotone"
                        dataKey={p.id}
                        stroke={CHART_COLOURS[(colourOffset + i) % CHART_COLOURS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={p.name}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              </ShareableChart>
            );
          })}

          {/* Notes for products with notes */}
          {activeProducts.filter((p) => p.note).length > 0 && (
            <div style={{ marginTop: 12, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
              {activeProducts.filter((p) => p.note).map((p) => (
                <div key={p.id}>
                  <strong>{p.name}:</strong> {p.note}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Analysis */}
      <AnalysisBox>
        The UK has tracked {snapshot.totalProducts} core industrial materials across
        {" "}{Object.keys(data.categories).length} categories. Of these, {snapshot.ceasedCount} have
        ceased domestic production entirely — including refined copper (2003), tin smelting (1990s),
        and synthetic fibres (2010s). Crude steel output stands at {snapshot.steelLatest} Mt
        ({snapshot.steelLatestYear}), just {snapshot.steelPctOfPeak}% of the {snapshot.steelPeakYear} peak
        of {snapshot.steelPeak} Mt. Cement production has halved from {snapshot.cementPeak} Mt
        ({snapshot.cementPeakYear}) to {snapshot.cementLatest} Mt. Primary aluminium production collapsed
        from 370 kt to ~40 kt after Lynemouth and Anglesey smelter closures.
        {" "}The decline is accelerating. CF Industries permanently closed its Ince ammonia
        and fertiliser plant in 2024, leaving Billingham as the sole UK ammonia producer.
        INEOS Grangemouth — Scotland's only refinery and petrochemical complex — is closing
        in 2025, removing ~300 kt/yr of ethylene capacity. Vynova Runcorn entered
        administration in December 2025, putting half of UK chlor-alkali capacity at risk.
        {" "}The pattern is consistent: once a plant closes, it does not reopen. Each closure
        removes not just output but the skilled workforce, supply chains, and institutional
        knowledge needed to rebuild.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        {data.meta.sources.map((s, i) => (
          <span key={s.name}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
              {s.name}
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}
