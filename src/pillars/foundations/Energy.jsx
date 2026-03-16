import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend as RLegend,
} from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { fetchDataset } from "../../hooks/useDataset";

const MIX_FUELS = [
  { key: "coal", label: "Coal", color: "#4A4A4A" },
  { key: "petroleum", label: "Petroleum", color: P.sienna },
  { key: "gas", label: "Natural Gas", color: P.yellow },
  { key: "nuclear", label: "Nuclear", color: P.navy },
  { key: "renewables", label: "Wind, Solar & Hydro", color: P.teal },
  { key: "bioenergy", label: "Bioenergy & Waste", color: "#4A7A58" },
  { key: "imports", label: "Net Electricity Imports", color: P.grey },
];

const ELEC_FUELS = [
  { key: "convThermal", label: "Coal & Other Thermal", color: "#4A4A4A" },
  { key: "ccgt", label: "Gas (CCGT)", color: P.yellow },
  { key: "nuclear", label: "Nuclear", color: P.navy },
  { key: "renewables", label: "Renewables", color: P.teal },
];


export default function Energy() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [primaryView, setPrimaryView] = useState("mix");
  const [elecView, setElecView] = useState("generation");
  const [securityView, setSecurityView] = useState("gasStorage");
  const [securityView2, setSecurityView2] = useState("importsFuel");

  const elecPctData = useMemo(() => {
    if (!data?.electricity) return [];
    return data.electricity.map((row) => {
      const total = row.convThermal + row.ccgt + row.nuclear + row.renewables;
      if (total === 0) return { year: row.year };
      return {
        year: row.year,
        convThermal: Math.round((row.convThermal / total) * 1000) / 10,
        ccgt: Math.round((row.ccgt / total) * 1000) / 10,
        nuclear: Math.round((row.nuclear / total) * 1000) / 10,
        renewables: Math.round((row.renewables / total) * 1000) / 10,
      };
    });
  }, [data]);

  useEffect(() => {
    fetchDataset("energy.json")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Energy</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading DESNZ energy data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Energy</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const latestMix = data.energyMix[data.energyMix.length - 1];
  const latestElec = data.electricity[data.electricity.length - 1];
  const latestSpend = data.expenditure[data.expenditure.length - 1];
  const latestImport = data.importDependency[data.importDependency.length - 1];
  const latestFuel = data.fuelConsumption[data.fuelConsumption.length - 1];

  const fossilPct = (latestMix.coal + latestMix.petroleum + latestMix.gas).toFixed(1);
  const lowCarbonPct = (latestMix.nuclear + latestMix.renewables + latestMix.bioenergy).toFixed(1);

  const renewElecPct = latestElec.totalNet > 0
    ? ((latestElec.renewables / latestElec.totalNet) * 100).toFixed(1)
    : "--";

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Energy</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          DUKES {latestMix.year}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — PRIMARY ENERGY
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Primary Energy</h3>
        <p style={SECTION_NOTE}>
          Primary energy is the total energy consumed across the whole economy — heating, transport,
          industry and electricity generation combined. It is measured before conversion losses,
          so includes fuel burned in power stations as well as petrol in cars and gas in boilers.
          Fossil fuels dominate primary energy because of transport (around a quarter of total
          consumption) and industrial use, both of which remain largely oil- and gas-dependent.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Total Consumption"
            value={`${latestFuel.total} mtoe`}
            change={`${latestMix.year}`}
            up={false}
            color={P.navy}
            delay={0.1}
          />
          <MetricCard
            label="Fossil Fuel Share"
            value={`${fossilPct}%`}
            change={`coal ${latestMix.coal}% + oil ${latestMix.petroleum}% + gas ${latestMix.gas}%`}
            up={true}
            color="#4A4A4A"
            delay={0.18}
          />
          <MetricCard
            label="Import Dependency"
            value={`${latestImport.importDependency}%`}
            change={`net energy importer`}
            up={latestImport.importDependency > 40}
            color={P.sienna}
            delay={0.26}
          />
          <MetricCard
            label="Household Energy Spend"
            value={`£${(latestSpend.domesticTotal / 1000).toFixed(1)}bn`}
            change={`gas £${(latestSpend.domesticGas / 1000).toFixed(1)}bn + elec £${(latestSpend.domesticElectricity / 1000).toFixed(1)}bn`}
            up={true}
            color={P.yellow}
            delay={0.34}
          />
        </div>

        <ChartCard
          label={primaryView === "mix" ? "Primary energy mix (% share)" : primaryView === "imports" ? "Net import dependency" : "Household energy expenditure (£m)"}
          yearRange={`1990–${latestMix.year}`}
          views={["mix", "imports", "spend"]}
          viewLabels={{ mix: "Mix", imports: "Imports", spend: "Spend" }}
          activeView={primaryView}
          onViewChange={setPrimaryView}
        >
          {primaryView === "mix" && <MixChart data={data.energyMix} />}
          {primaryView === "imports" && <ImportsChart data={data.importDependency} />}
          {primaryView === "spend" && <SpendChart data={data.expenditure} />}
        </ChartCard>

        {primaryView === "mix" && <Legend items={MIX_FUELS} />}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — ELECTRICITY
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={SECTION_HEADING}>Electricity Generation</h3>
        <p style={SECTION_NOTE}>
          Electricity is a subset of primary energy — roughly a quarter of total consumption goes
          to generating it. The electricity mix looks very different from the primary energy mix
          because transport and industrial fuel use (the main drivers of fossil fuel dominance)
          play no direct role in generation. Decarbonisation of the grid has therefore moved
          faster than decarbonisation of the economy as a whole.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Renewables Share"
            value={`${renewElecPct}%`}
            change={`of electricity generated (${latestElec.year})`}
            up={false}
            color={P.teal}
            delay={0.1}
          />
          <MetricCard
            label="Gas (CCGT)"
            value={`${latestElec.totalNet > 0 ? ((latestElec.ccgt / latestElec.totalNet) * 100).toFixed(1) : "--"}%`}
            change={`of electricity generated`}
            up={true}
            color={P.yellow}
            delay={0.18}
          />
          <MetricCard
            label="Nuclear"
            value={`${latestElec.totalNet > 0 ? ((latestElec.nuclear / latestElec.totalNet) * 100).toFixed(1) : "--"}%`}
            change={`of electricity generated`}
            up={false}
            color={P.navy}
            delay={0.26}
          />
          <MetricCard
            label="Total Generation"
            value={`${Math.round(latestElec.totalNet / 1000)} TWh`}
            change={`net, all generators (${latestElec.year})`}
            up={false}
            color={P.grey}
            delay={0.34}
          />
        </div>

        <ChartCard
          label="Electricity generation by fuel (% share)"
          yearRange={`1990–${latestElec.year}`}
        >
          <ElectricityChart data={elecPctData} />
        </ChartCard>

        <Legend items={ELEC_FUELS} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — ENERGY SECURITY
          ═══════════════════════════════════════════════════════════════ */}
      {data.energySecurity && (() => {
        const sec = data.energySecurity;
        const snap = sec.snapshot;
        const latestGas = sec.gasStorage[sec.gasStorage.length - 1];
        return (
          <div style={{ marginBottom: 40 }}>
            <h3 style={SECTION_HEADING}>Energy Security</h3>
            <p style={SECTION_NOTE}>
              Energy security depends on storage buffers, domestic production, and interconnection.
              The UK has among the lowest gas storage in Europe — just {snap.gasStorageDays} days of
              average demand — after the Rough storage field closed in 2017. The country has been a
              net energy importer since the mid-2000s as North Sea output declined.
            </p>

            {/* Live storage fill gauge */}
            {snap.liveFillPct != null && (
              <div style={{
                background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3,
                padding: "14px 20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
                display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
              }}>
                <div style={{ flex: "0 0 auto" }}>
                  <span style={{ fontSize: "11px", color: P.textMuted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Live storage fill
                  </span>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.red, lineHeight: 1.2 }}>
                    {snap.liveFillPct}%
                  </div>
                  <span style={{ fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
                    ≈ {snap.liveDaysOfDemand} days of demand
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{
                    height: 18, background: P.border, borderRadius: 9, overflow: "hidden", position: "relative",
                  }}>
                    <div style={{
                      width: `${snap.liveFillPct}%`, height: "100%",
                      background: snap.liveFillPct < 30 ? P.red : snap.liveFillPct < 60 ? P.yellow : P.teal,
                      borderRadius: 9, transition: "width 0.3s",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>0%</span>
                    <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
                      {sec.liveFill?.gasInStorageBcm ?? "–"} / {latestGas.capacityBcm} bcm
                    </span>
                    <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>100%</span>
                  </div>
                </div>
                <div style={{ flex: "0 0 auto", textAlign: "right" }}>
                  <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
                    National Gas · {snap.liveFillAsOf}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              <MetricCard
                label="Gas Storage Capacity"
                value={`${snap.gasStorageDays} days`}
                change={snap.liveFillPct != null
                  ? `${snap.liveFillPct}% full → ${snap.liveDaysOfDemand} days held (${snap.liveFillAsOf})`
                  : `${latestGas.capacityBcm} bcm capacity (${snap.gasStorageYear})`}
                up={false}
                color={P.red}
                delay={0.1}
              />
              <MetricCard
                label="Gas Import Dependency"
                value={`${snap.gasImportPct}%`}
                change={`of gas consumed (${snap.importsByFuelYear})`}
                up={true}
                color={P.sienna}
                delay={0.18}
              />
              <MetricCard
                label="Interconnector Capacity"
                value={`${(snap.totalInterconnectorMw / 1000).toFixed(1)} GW`}
                change={`${sec.interconnectors.length} links to ${[...new Set(sec.interconnectors.map(ic => ic.partner))].length} countries`}
                up={false}
                color={P.teal}
                delay={0.26}
              />
              <MetricCard
                label="Capacity Margin"
                value={`${snap.capacityMarginPct}%`}
                change={`de-rated, above peak demand (${snap.capacityMarginYear})`}
                up={false}
                color={P.navy}
                delay={0.34}
              />
            </div>

            <ChartCard
              label={
                securityView === "live30" ? "GB gas storage fill level — daily (National Gas)"
                : securityView === "gasStorage" ? "UK gas storage — days of average demand"
                : "Gas storage — international comparison (days of demand)"
              }
              yearRange={
                securityView === "live30" ? (sec.liveFill ? `Last 30 days to ${sec.liveFill.asOf}` : "")
                : securityView === "gasStorage" ? `2000–${snap.gasStorageYear}`
                : (sec.gasStorageIntlAsOf || "Latest available")
              }
              views={[...(sec.liveFill ? ["live30"] : []), "gasStorage", "gasIntl"]}
              viewLabels={{ live30: "Live (30 days)", gasStorage: "Gas Storage", gasIntl: "Intl Comparison" }}
              activeView={securityView}
              onViewChange={setSecurityView}
            >
              {securityView === "live30" && sec.liveFill?.history && (
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={sec.liveFill.history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} interval={4} />
                    <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} label={yAxisLabel("Storage fill level (%)")} />
                    <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}%`} />} />
                    <Area type="monotone" dataKey="fillPct" name="Fill level" stroke={P.red} fill={P.red} fillOpacity={0.15} strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {securityView === "gasStorage" && (
                <GasStorageChart data={sec.gasStorage} />
              )}
              {securityView === "gasIntl" && (
                <GasStorageIntlChart data={sec.gasStorageIntl} />
              )}
            </ChartCard>

            <ChartCard
              label={
                securityView2 === "importsFuel"
                  ? "Import dependency by fuel (% of consumption)"
                  : "De-rated electricity capacity margin (% above peak demand)"
              }
              yearRange={
                securityView2 === "importsFuel"
                  ? `2000–${snap.importsByFuelYear}`
                  : `2010–${snap.capacityMarginYear}`
              }
              views={["importsFuel", "capacity"]}
              viewLabels={{ importsFuel: "Imports by Fuel", capacity: "Capacity Margin" }}
              activeView={securityView2}
              onViewChange={setSecurityView2}
            >
              {securityView2 === "importsFuel" && (
                <ImportsByFuelChart data={sec.importsByFuel} />
              )}
              {securityView2 === "capacity" && (
                <CapacityMarginChart data={sec.capacityMargin} />
              )}
              {securityView2 === "capacity" && (
                <p style={{ fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, margin: "12px 0 0", maxWidth: 680 }}>
                  <strong>De-rated capacity margin</strong> measures how much spare generation capacity
                  the grid has above expected peak demand, after adjusting ("de-rating") each power
                  source for its realistic availability — e.g. wind is de-rated to ~8-10% of nameplate
                  because it may not be blowing at peak, while gas plants are de-rated to ~90%.
                  A margin below 5% signals elevated risk of supply shortfalls during cold, still
                  winter evenings when demand peaks and wind output is low.
                </p>
              )}
            </ChartCard>

            {/* Interconnectors table */}
            <div style={{ marginTop: 16, background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "16px 20px", boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
                Electricity interconnectors &middot; {snap.totalInterconnectorMw.toLocaleString()} MW total
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginTop: 12 }}>
                {sec.interconnectors.map((ic) => (
                  <div key={ic.name} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 10px", borderRadius: 3, background: "rgba(28,43,69,0.03)",
                    fontSize: "12px", fontFamily: "'DM Mono', monospace",
                  }}>
                    <span style={{ color: P.text, fontWeight: 500 }}>
                      {ic.name} <span style={{ color: P.textLight, fontWeight: 400 }}>→ {ic.partner}</span>
                    </span>
                    <span style={{ color: P.textMuted }}>
                      {ic.capacityMw.toLocaleString()} MW <span style={{ color: P.textLight }}>({ic.yearOpened})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Source */}
      <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 20 }}>
        ALL DATA:{" "}
        <a href="https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          DESNZ Digest of UK Energy Statistics (DUKES) 2025
        </a>
        {" "}&middot;{" "}
        <a href="https://www.nationalgrideso.com/research-and-publications/electricity-capacity-report" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          National Grid ESO Capacity Report
        </a>
        {" "}&middot;{" "}
        <a href="https://www.gie.eu/transparency/databases/storage-database/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          Gas Infrastructure Europe (GIE)
        </a>
        {" "}&middot; Data: 1990&ndash;{latestMix.year}
      </div>

      <AnalysisBox color={P.navy} label="Context">
        UK primary energy consumption: {latestFuel.total} mtoe ({latestMix.year}).
        {" "}Fossil fuels supply {fossilPct}% of all primary energy; low-carbon sources {lowCarbonPct}%.
        {" "}The electricity mix is different: renewables generated {renewElecPct}% of electricity,
        while gas (CCGT) provided {latestElec.totalNet > 0 ? ((latestElec.ccgt / latestElec.totalNet) * 100).toFixed(1) : "--"}%
        and nuclear {latestElec.totalNet > 0 ? ((latestElec.nuclear / latestElec.totalNet) * 100).toFixed(1) : "--"}%.
        {" "}Net import dependency: {latestImport.importDependency}%.
        {" "}Household energy spend: £{(latestSpend.domesticTotal / 1000).toFixed(1)}bn.
        {data.energySecurity && (() => {
          const snap = data.energySecurity.snapshot;
          return (
            <>
              {" "}UK gas storage provides just {snap.gasStorageDays} days of average demand —
              compared with 89 days in Germany and 103 in France.
              {" "}Gas import dependency has risen from net exporter status in 2000 to {snap.gasImportPct}%,
              oil from net exporter to {snap.oilImportPct}%.
              {" "}Electricity interconnector capacity stands at {(snap.totalInterconnectorMw / 1000).toFixed(1)} GW
              across {data.energySecurity.interconnectors.length} links. The de-rated capacity margin
              is {snap.capacityMarginPct}% ({snap.capacityMarginYear}).
            </>
          );
        })()}
      </AnalysisBox>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────

function ChartCard({ label, yearRange, views, viewLabels, activeView, onViewChange, children }) {
  return (
    <ShareableChart title={label}>
    <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px", marginBottom: 16, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
          {label} &middot; {yearRange}
        </span>
        {views && onViewChange && (
          <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
            {views.map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                style={{
                  background: activeView === v ? "rgba(28,43,69,0.06)" : "transparent",
                  border: "none",
                  color: activeView === v ? P.text : P.textLight,
                  padding: "4px 10px", fontSize: "10px", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  transition: "all 0.15s", borderRadius: 2,
                }}
              >
                {viewLabels[v]}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
    </ShareableChart>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 8, background: item.color, display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────

function MixChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" label={yAxisLabel("Share of primary energy (%)")} />
        <Tooltip content={<CustomTooltip />} />
        {MIX_FUELS.map((fuel) => (
          <Area key={fuel.key} type="monotone" dataKey={fuel.key} name={fuel.label} stackId="1" stroke={fuel.color} fill={fuel.color} fillOpacity={0.8} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ElectricityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" label={yAxisLabel("Share of generation (%)")} />
        <Tooltip content={<CustomTooltip />} />
        {ELEC_FUELS.map((fuel) => (
          <Area key={fuel.key} type="monotone" dataKey={fuel.key} name={fuel.label} stackId="1" stroke={fuel.color} fill={fuel.color} fillOpacity={0.8} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SpendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="£m" label={yAxisLabel("Household energy spend (£m)")} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="domesticGas" name="Household Gas" stackId="dom" fill={P.yellow} opacity={0.85} />
        <Bar dataKey="domesticElectricity" name="Household Electricity" stackId="dom" fill={P.teal} opacity={0.85} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ImportsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" label={yAxisLabel("Net import dependency (%)")} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="importDependency" name="Import Dependency" stroke={P.red} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Energy Security Charts ──────────────────────────────────────────

function GasStorageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis yAxisId="days" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Days of demand")} />
        <YAxis yAxisId="bcm" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Storage capacity (bcm)", { angle: 90, position: "insideRight" })} />
        <Tooltip content={<CustomTooltip />} />
        <RLegend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
        <Bar yAxisId="bcm" dataKey="capacityBcm" name="Storage capacity (bcm)" fill={P.grey} opacity={0.5} radius={[3, 3, 0, 0]} />
        <Line yAxisId="days" type="monotone" dataKey="daysOfDemand" name="Days of demand" stroke={P.red} strokeWidth={2.5} dot={{ r: 4, fill: P.red }} />
        <ReferenceLine yAxisId="days" y={89} stroke={P.textLight} strokeDasharray="4 4" label={{ value: "Germany (89 days)", fontSize: 10, fill: P.textLight, position: "top" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function GasStorageIntlChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit=" days" />
        <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={90} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v} days`} />} />
        <Bar dataKey="daysOfDemand" name="Days of demand" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell key={entry.country} fill={entry.country === "UK" ? P.red : P.grey} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ImportsByFuelChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" label={yAxisLabel("Import dependency (%)")} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
        <RLegend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
        <ReferenceLine y={0} stroke={P.textLight} />
        <Line type="monotone" dataKey="gasPct" name="Natural gas" stroke={P.yellow} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="oilPct" name="Oil" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="elecPct" name="Electricity" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CapacityMarginChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 'auto']} label={yAxisLabel("Capacity margin (%)")} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
        <Bar dataKey="marginPct" name="De-rated capacity margin" fill={P.navy} opacity={0.7} radius={[3, 3, 0, 0]} />
        <ReferenceLine y={5} stroke={P.red} strokeDasharray="4 4" label={{ value: "5% threshold", fontSize: 10, fill: P.red, position: "top" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
