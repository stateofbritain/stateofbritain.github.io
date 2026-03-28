import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, GRID_PROPS, yAxisLabel,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import AnalysisBox from "../../components/AnalysisBox";
import useIsMobile from "../../hooks/useIsMobile";

const PURPLE = "#7B4B8A";

const TYPE_COLORS = {
  station: PURPLE,
  tunnel: P.navy,
  viaduct: P.sienna,
  "green-tunnel": P.teal,
  mitigation: "#5B7A3A",
  heritage: "#8B6914",
  infrastructure: P.grey,
  road: "#7A5C3A",
  utility: "#6B6458",
};

const TYPE_LABELS = {
  station: "Station",
  tunnel: "Bored Tunnel",
  viaduct: "Viaduct",
  "green-tunnel": "Green Tunnel",
  mitigation: "Environmental",
  heritage: "Heritage",
  infrastructure: "Infrastructure",
  road: "Road Diversion",
  utility: "Utility Diversion",
};

const FILTER_GROUPS = {
  all: "All",
  structures: "Tunnels & Viaducts",
  stations: "Stations",
  mitigations: "Mitigations",
  infrastructure: "Infrastructure",
};

const FILTER_TYPES = {
  all: null,
  structures: ["tunnel", "viaduct", "green-tunnel"],
  stations: ["station"],
  mitigations: ["mitigation", "heritage"],
  infrastructure: ["infrastructure", "road", "utility"],
};

// ─── Date status helper ─────────────────────────────────────────────
// Returns "overdue" if the expected date has passed and the feature
// is not yet complete; null otherwise.
function getDateStatus(currentDate, completionPct) {
  if (completionPct >= 100) return null;
  if (!currentDate) return null;
  const years = currentDate.match(/\d{4}/g);
  if (!years?.length) return null;
  const latestYear = Math.max(...years.map(Number));
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  // If the latest year in the date string is strictly before the current year,
  // the target has passed.
  if (latestYear < currentYear) return "overdue";
  // If it's the current year and we're past mid-year, flag at risk
  if (latestYear === currentYear && currentMonth >= 6 && completionPct != null && completionPct < 85) return "at-risk";
  return null;
}

