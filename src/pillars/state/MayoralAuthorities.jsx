import { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell } from "recharts";
import P, { SCALES } from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE,
  AXIS_TICK_MONO, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import useIsMobile from "../../hooks/useIsMobile";
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import AnalysisBox from "../../components/AnalysisBox";
import CustomTooltip from "../../components/CustomTooltip";
import UKChoroplethMap from "../../components/UKChoroplethMap";

// Transport sub-category breakdown
const TRANSPORT_SUBS = [
  { key: "bus",            label: "Bus",                  color: "#2A6496" },
  { key: "rail",           label: "Rail",                 color: "#4E5D6C" },
  { key: "otherOps",       label: "Tram & other transit", color: "#6B8EC2" },
  { key: "concessionary",  label: "Concessionary fares",  color: P.teal },
  { key: "stations",       label: "Stations & interchanges", color: P.sienna },
  { key: "roads",          label: "Roads & highways",     color: "#5B8A6B" },
  { key: "traffic",        label: "Traffic & parking",    color: P.yellow },
  { key: "planning",       label: "Planning & other",     color: P.grey },
];

// Planning sub-category breakdown
const PLANNING_SUBS = [
  { key: "econDev",        label: "Economic development", color: "#7A5B8A" },
  { key: "business",       label: "Business support",     color: "#6B8EC2" },
  { key: "envInitiatives", label: "Environmental initiatives", color: "#5B8A6B" },
  { key: "community",      label: "Community development", color: P.teal },
  { key: "research",       label: "Economic research",    color: P.yellow },
  { key: "devControl",     label: "Development & building control", color: P.grey },
];

// Fire sub-category breakdown
const FIRE_SUBS = [
  { key: "firefighting",    label: "Firefighting operations", color: "#C25454" },
  { key: "emergencyPlan",   label: "Emergency planning",      color: "#D4914E" },
  { key: "communitySafety", label: "Community fire safety",   color: P.yellow },
];

// Generic config for all breakdowns
const BREAKDOWN_CONFIG = [
  { dataKey: "transportBreakdown", subs: TRANSPORT_SUBS, title: "Transport Breakdown" },
  { dataKey: "planningBreakdown",  subs: PLANNING_SUBS,  title: "Planning & Development Breakdown" },
  { dataKey: "fireBreakdown",      subs: FIRE_SUBS,      title: "Fire & Rescue Breakdown" },
];

// Service areas for the per-authority stacked chart
const DETAIL_SERVICES = [
  { key: "police",              label: "Police",                 color: "#4E5D6C" },
  { key: "transport",           label: "Transport",              color: P.navy },
  { key: "fire",                label: "Fire & rescue",          color: "#C25454" },
  { key: "education",           label: "Education",              color: "#6B8EC2" },
  { key: "planning",            label: "Planning & development", color: "#7A5B8A" },
  { key: "environment",         label: "Environmental",          color: "#5B8A6B" },
  { key: "housing",             label: "Housing",                color: "#4A7A58" },
  { key: "cultural",            label: "Cultural",               color: P.yellow },
  { key: "central",             label: "Central services",       color: P.grey },
  { key: "adultSocialCare",     label: "Adult social care",      color: P.teal },
  { key: "childrenSocialCare",  label: "Children's social care", color: P.sienna },
  { key: "publicHealth",        label: "Public health",          color: P.red },
];

const MAP_METRICS = {
  totalService: { label: "Total spending" },
  transport:    { label: "Transport" },
  police:       { label: "Police" },
  fire:         { label: "Fire & rescue" },
  planning:     { label: "Planning" },
};

const SOURCE = (
  <>SOURCE: <a href="https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>MHCLG Revenue Outturn</a></>
);

const ALL_YEARS = ["2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25"];

