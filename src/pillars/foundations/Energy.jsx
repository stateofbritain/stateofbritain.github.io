import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";

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

const sectionNote = {
  fontSize: "13px",
  lineHeight: 1.7,
  color: P.textMuted,
  fontFamily: "'Playfair Display', serif",
  margin: "0 0 18px",
  maxWidth: 720,
};

const sectionHeading = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "20px",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};

export default function Energy() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [primaryView, setPrimaryView] = useState("mix");
  const [elecView, setElecView] = useState("generation");

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
    fetch("/data/energy.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Energy</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading DESNZ energy data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Energy</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
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
        <span style={{ fontSize: "12px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          DUKES {latestMix.year}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — PRIMARY ENERGY
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={sectionHeading}>Primary Energy</h3>
        <p style={sectionNote}>
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
        <h3 style={sectionHeading}>Electricity Generation</h3>
        <p style={sectionNote}>
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

      {/* Source */}
      <div style={{ fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 20 }}>
        ALL DATA:{" "}
        <a href="https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
          DESNZ Digest of UK Energy Statistics (DUKES) 2025
        </a>
        {" "}&middot; Tables 1.1.1, 1.1.2, 1.1.6, 5.1.3 &middot; Data: 1990&ndash;{latestMix.year}
      </div>

      <AnalysisBox color={P.navy} label="Context">
        UK primary energy consumption: {latestFuel.total} mtoe ({latestMix.year}).
        {" "}Fossil fuels supply {fossilPct}% of all primary energy; low-carbon sources {lowCarbonPct}%.
        {" "}The electricity mix is different: renewables generated {renewElecPct}% of electricity,
        while gas (CCGT) provided {latestElec.totalNet > 0 ? ((latestElec.ccgt / latestElec.totalNet) * 100).toFixed(1) : "--"}%
        and nuclear {latestElec.totalNet > 0 ? ((latestElec.nuclear / latestElec.totalNet) * 100).toFixed(1) : "--"}%.
        {" "}Net import dependency: {latestImport.importDependency}%.
        {" "}Household energy spend: £{(latestSpend.domesticTotal / 1000).toFixed(1)}bn.
      </AnalysisBox>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────

function ChartCard({ label, yearRange, views, viewLabels, activeView, onViewChange, children }) {
  return (
    <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px", marginBottom: 16, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: "10px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
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
                  padding: "4px 10px", fontSize: "9px", fontWeight: 500,
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
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 8, background: item.color, display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontSize: "10px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{item.label}</span>
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
        <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} unit="%" />
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
        <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} unit="%" />
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
        <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} unit="£m" />
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
        <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="importDependency" name="Import Dependency" stroke={P.red} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