// ─── Cost tooltip ───────────────────────────────────────────────────
function CostTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: P.navy, border: "1px solid rgba(255,255,255,0.1)",
      padding: "10px 14px", fontFamily: "'DM Mono', monospace",
      fontSize: "12px", color: "#e0ddd6", borderRadius: 3,
      boxShadow: "0 4px 16px rgba(28,43,69,0.25)", maxWidth: 260,
    }}>
      <div style={{ fontWeight: 500, color: P.parchment, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: PURPLE, display: "inline-block" }} />
        <span style={{ opacity: 0.65 }}>Estimate:</span>
        <span style={{ fontWeight: 500, color: "#fff" }}>{"\u00A3"}{d?.estimateBn}bn</span>
      </div>
      {d?.scope && (
        <div style={{ marginTop: 4, opacity: 0.6, fontSize: "10px" }}>
          Scope: {d.scope} ({d.prices} prices)
        </div>
      )}
      {d?.event && (
        <div style={{ marginTop: 4, opacity: 0.6, fontSize: "10px", lineHeight: 1.4 }}>
          {d.event}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export default function HS2() {
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/data/hs2.json")
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const selectedData = useMemo(() => {
    if (!data || !selectedFeature) return null;
    return data.features.find(f => f.id === selectedFeature);
  }, [data, selectedFeature]);

  const filteredFeatures = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.features].sort((a, b) => a.distanceKm - b.distanceKm);
    const types = FILTER_TYPES[filter];
    if (!types) return sorted;
    return sorted.filter(f => types.includes(f.type));
  }, [data, filter]);

  // ── Loading / error ──
  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
          HS2: High Speed 2
        </h2>
        <p style={{ fontSize: "14px", color: P.textMuted, fontFamily: "'Playfair Display', serif" }}>Loading data...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
          HS2: High Speed 2
        </h2>
        <p style={{ fontSize: "14px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const { overview, routeProfile, costTimeline } = data;
  const totalFeatures = data.features.length;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      {/* ── Header ── */}
      <h2 style={{
        fontFamily: "'Playfair Display', serif", fontSize: "28px",
        fontWeight: 600, color: P.text, margin: "0 0 6px",
      }}>
        HS2: High Speed 2
      </h2>
      <p style={{ ...SECTION_NOTE, margin: "0 0 24px" }}>
        High Speed 2 is a planned high-speed railway connecting London, the Midlands, and
        originally the North of England. Phase 1 (London to Birmingham, {overview.phase1LengthKm} km)
        remains under construction at an estimated cost of {"\u00A3"}{overview.totalCostCurrentBn}bn
        ({overview.totalCostCurrentPrices} prices),
        or approximately {"\u00A3"}{overview.costPerKmMn}m per kilometre. Phases 2a
        (Birmingham to Crewe) and 2b (to Manchester and Leeds) were cancelled in 2023 and 2021
        respectively.
      </p>

      {/* ── Metric cards ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 36 }}>
        <MetricCard
          label="Phase 1 cost estimate"
          value={`\u00A3${overview.totalCostCurrentBn}bn`}
          change={`${overview.totalCostCurrentPrices} prices`}
          color={PURPLE}
          delay={0}
        />
        <MetricCard
          label="Cost per kilometre"
          value={`\u00A3${overview.costPerKmMn}m`}
          change={`${overview.phase1LengthKm} km route`}
          color={P.sienna}
          delay={0.05}
        />
        <MetricCard
          label="Years of delay"
          value={`${overview.yearsDelay}+`}
          change={`${overview.originalCompletionYear} \u2192 ${overview.currentCompletionYear}`}
          up
          color={P.red}
          delay={0.1}
        />
        <MetricCard
          label="Tunnel boring"
          value={`${overview.tunnelBoringPct}%`}
          change={`${routeProfile.tunnelKm} km of tunnel`}
          color={P.teal}
          delay={0.15}
        />
      </div>

      {/* ── Route profile summary ── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Route Profile</h3>
        <p style={SECTION_NOTE}>
          The {routeProfile.totalKm} km Phase 1 route passes through {routeProfile.tunnelKm} km
          of bored tunnel, {routeProfile.greenTunnelKm} km of green tunnel
          (cut-and-cover), and {routeProfile.viaductKm} km of viaduct. It crosses or
          affects {routeProfile.ancientWoodlandsAffected} ancient woodlands,{" "}
          {routeProfile.sssisAffected} Sites of Special Scientific Interest,{" "}
          {routeProfile.scheduledMonuments} scheduled monuments, and{" "}
          {routeProfile.listedBuildings} listed buildings. There are over{" "}
          {routeProfile.bridgesAndUnderpasses} bridges and underpasses along the alignment.
        </p>

        {/* Route breakdown bar */}
        <div style={{
          background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3,
          padding: isMobile ? "14px" : "18px 22px",
          boxShadow: "0 1px 6px rgba(28,43,69,0.05)", marginBottom: 16,
        }}>
          <div style={{
            fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em",
            color: P.textLight, fontFamily: "'DM Mono', monospace", marginBottom: 10,
          }}>
            Route composition ({routeProfile.totalKm} km)
          </div>
          <div style={{
            display: "flex", height: 18, borderRadius: 3, overflow: "hidden", marginBottom: 10,
          }}>
            {[
              { km: routeProfile.tunnelKm, color: TYPE_COLORS.tunnel, label: "Tunnel" },
              { km: routeProfile.greenTunnelKm, color: TYPE_COLORS["green-tunnel"], label: "Green tunnel" },
              { km: routeProfile.viaductKm, color: TYPE_COLORS.viaduct, label: "Viaduct" },
              { km: routeProfile.cuttingsKm, color: "#A0937D", label: "Cutting" },
              { km: routeProfile.embankmentKm, color: "#C4B99A", label: "Embankment" },
              { km: routeProfile.totalKm - routeProfile.tunnelKm - routeProfile.greenTunnelKm - routeProfile.viaductKm - routeProfile.cuttingsKm - routeProfile.embankmentKm, color: P.border, label: "Surface" },
            ].map((seg, i) => (
              <div
                key={i}
                style={{
                  width: `${(seg.km / routeProfile.totalKm) * 100}%`,
                  background: seg.color,
                  height: "100%",
                  transition: "width 0.5s ease",
                }}
                title={`${seg.label}: ${seg.km} km`}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 8 : 14 }}>
            {[
              { km: routeProfile.tunnelKm, color: TYPE_COLORS.tunnel, label: "Bored tunnel" },
              { km: routeProfile.greenTunnelKm, color: TYPE_COLORS["green-tunnel"], label: "Green tunnel" },
              { km: routeProfile.viaductKm, color: TYPE_COLORS.viaduct, label: "Viaduct" },
              { km: routeProfile.cuttingsKm, color: "#A0937D", label: "Cutting" },
              { km: routeProfile.embankmentKm, color: "#C4B99A", label: "Embankment" },
            ].map((seg, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: "10px", fontFamily: "'DM Mono', monospace", color: P.textMuted,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: seg.color, display: "inline-block",
                }} />
                {seg.label} ({seg.km} km)
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Route interventions ── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Route Interventions</h3>
        <p style={SECTION_NOTE}>
          Each major engineering work, environmental mitigation, and infrastructure element
          along the Phase 1 route, ordered from London to Birmingham. The cost per kilometre
          is driven by the density and complexity of these interventions: tunnels, viaducts,
          station buildings, environmental mitigations mandated by planning and wildlife law,
          utility diversions, and road realignments.
        </p>

        {/* Filter buttons */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 18,
          border: `1px solid ${P.borderStrong}`, borderRadius: 3,
          width: "fit-content",
        }}>
          {Object.entries(FILTER_GROUPS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                background: filter === key ? "rgba(28,43,69,0.06)" : "transparent",
                border: "none",
                color: filter === key ? P.text : P.textLight,
                padding: "4px 10px", fontSize: "10px", fontWeight: 500,
                textTransform: "uppercase", letterSpacing: "0.1em",
                cursor: "pointer", fontFamily: "'DM Mono', monospace",
                transition: "all 0.15s", borderRadius: 2,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feature list with route line */}
        <div style={{ position: "relative", paddingLeft: isMobile ? 28 : 50 }}>
          {/* Vertical route line */}
          <div style={{
            position: "absolute",
            left: isMobile ? 8 : 18,
            top: 8,
            bottom: 8,
            width: 2,
            background: `linear-gradient(to bottom, ${PURPLE}, ${PURPLE} 85%, ${P.textLight} 100%)`,
            opacity: 0.3,
            borderRadius: 1,
          }} />

          {filteredFeatures.map((f, i) => {
            const isSelected = selectedFeature === f.id;
            const color = TYPE_COLORS[f.type] || PURPLE;
            const dateStatus = getDateStatus(f.currentDate, f.completionPct);

            return (
              <div
                key={f.id}
                style={{ position: "relative", marginBottom: isSelected ? 0 : 2 }}
              >
                {/* Route dot */}
                <div style={{
                  position: "absolute",
                  left: isMobile ? -24 : -38,
                  top: 14,
                  width: isSelected ? 14 : 10,
                  height: isSelected ? 14 : 10,
                  borderRadius: "50%",
                  background: color,
                  border: "2px solid #fff",
                  boxShadow: `0 0 0 1px ${P.border}`,
                  transition: "all 0.2s",
                  zIndex: 1,
                }} />

                {/* Feature card */}
                <div
                  onClick={() => setSelectedFeature(isSelected ? null : f.id)}
                  style={{
                    background: P.bgCard,
                    border: `1px solid ${isSelected ? color : P.border}`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 3,
                    padding: isMobile ? "10px 12px" : "12px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: isSelected ? "0 2px 12px rgba(28,43,69,0.08)" : "0 1px 4px rgba(28,43,69,0.03)",
                    marginBottom: isSelected ? 12 : 6,
                    animation: `fadeSlideIn 0.3s ease ${Math.min(i * 0.03, 0.5)}s both`,
                  }}
                >
                  {/* Header row */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    gap: 8, flexWrap: "wrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0, flex: 1 }}>
                      <span style={{
                        fontSize: "10px", color: P.textLight,
                        fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap", minWidth: 36,
                      }}>
                        {f.distanceKm} km
                      </span>
                      <span style={{
                        fontFamily: "'Playfair Display', serif", fontSize: isMobile ? "14px" : "15px",
                        fontWeight: 600, color: P.text,
                      }}>
                        {f.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <span style={{
                        fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.1em",
                        fontFamily: "'DM Mono', monospace", color, fontWeight: 500,
                      }}>
                        {TYPE_LABELS[f.type]}
                      </span>
                      {dateStatus === "overdue" && (
                        <span style={{
                          fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.08em",
                          fontFamily: "'DM Mono', monospace", color: P.red, fontWeight: 600,
                          background: "rgba(168,52,40,0.08)", padding: "1px 5px", borderRadius: 2,
                        }}>
                          Overdue
                        </span>
                      )}
                      {dateStatus === "at-risk" && (
                        <span style={{
                          fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.08em",
                          fontFamily: "'DM Mono', monospace", color: P.yellow, fontWeight: 600,
                          background: "rgba(232,184,48,0.1)", padding: "1px 5px", borderRadius: 2,
                        }}>
                          At risk
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status row */}
                  <div style={{
                    display: "flex", gap: 12, alignItems: "center", marginTop: 4, flexWrap: "wrap",
                  }}>
                    <span style={{
                      fontSize: "11px", color: P.textMuted,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {f.status}
                    </span>
                    {f.costCurrentMn && (
                      <span style={{
                        fontSize: "12px",
                        fontFamily: "'DM Mono', monospace", fontWeight: 600,
                        color: P.text,
                        whiteSpace: "nowrap",
                      }}>
                        {f.costInitialMn && f.costInitialMn !== f.costCurrentMn && (
                          <span style={{ color: P.textLight, fontWeight: 400, fontSize: "11px" }}>
                            {"\u00A3"}{f.costInitialMn >= 1000 ? `${(f.costInitialMn / 1000).toFixed(1)}bn` : `${f.costInitialMn}m`}
                            {" \u2192 "}
                          </span>
                        )}
                        <span style={{ color: PURPLE }}>
                          {"\u00A3"}{f.costCurrentMn >= 1000 ? `${(f.costCurrentMn / 1000).toFixed(1)}bn` : `${f.costCurrentMn}m`}
                        </span>
                      </span>
                    )}
                    {f.completionPct != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
                        <div style={{
                          height: 4, width: isMobile ? "100%" : 80, background: P.border,
                          borderRadius: 2, overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", width: `${f.completionPct}%`,
                            background: color, borderRadius: 2, transition: "width 0.4s ease",
                          }} />
                        </div>
                        <span style={{
                          fontSize: "10px", color: P.textLight,
                          fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap",
                        }}>
                          {f.completionPct}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div style={{
                      marginTop: 14, paddingTop: 14,
                      borderTop: `1px solid ${P.border}`,
                      animation: "fadeSlideIn 0.25s ease both",
                    }}>
                      <p style={{
                        fontSize: "13px", lineHeight: 1.7, color: P.textMuted,
                        fontFamily: "'Playfair Display', serif", margin: "0 0 14px",
                      }}>
                        {f.description}
                      </p>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 12,
                      }}>
                        {/* Specs */}
                        <div style={{
                          background: "rgba(28,43,69,0.02)", borderRadius: 3, padding: "12px 14px",
                        }}>
                          <div style={{
                            fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.12em",
                            color: P.textLight, fontFamily: "'DM Mono', monospace",
                            marginBottom: 8, fontWeight: 500,
                          }}>
                            Specifications
                          </div>
                          {f.specs && Object.entries(f.specs).map(([key, val]) => (
                            <div key={key} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "baseline",
                              marginBottom: 3, fontSize: "11px", fontFamily: "'DM Mono', monospace",
                            }}>
                              <span style={{ color: P.textLight }}>
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              <span style={{ color: P.text, fontWeight: 500, textAlign: "right", maxWidth: "55%" }}>
                                {val}
                              </span>
                            </div>
                          ))}
                          {f.contractor && (
                            <div style={{
                              display: "flex", justifyContent: "space-between", alignItems: "baseline",
                              marginBottom: 3, fontSize: "11px", fontFamily: "'DM Mono', monospace",
                            }}>
                              <span style={{ color: P.textLight }}>Contractor</span>
                              <span style={{ color: P.text, fontWeight: 500, textAlign: "right", maxWidth: "55%" }}>
                                {f.contractor}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Timeline */}
                        <div style={{
                          background: "rgba(28,43,69,0.02)", borderRadius: 3, padding: "12px 14px",
                        }}>
                          <div style={{
                            fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.12em",
                            color: P.textLight, fontFamily: "'DM Mono', monospace",
                            marginBottom: 8, fontWeight: 500,
                          }}>
                            Timeline
                          </div>
                          {f.originalDate && (
                            <div style={{
                              display: "flex", justifyContent: "space-between",
                              marginBottom: 3, fontSize: "11px", fontFamily: "'DM Mono', monospace",
                            }}>
                              <span style={{ color: P.textLight }}>Original target</span>
                              <span style={{ color: P.text, fontWeight: 500 }}>{f.originalDate}</span>
                            </div>
                          )}
                          {f.currentDate && (() => {
                            const status = getDateStatus(f.currentDate, f.completionPct);
                            return (
                              <div style={{
                                display: "flex", justifyContent: "space-between",
                                marginBottom: 3, fontSize: "11px", fontFamily: "'DM Mono', monospace",
                              }}>
                                <span style={{ color: P.textLight }}>Current expected</span>
                                <span style={{
                                  fontWeight: 500,
                                  color: status === "overdue" ? P.red : P.text,
                                }}>
                                  {f.currentDate}
                                  {status === "overdue" && " (overdue)"}
                                </span>
                              </div>
                            );
                          })()}
                          {f.completionPct != null && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{
                                display: "flex", justifyContent: "space-between",
                                fontSize: "10px", fontFamily: "'DM Mono', monospace",
                                color: P.textLight, marginBottom: 4,
                              }}>
                                <span>Completion</span>
                                <span style={{ color: P.text, fontWeight: 500 }}>
                                  {f.completionPct}%
                                </span>
                              </div>
                              <div style={{
                                height: 6, background: P.border, borderRadius: 3, overflow: "hidden",
                              }}>
                                <div style={{
                                  height: "100%", width: `${f.completionPct}%`,
                                  background: color, borderRadius: 3, transition: "width 0.5s ease",
                                }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cost */}
                      {(f.costCurrentMn || f.costNote) && (
                        <div style={{
                          marginTop: 12, padding: "10px 14px",
                          background: "rgba(28,43,69,0.02)",
                          borderRadius: 3,
                        }}>
                          <div style={{
                            fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.12em",
                            color: P.textLight, fontFamily: "'DM Mono', monospace",
                            marginBottom: 6, fontWeight: 500,
                          }}>
                            Cost
                          </div>
                          {f.costCurrentMn && (
                            <div style={{ marginBottom: 6 }}>
                              {f.costInitialMn && f.costInitialMn !== f.costCurrentMn ? (
                                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{
                                    fontSize: "14px", fontWeight: 500,
                                    fontFamily: "'Playfair Display', serif", color: P.textLight,
                                    textDecoration: "line-through", textDecorationColor: P.border,
                                  }}>
                                    {"\u00A3"}{f.costInitialMn >= 1000 ? `${(f.costInitialMn / 1000).toFixed(1)}bn` : `${f.costInitialMn}m`}
                                  </span>
                                  <span style={{ color: P.textLight, fontSize: "14px" }}>{"\u2192"}</span>
                                  <span style={{
                                    fontSize: "20px", fontWeight: 600,
                                    fontFamily: "'Playfair Display', serif", color: PURPLE,
                                  }}>
                                    {"\u00A3"}{f.costCurrentMn >= 1000 ? `${(f.costCurrentMn / 1000).toFixed(1)}bn` : `${f.costCurrentMn}m`}
                                  </span>
                                  <span style={{
                                    fontSize: "10px", color: P.red,
                                    fontFamily: "'DM Mono', monospace", fontWeight: 500,
                                  }}>
                                    +{Math.round(((f.costCurrentMn - f.costInitialMn) / f.costInitialMn) * 100)}%
                                  </span>
                                </div>
                              ) : (
                                <div style={{
                                  fontSize: "20px", fontWeight: 600,
                                  fontFamily: "'Playfair Display', serif", color: P.text,
                                }}>
                                  {"\u00A3"}{f.costCurrentMn >= 1000 ? `${(f.costCurrentMn / 1000).toFixed(1)}bn` : `${f.costCurrentMn}m`}
                                </div>
                              )}
                            </div>
                          )}
                          {f.costNote && (
                            <p style={{
                              fontSize: "11px", lineHeight: 1.5, color: P.textMuted,
                              fontFamily: "'DM Mono', monospace", margin: 0,
                            }}>
                              {f.costNote}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Cost driver */}
                      {f.costDriver && (
                        <div style={{
                          marginTop: 12, padding: "10px 14px",
                          background: "rgba(123,75,138,0.04)",
                          borderLeft: `2px solid ${PURPLE}`,
                          borderRadius: "0 3px 3px 0",
                        }}>
                          <div style={{
                            fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.12em",
                            color: PURPLE, fontFamily: "'DM Mono', monospace",
                            marginBottom: 4, fontWeight: 500,
                          }}>
                            Cost driver
                          </div>
                          <p style={{
                            fontSize: "12px", lineHeight: 1.6, color: P.textMuted,
                            fontFamily: "'DM Mono', monospace", margin: 0,
                          }}>
                            {f.costDriver}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 12, fontSize: "11px", color: P.textLight,
          fontFamily: "'DM Mono', monospace",
        }}>
          Showing {filteredFeatures.length} of {totalFeatures} interventions
        </div>
      </section>

      {/* ── Phase overview ── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Phases</h3>
        <p style={SECTION_NOTE}>
          HS2 was originally planned as a Y-shaped network. The eastern leg to Leeds was
          cancelled in the November 2021 Integrated Rail Plan. Phases 2a and 2b (western leg)
          were cancelled in October 2023. Only Phase 1 (London to Birmingham) remains.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 14,
        }}>
          {data.phases.map((phase, i) => {
            const isCancelled = phase.status === "cancelled";
            return (
              <div key={phase.id} style={{
                background: P.bgCard,
                border: `1px solid ${P.border}`,
                borderLeft: `3px solid ${isCancelled ? P.textLight : PURPLE}`,
                borderRadius: 3,
                padding: "16px 18px",
                opacity: isCancelled ? 0.7 : 1,
                boxShadow: "0 1px 4px rgba(28,43,69,0.04)",
                animation: `fadeSlideIn 0.4s ease ${0.1 * i}s both`,
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontFamily: "'Playfair Display', serif", fontSize: "15px",
                    fontWeight: 600, color: P.text,
                  }}>
                    {phase.name}
                  </span>
                  <span style={{
                    fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em",
                    fontFamily: "'DM Mono', monospace",
                    color: isCancelled ? P.red : P.teal,
                    fontWeight: 500,
                  }}>
                    {isCancelled ? "Cancelled" : "Under construction"}
                  </span>
                </div>
                <div style={{
                  fontSize: "12px", color: P.textMuted,
                  fontFamily: "'DM Mono', monospace", lineHeight: 1.6,
                }}>
                  {phase.route}
                </div>
                {phase.lengthKm && (
                  <div style={{
                    fontSize: "11px", color: P.textLight,
                    fontFamily: "'DM Mono', monospace", marginTop: 4,
                  }}>
                    {phase.lengthKm} km
                    {phase.costBn && ` \u2014 \u00A3${phase.costBn}bn (${phase.costPrices} prices)`}
                  </div>
                )}
                {phase.cancelledDate && (
                  <div style={{
                    fontSize: "11px", color: P.textLight,
                    fontFamily: "'DM Mono', monospace", marginTop: 4,
                  }}>
                    Cancelled {phase.cancelledDate}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Cost escalation chart ── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Cost Escalation</h3>
        <p style={SECTION_NOTE}>
          Successive estimates for HS2 have risen from {"\u00A3"}30bn in 2010 to {"\u00A3"}66.6bn
          in 2023, though the scope has also changed. The 2020 peak of {"\u00A3"}98bn covered
          the full Y-network; the 2023 figure covers Phase 1 only. Estimates are shown in
          their respective price years and are not inflation-adjusted to a common base.
        </p>

        <ChartCard
          title="HS2 Cost Estimates Over Time"
          subtitle="United Kingdom, \u00A3bn, 2010\u20132024 (various price years)"
          source={<>SOURCE: <a href="https://www.nao.org.uk/reports/hs2-progress-update/" style={{ color: P.textLight }}>NAO</a>, <a href="https://commonslibrary.parliament.uk/research-briefings/sn07082/" style={{ color: P.textLight }}>House of Commons Library</a></>}
          legend={[
            { key: "estimate", label: "Cost estimate", color: PURPLE },
          ]}
          height={340}
        >
          <LineChart data={costTimeline} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2009, 2025]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 110]}
              label={yAxisLabel("\u00A3bn")}
            />
            <Tooltip content={<CostTooltip />} />
            <ReferenceLine
              x={2023}
              stroke={P.grey}
              strokeDasharray="4 4"
              label={{
                value: "Phase 2 cancelled",
                fontSize: 10,
                fill: P.grey,
                position: "insideTopRight",
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="estimateBn"
              stroke={PURPLE}
              strokeWidth={2.5}
              dot={{ r: 4, fill: PURPLE, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: PURPLE, strokeWidth: 2 }}
              name="Cost estimate"
            />
          </LineChart>
        </ChartCard>
      </section>

      {/* ── Spending breakdown ── */}
      {data.spending && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Where the Money Has Gone</h3>
          <p style={SECTION_NOTE}>
            Cumulative spend to February 2026, from HS2's six-monthly report to Parliament.
            Of the {"\u00A3"}{data.spending.totalSpentBn}bn spent so far, two thirds has gone on
            civils (tunnels, viaducts, earthworks). The {"\u00A3"}{data.spending.fundingEnvelopeBn}bn
            funding envelope is acknowledged by both HS2 Ltd and the DfT to be insufficient to
            complete Phase 1.
          </p>

          <div style={{
            background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3,
            padding: isMobile ? "14px" : "18px 22px",
            boxShadow: "0 1px 6px rgba(28,43,69,0.05)", marginBottom: 16,
          }}>
            {/* Spending bar */}
            <div style={{
              display: "flex", height: 24, borderRadius: 3, overflow: "hidden", marginBottom: 12,
            }}>
              {data.spending.cumulative.map((cat, i) => {
                const colors = [PURPLE, P.teal, P.navy, P.sienna, P.grey, P.textLight];
                return (
                  <div
                    key={i}
                    style={{
                      width: `${cat.share * 100}%`,
                      background: colors[i % colors.length],
                      height: "100%",
                      transition: "width 0.5s ease",
                    }}
                    title={`${cat.category}: \u00A3${cat.spentBn}bn`}
                  />
                );
              })}
            </div>

            {/* Itemised list */}
            {data.spending.cumulative.map((cat, i) => {
              const colors = [PURPLE, P.teal, P.navy, P.sienna, P.grey, P.textLight];
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0",
                  borderBottom: i < data.spending.cumulative.length - 1 ? `1px solid ${P.border}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: colors[i % colors.length], display: "inline-block", flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: "12px", fontFamily: "'DM Mono', monospace", color: P.text,
                    }}>
                      {cat.category}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "13px", fontWeight: 600,
                    fontFamily: "'DM Mono', monospace", color: P.text,
                  }}>
                    {"\u00A3"}{cat.spentBn}bn
                  </span>
                </div>
              );
            })}

            {/* Total */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0 4px", marginTop: 4,
              borderTop: `2px solid ${P.borderStrong}`,
            }}>
              <span style={{
                fontSize: "12px", fontWeight: 600,
                fontFamily: "'DM Mono', monospace", color: P.text,
              }}>
                Total spent to date
              </span>
              <span style={{
                fontSize: "16px", fontWeight: 700,
                fontFamily: "'Playfair Display', serif", color: P.text,
              }}>
                {"\u00A3"}{data.spending.totalSpentBn}bn
              </span>
            </div>

            {/* Funding note */}
            {data.spending.fundingNote && (
              <p style={{
                fontSize: "11px", lineHeight: 1.5, color: P.textLight,
                fontFamily: "'DM Mono', monospace", margin: "10px 0 0",
                borderTop: `1px solid ${P.border}`, paddingTop: 10,
              }}>
                {data.spending.fundingNote}
              </p>
            )}
          </div>

          {/* Major contracts */}
          {data.contracts && (
            <div style={{ marginTop: 18 }}>
              <div style={{
                fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em",
                color: P.textLight, fontFamily: "'DM Mono', monospace",
                marginBottom: 10, fontWeight: 500,
              }}>
                Major contracts (at award / notice to proceed)
              </div>
              {data.contracts.map((c, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  padding: "8px 0",
                  borderBottom: `1px solid ${P.border}`,
                  gap: 12,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: "12px", fontFamily: "'DM Mono', monospace", color: P.text,
                      fontWeight: 500,
                    }}>
                      {c.name}
                    </div>
                    <div style={{
                      fontSize: "10px", fontFamily: "'DM Mono', monospace", color: P.textLight,
                      marginTop: 2, lineHeight: 1.4,
                    }}>
                      {c.scope}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: "13px", fontWeight: 600,
                      fontFamily: "'DM Mono', monospace", color: P.text,
                    }}>
                      {"\u00A3"}{c.awardValue >= 1000 ? `${(c.awardValue / 1000).toFixed(1)}bn` : `${c.awardValue}m`}
                    </div>
                    {c.currentValue && c.currentValue !== c.awardValue && (
                      <div style={{
                        fontSize: "10px", color: P.red,
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        now {"\u00A3"}{c.currentValue >= 1000 ? `${(c.currentValue / 1000).toFixed(1)}bn` : `${c.currentValue}m`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Context ── */}
      <AnalysisBox color={PURPLE}>
        HS2 Phase 1 covers {routeProfile.totalKm} km of route containing{" "}
        {routeProfile.tunnelKm} km of bored tunnel, {routeProfile.viaductKm} km of
        viaduct, {routeProfile.greenTunnelKm} km of green tunnel, over{" "}
        {routeProfile.bridgesAndUnderpasses} bridges and underpasses, four stations, two
        depots, and a new signalling and power system. The route affects{" "}
        {routeProfile.ancientWoodlandsAffected} ancient woodlands and{" "}
        {routeProfile.sssisAffected} SSSIs, each requiring bespoke environmental
        mitigation under statutory licence conditions. The cost per kilometre reflects
        the cumulative effect of these interventions: the tunnels alone account for a
        substantial share of the budget, while planning concessions (green tunnels, noise
        barriers, community funds), environmental mitigations (woodland translocation,
        species protection), and repeated design changes (the Euston redesign, the rolling
        stock procurement delay) have each added cost and time.
      </AnalysisBox>

      {/* ── Sources ── */}
      <div style={{
        fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace",
        lineHeight: 1.8,
      }}>
        <strong style={{ color: P.textMuted }}>Sources:</strong>{" "}
        {data.sources.map((s, i) => (
          <span key={i}>
            <a href={s.url} target="_blank" rel="noreferrer" style={{ color: P.textLight }}>
              {s.name}
            </a>
            {i < data.sources.length - 1 ? " | " : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