export default function MayoralAuthorities() {
  const isMobile = useIsMobile();
  const [mapMetric, setMapMetric] = useState("totalService");
  const [mapYear, setMapYear] = useState("2024-25");
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [detailView, setDetailView] = useState("absolute");
  const [perCapita, setPerCapita] = useState(false);

  // Load spending data
  const [spendingByAuth, setSpendingByAuth] = useState(null);
  useEffect(() => {
    fetch("/data/mayoral-spending.json")
      .then(r => r.json())
      .then(d => setSpendingByAuth(d.series.authorities.data))
      .catch(() => {});
  }, []);

  // Build map data
  const mapData = useMemo(() => {
    if (!spendingByAuth) return {};
    const result = {};
    for (const auth of spendingByAuth) {
      const yr = auth.years[mapYear];
      if (!yr) continue;
      let val = yr[mapMetric] || 0;
      if (perCapita && auth.population > 0) {
        val = Math.round((val * 1000) / auth.population);
      }
      result[auth.code] = val;
    }
    return result;
  }, [spendingByAuth, mapMetric, mapYear, perCapita]);

  // Authority lookup
  const authLookup = useMemo(() => {
    if (!spendingByAuth) return {};
    return Object.fromEntries(spendingByAuth.map(a => [a.code, a]));
  }, [spendingByAuth]);

  // Build detail chart data for selected authority
  const { chartAbs, chartPerCap, chartPct, pieData, singleYear, breakdowns } = useMemo(() => {
    if (!selectedAuth || !authLookup[selectedAuth.code]) return {};
    const auth = authLookup[selectedAuth.code];
    const pop = auth.population || 0;
    const keys = DETAIL_SERVICES.map(s => s.key);
    const abs = ALL_YEARS.filter(y => auth.years[y]).map(y => {
      const yr = auth.years[y];
      const row = { year: y };
      keys.forEach(k => { row[k] = Math.max(0, (yr[k] || 0) / 1000); });
      return row;
    });
    const pc = pop > 0 ? abs.map(row => {
      const out = { year: row.year };
      keys.forEach(k => { out[k] = Math.round((row[k] * 1e6) / pop); });
      return out;
    }) : null;
    const pct = abs.map(row => {
      const total = keys.reduce((s, k) => s + row[k], 0);
      const out = { year: row.year };
      if (total <= 0) { keys.forEach(k => { out[k] = 0; }); return out; }
      const activeKeys = keys.filter(k => row[k] > 0);
      let sum = 0;
      activeKeys.forEach((k, i) => {
        if (i < activeKeys.length - 1) {
          out[k] = Math.round((row[k] / total) * 1000) / 10;
          sum += out[k];
        } else {
          out[k] = Math.round((100 - sum) * 10) / 10;
        }
      });
      keys.filter(k => row[k] <= 0).forEach(k => { out[k] = 0; });
      return out;
    });
    // For single-year authorities, build pie chart data
    const singleYear = abs.length <= 1;
    const pie = singleYear && abs.length === 1
      ? DETAIL_SERVICES.filter(s => abs[0][s.key] > 0).map(s => ({
          key: s.key, label: s.label, color: s.color, value: abs[0][s.key],
        }))
      : null;
    // Service sub-breakdowns for the latest year with data
    const breakdowns = BREAKDOWN_CONFIG.map(({ dataKey, subs, title }) => {
      const yr = [...ALL_YEARS].reverse().find(y => auth.years[y]?.[dataKey]);
      if (!yr) return null;
      const bd = auth.years[yr][dataKey];
      const pie = subs
        .filter(s => (bd[s.key] || 0) > 0)
        .map(s => ({ key: s.key, label: s.label, color: s.color, value: bd[s.key] / 1000 }))
        .sort((a, b) => b.value - a.value);
      return pie.length > 1 ? { title, pie, year: yr } : null;
    }).filter(Boolean);
    return { chartAbs: abs, chartPerCap: pc, chartPct: pct, pieData: pie, singleYear, breakdowns };
  }, [selectedAuth, authLookup]);

  // Summary stats
  const summary = useMemo(() => {
    if (!spendingByAuth) return null;
    const latest = spendingByAuth.filter(a => a.years["2024-25"]);
    const totalSpend = latest.reduce((s, a) => s + (a.years["2024-25"]?.totalService || 0), 0);
    const totalPop = latest.reduce((s, a) => s + (a.population || 0), 0);
    const gla = spendingByAuth.find(a => a.code === "E12000007");
    const glaPct = gla ? Math.round((gla.years["2024-25"]?.totalService || 0) / totalSpend * 100) : 0;
    return {
      totalSpendBn: (totalSpend / 1e6).toFixed(1),
      authorityCount: latest.length,
      totalPop: (totalPop / 1e6).toFixed(1),
      glaPct,
    };
  }, [spendingByAuth]);

  // Aggregate spending over time (all CAs combined)
  const totalTrend = useMemo(() => {
    if (!spendingByAuth) return [];
    return ALL_YEARS.map(y => {
      let total = 0, grants = 0, councilTax = 0, levies = 0, earned = 0, n = 0;
      for (const a of spendingByAuth) {
        const yr = a.years[y];
        if (!yr) continue;
        total += yr.totalService || 0;
        grants += yr.govGrants || 0;
        councilTax += yr.councilTax || 0;
        levies += yr.levies || 0;
        earned += yr.earnedIncome || 0;
        n++;
      }
      return {
        year: y,
        total: Math.round(total / 1000),
        govGrants: Math.round(grants / 1000),
        councilTax: Math.round(councilTax / 1000),
        levies: Math.round(levies / 1000),
        earnedIncome: Math.round(earned / 1000),
        authorities: n,
      };
    });
  }, [spendingByAuth]);

  // Bar chart: spending by authority (latest year)
  const barData = useMemo(() => {
    if (!spendingByAuth) return [];
    return spendingByAuth
      .filter(a => a.years["2024-25"])
      .map(a => ({
        name: a.name.replace(/ Combined Authority$/, "").replace(/ Mayoral Combined Authority$/, ""),
        total: Math.round((a.years["2024-25"]?.totalService || 0) / 1000),
        code: a.code,
      }))
      .sort((a, b) => b.total - a.total);
  }, [spendingByAuth]);

  if (!spendingByAuth) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Mayoral Authorities</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading mayoral authority data...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>
          Mayoral & Combined Authorities
        </h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Transport, police, fire & devolved services
        </span>
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
          <MetricCard label="Total CA/GLA spending" value={`£${summary.totalSpendBn}bn`} change="2024-25" color={P.navy} delay={0.1} />
          <MetricCard label="Mayoral authorities" value={summary.authorityCount} change="with spending data" color={P.teal} delay={0.18} />
          <MetricCard label="Population covered" value={`${summary.totalPop}m`} change="residents in CA areas" color={P.sienna} delay={0.26} />
          <MetricCard label="GLA share" value={`${summary.glaPct}%`} change="of total CA spending" color={P.red} delay={0.34} />
        </div>
      )}

      {/* Spending map */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Spending by Authority</h3>
        <p style={SECTION_NOTE}>
          Net current expenditure by combined authority and the Greater London Authority.
          The GLA figure includes the Metropolitan Police (MOPAC), Transport for London,
          London Fire Brigade, and other functional bodies. Other combined authorities
          primarily spend on transport, fire and rescue, and economic development, with
          responsibilities varying by devolution deal.
        </p>

        {/* Metric selector + per-capita toggle */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, alignItems: "center" }}>
          {Object.entries(MAP_METRICS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setMapMetric(key)}
              style={{
                background: mapMetric === key ? "rgba(28,43,69,0.06)" : "transparent",
                border: "none",
                color: mapMetric === key ? P.text : P.textLight,
                padding: "4px 10px", fontSize: "10px", fontWeight: 500,
                textTransform: "uppercase", letterSpacing: "0.08em",
                cursor: "pointer", fontFamily: "'DM Mono', monospace",
                transition: "all 0.15s", borderRadius: 2,
              }}
            >
              {label}
            </button>
          ))}
          <span style={{ width: 1, height: 16, background: P.border, margin: "0 4px" }} />
          <button
            onClick={() => setPerCapita(p => !p)}
            style={{
              background: perCapita ? P.navy : "transparent",
              border: `1px solid ${perCapita ? P.navy : P.borderStrong}`,
              color: perCapita ? P.parchment : P.textLight,
              padding: "3px 10px", fontSize: "10px", fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.08em",
              cursor: "pointer", fontFamily: "'DM Mono', monospace",
              transition: "all 0.15s", borderRadius: 2,
            }}
          >
            Per capita
          </button>
        </div>

        {/* Map + detail side by side */}
        <div style={{ display: "flex", gap: 16, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ flex: selectedAuth && !isMobile ? "0 0 45%" : "1 1 100%", transition: "flex 0.3s" }}>
            <ChartCard
              title="Combined Authority Spending"
              subtitle={`${MAP_METRICS[mapMetric].label}${perCapita ? " per capita" : ""}, ${mapYear}`}
              source={SOURCE}
            >
              {/* Year selector */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {ALL_YEARS.map(yr => (
                  <button
                    key={yr}
                    onClick={() => setMapYear(yr)}
                    style={{
                      background: mapYear === yr ? "rgba(28,43,69,0.06)" : "transparent",
                      border: "none",
                      color: mapYear === yr ? P.text : P.textLight,
                      padding: "3px 8px", fontSize: "10px",
                      cursor: "pointer", fontFamily: "'DM Mono', monospace",
                      transition: "all 0.15s", borderRadius: 2,
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>

              <UKChoroplethMap
                topoUrl="/data/geo/cauth.topo.json"
                data={mapData}
                colorScale={SCALES.sequentialTeal}
                formatLegend={perCapita ? (v) => `£${Math.round(v)}` : (v) => `£${Math.round(v / 1000)}m`}
                selectedCode={selectedAuth?.code}
                onClickArea={(area) => setSelectedAuth(prev => prev?.code === area.code ? null : area)}
                renderTooltip={({ code, name, value }) => {
                  const auth = authLookup[code];
                  const yr = auth?.years[mapYear];
                  return (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4, color: P.parchment }}>{name}</div>
                      {perCapita ? (
                        <div style={{ color: P.teal }}>£{Math.round(value).toLocaleString()} per person</div>
                      ) : (
                        <div style={{ color: P.teal }}>£{Math.round(value / 1000).toLocaleString()}m</div>
                      )}
                      {yr && !perCapita && (
                        <div style={{ marginTop: 4, opacity: 0.7, lineHeight: 1.6 }}>
                          {yr.police > 0 && <div>Police: £{Math.round(yr.police / 1000).toLocaleString()}m</div>}
                          {yr.transport > 0 && <div>Transport: £{Math.round(yr.transport / 1000).toLocaleString()}m</div>}
                          {yr.fire > 0 && <div>Fire: £{Math.round(yr.fire / 1000).toLocaleString()}m</div>}
                        </div>
                      )}
                      {auth?.population && <div style={{ marginTop: 4, opacity: 0.5 }}>Pop: {auth.population.toLocaleString()}</div>}
                    </div>
                  );
                }}
              />
            </ChartCard>
          </div>

          {/* Detail chart for selected authority */}
          {selectedAuth && chartAbs && (
            <div style={{ flex: isMobile ? "1 1 auto" : "1 1 55%", minWidth: 0 }}>
              <ChartCard
                title={selectedAuth.name.replace(/ Combined Authority$/, "").replace(/ Mayoral Combined Authority$/, "")}
                subtitle={singleYear ? `Spending breakdown, ${chartAbs[0]?.year}` : detailView === "pct" ? "Spending share by service, %" : detailView === "perCap" ? "Spending by service per capita, £" : "Spending by service, £m"}
                source={SOURCE}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  {!singleYear ? (
                    <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
                      {[["absolute", "£m"], ...(chartPerCap ? [["perCap", "per cap"]] : []), ["pct", "%"]].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setDetailView(key)}
                          style={{
                            background: detailView === key ? "rgba(28,43,69,0.06)" : "transparent",
                            border: "none",
                            color: detailView === key ? P.text : P.textLight,
                            padding: "3px 10px", fontSize: "10px",
                            cursor: "pointer", fontFamily: "'DM Mono', monospace", borderRadius: 2,
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : <div />}
                  <button
                    onClick={() => setSelectedAuth(null)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 14, color: P.textMuted, lineHeight: 1,
                      fontFamily: "'DM Mono', monospace", padding: "2px 4px",
                    }}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                {singleYear && pieData ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          innerRadius={50}
                          strokeWidth={1}
                          stroke={P.bg}
                          isAnimationActive={false}
                        >
                          {pieData.map((d, i) => (
                            <Cell key={i} fill={d.color} fillOpacity={0.8} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            const total = pieData.reduce((s, p) => s + p.value, 0);
                            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
                            return (
                              <div style={{ background: P.bg, border: `1px solid ${P.navy}`, borderRadius: 3, padding: "8px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: P.text, lineHeight: 1.7 }}>
                                <div style={{ fontWeight: 600, color: d.color }}>{d.label}</div>
                                <div>£{d.value.toFixed(0)}m ({pct}%)</div>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Pie legend with values */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {pieData.map(d => {
                        const total = pieData.reduce((s, p) => s + p.value, 0);
                        return (
                          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, opacity: 0.8, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: P.textMuted, flex: 1 }}>{d.label}</span>
                            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: P.text }}>£{d.value.toFixed(0)}m</span>
                            <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: P.textLight, width: 40, textAlign: "right" }}>{total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Compact legend */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginBottom: 10 }}>
                      {DETAIL_SERVICES.filter(s => chartAbs.some(d => d[s.key] > 0)).map(s => (
                        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 1, background: s.color, opacity: 0.7 }} />
                          <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: P.textMuted }}>{s.label}</span>
                        </div>
                      ))}
                    </div>

                    <ResponsiveContainer width="100%" height={380}>
                      <AreaChart data={detailView === "pct" ? chartPct : detailView === "perCap" ? chartPerCap : chartAbs} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={detailView === "pct" ? [0, 100] : [0, "auto"]} allowDataOverflow={detailView === "pct"} label={yAxisLabel(detailView === "pct" ? "Share of spending (%)" : detailView === "perCap" ? "Spending per person (£)" : "Total spending (£m)")} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const isPct = detailView === "pct";
                            const isPC = detailView === "perCap";
                            const total = isPct ? 100 : payload.reduce((s, p) => s + (p.value || 0), 0);
                            const fmtV = (v) => isPct ? `${v.toFixed(1)}%` : isPC ? `£${Math.round(v).toLocaleString()}` : `£${v.toFixed(0)}m`;
                            return (
                              <div style={{ background: P.bg, border: `1px solid ${P.navy}`, borderRadius: 3, padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: P.text, lineHeight: 1.7 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedAuth.name.replace(/ Combined Authority$/, "").replace(/ Mayoral Combined Authority$/, "")}, {label}</div>
                                {!isPct && <div style={{ marginBottom: 4 }}>Total: {isPC ? `£${Math.round(total).toLocaleString()}/person` : `£${total.toFixed(0)}m`}</div>}
                                {payload.filter(p => p.value > 0).reverse().map(p => (
                                  <div key={p.dataKey} style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                                    <span style={{ color: p.fill, fontWeight: 600 }}>{DETAIL_SERVICES.find(s => s.key === p.dataKey)?.label}</span>
                                    <span>{fmtV(p.value)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        {DETAIL_SERVICES.filter(s => chartAbs.some(d => d[s.key] > 0)).map(s => (
                          <Area
                            key={s.key} type="monotone" dataKey={s.key} name={s.label}
                            stackId="1" fill={s.color} fillOpacity={0.7}
                            stroke={s.color} strokeWidth={0.5} isAnimationActive={false}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                )}
              </ChartCard>

              {/* Service sub-breakdowns — compact grid */}
              {breakdowns?.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(breakdowns.length, 3)}, 1fr)`, gap: 10, marginTop: 6 }}>
                  {breakdowns.map(({ title, pie, year }) => (
                    <ChartCard key={title} title={title} subtitle={`£m, ${year}`} source={SOURCE}>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={pie} dataKey="value" nameKey="label"
                            cx="50%" cy="50%" outerRadius={55} innerRadius={22}
                            strokeWidth={1} stroke={P.bg} isAnimationActive={false}
                          >
                            {pie.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              const total = pie.reduce((s, p) => s + p.value, 0);
                              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
                              return (
                                <div style={{ background: P.bg, border: `1px solid ${P.navy}`, borderRadius: 3, padding: "6px 10px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: P.text, lineHeight: 1.6 }}>
                                  <div style={{ fontWeight: 600, color: d.color }}>{d.label}</div>
                                  <div>£{d.value.toFixed(0)}m ({pct}%)</div>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {pie.map(d => {
                          const total = pie.reduce((s, p) => s + p.value, 0);
                          return (
                            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 7, height: 7, borderRadius: 1, background: d.color, opacity: 0.8, flexShrink: 0 }} />
                              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: P.textMuted, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
                              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: P.text, flexShrink: 0 }}>£{d.value.toFixed(0)}m</span>
                              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: P.textLight, width: 28, textAlign: "right", flexShrink: 0 }}>{total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </ChartCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Spending comparison bar chart */}
      {barData.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Spending by Authority</h3>
          <p style={SECTION_NOTE}>
            The Greater London Authority accounts for {summary?.glaPct}% of all combined
            authority spending, primarily through the Metropolitan Police and Transport for
            London. Outside London, Greater Manchester is the largest, followed by the West
            Midlands, Liverpool City Region, and West Yorkshire.
          </p>
          <ChartCard
            title="Total Spending by Authority"
            subtitle="Net current expenditure, £m, 2024-25"
            source={SOURCE}
          >
            <ResponsiveContainer width="100%" height={Math.max(320, barData.length * 36 + 30)}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£m")} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 9 : 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={isMobile ? 120 : 200} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
                        <div style={{ color: P.navy }}>£{d.total.toLocaleString()}m</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" name="£m" radius={[0, 3, 3, 0]} barSize={14}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.code === "E12000007" ? P.sienna : P.navy} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      )}

      {/* Total spending trend */}
      {totalTrend.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Total Combined Authority Spending</h3>
          <p style={SECTION_NOTE}>
            Aggregate net current expenditure across all combined authorities and the GLA
            has grown from £5.7bn in 2017-18 to £10.8bn in 2024-25. The 2020-21 spike
            reflects COVID-related expenditure channelled through mayoral authorities,
            including TfL emergency funding. Two new authorities (East Midlands, York and
            North Yorkshire) joined in 2024-25, contributing £264m.
          </p>
          <ChartCard
            title="Total CA & GLA Spending"
            subtitle="Aggregate net current expenditure, £m, all combined authorities"
            source={SOURCE}
            height={320}
          >
            <BarChart data={totalTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, "auto"]} label={yAxisLabel("£m")} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                      <div style={{ color: P.navy }}>£{d.total.toLocaleString()}m</div>
                      <div style={{ color: P.textMuted, fontSize: 10 }}>{d.authorities} authorities</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" name="Total spending (£m)" fill={P.navy} fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={isMobile ? 16 : 24} />
            </BarChart>
          </ChartCard>
        </section>
      )}

      {/* Funding sources */}
      {totalTrend.length > 0 && totalTrend[0].govGrants > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>How Combined Authorities Are Funded</h3>
          <p style={SECTION_NOTE}>
            Combined authorities draw revenue from four main sources: central government
            grants (including police grant for the GLA), council tax and mayoral precepts,
            levies charged to constituent councils (for transport, waste disposal, and other
            shared services), and earned income (including TfL fare revenue and commercial
            activity). The funding mix varies significantly: the GLA raises substantial
            council tax and earned income, while smaller combined authorities depend more
            heavily on government grants and council levies.
          </p>
          <ChartCard
            title="Combined Authority Revenue Sources"
            subtitle="Aggregate revenue by source, £m, all combined authorities and GLA"
            source={SOURCE}
            legend={[
              { key: "govGrants", label: "Government grants", color: P.navy },
              { key: "councilTax", label: "Council tax / precept", color: P.teal },
              { key: "levies", label: "Levies on councils", color: P.sienna },
              { key: "earnedIncome", label: "Earned income", color: P.yellow },
            ]}
            height={340}
          >
            <AreaChart data={totalTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, "auto"]} label={yAxisLabel("£m")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v.toLocaleString()}m`} />} />
              <Area type="monotone" dataKey="govGrants" name="Government grants" stackId="1" fill={P.navy} fillOpacity={0.65} stroke={P.navy} strokeWidth={1.5} />
              <Area type="monotone" dataKey="councilTax" name="Council tax / precept" stackId="1" fill={P.teal} fillOpacity={0.6} stroke={P.teal} strokeWidth={1.5} />
              <Area type="monotone" dataKey="levies" name="Levies on councils" stackId="1" fill={P.sienna} fillOpacity={0.55} stroke={P.sienna} strokeWidth={1.5} />
              <Area type="monotone" dataKey="earnedIncome" name="Earned income" stackId="1" fill={P.yellow} fillOpacity={0.5} stroke={P.yellow} strokeWidth={1} />
            </AreaChart>
          </ChartCard>
        </section>
      )}

      <AnalysisBox color={P.navy} label="Context">
        Combined and mayoral authorities spent a total of £{summary?.totalSpendBn}bn in
        2024-25, covering {summary?.totalPop}m residents across {summary?.authorityCount} authority
        areas. The Greater London Authority dominates at {summary?.glaPct}% of the total,
        reflecting its responsibility for the Metropolitan Police, Transport for London,
        and London Fire Brigade. Outside London, combined authorities primarily fund transport
        infrastructure, fire services, and economic development, with the scope of devolved
        powers varying by individual devolution deal. Newer combined authorities (East
        Midlands, York and North Yorkshire) have limited spending data as they were
        established in 2024.
      </AnalysisBox>
    </div>
  );
}
