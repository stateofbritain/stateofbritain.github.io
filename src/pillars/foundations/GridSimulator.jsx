import { useState, useMemo } from "react";
import {
  ComposedChart, AreaChart, Area, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, GRID_PROPS, yAxisLabel,
  toggleBtn,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import useIsMobile from "../../hooks/useIsMobile";

// ── Capacity milestones (GW) — aligned to NESO FES 2024 / CP30 ─
// Nuclear: AGR closures (Heysham/Torness by 2028-30), HPC unit 1 ~2030,
// both HPC units + SZB by 2035. FES range: 3-4 GW (2030), 4-6 GW (2035).
// Gas CCGT: CP30 retains 35 GW through 2030 as reserve. FES projects
// ~20-25 GW unabated gas still present in 2035.
// Interconnectors: CP30 projects 12-14 GW by 2030, 17-24 GW by 2035.
const CAPACITY = {
  nuclear:         { 2025: 5.88, 2030: 3.7,  2035: 5.2  },
  solar:           { 2025: 17,   2030: 45,   2035: 62   },
  windOffshore:    { 2025: 15.5, 2030: 45,   2035: 75   },
  windOnshore:     { 2025: 15.2, 2030: 27,   2035: 36   },
  hydro:           { 2025: 1.47, 2030: 1.5,  2035: 1.5  },
  biomass:         { 2025: 4.8,  2030: 4.0,  2035: 3.5  },
  gasCCGT:         { 2025: 33,   2030: 35,   2035: 22   },
  gasOCGT:         { 2025: 2.4,  2030: 2.5,  2035: 2.5  },
  oilPeakers:      { 2025: 0.5,  2030: 0.5,  2035: 0.5  },
  interconnectors: { 2025: 10.8, 2030: 13,   2035: 20   },
};

const STORAGE = {
  power:  { 2025: 7.5,  2030: 27,  2035: 35  },
  energy: { 2025: 30,   2030: 70,  2035: 100 },
};

// Peak component capacities (GW). Demand = sum of components * hourly profiles.
// 2025 winter peak should produce ~47 GW (actual Jan 2025 peak: 46.9 GW).
const DEMAND = {
  baseload:  { 2025: 42, 2030: 44, 2035: 46 },
  heatPump:  { 2025: 2,  2030: 5,  2035: 10 },
  ev:        { 2025: 2,  2030: 4,  2035: 7  },
  btmSolar:  { 2025: 5,  2030: 10, 2035: 15 },
};

// ── Scenario definitions ────────────────────────────────────────
const SCENARIOS = {
  dunkelflaute: {
    label: "Winter Dunkelflaute",
    season: "winter",
    nuclear: 0.90, windOffshore: 0.10, windOnshore: 0.05, solarPeak: 0.10,
    biomass: 0.85, hydro: 0.30,
    demandScale: 1.0, interconnectors: 0.10,
    sunrise: 8, sunset: 16,
  },
  summer: {
    label: "Summer Windy",
    season: "summer",
    nuclear: 0.90, windOffshore: 0.85, windOnshore: 0.75, solarPeak: 0.80,
    biomass: 0.60, hydro: 0.40,
    demandScale: 0.70, interconnectors: -0.05,
    sunrise: 5, sunset: 21,
  },
};

// ── 24-hour demand profiles (normalised 0-1) ────────────────────
const PROFILES = {
  winter: {
    baseload: [0.68,0.65,0.63,0.63,0.65,0.70,0.80,0.92,1.00,0.97,0.94,0.91,0.89,0.88,0.89,0.92,0.96,1.00,0.97,0.92,0.87,0.80,0.75,0.70],
    heatPump: [0.55,0.52,0.50,0.50,0.52,0.58,0.68,0.80,0.88,0.78,0.68,0.60,0.55,0.55,0.58,0.65,0.78,0.92,1.00,0.90,0.78,0.68,0.60,0.55],
    ev:       [0.10,0.08,0.08,0.08,0.08,0.10,0.12,0.15,0.18,0.15,0.12,0.10,0.10,0.10,0.15,0.25,0.50,0.80,1.00,0.85,0.60,0.35,0.20,0.12],
    btmSolar: [0,0,0,0,0,0,0,0,0.05,0.15,0.25,0.30,0.30,0.25,0.15,0.05,0,0,0,0,0,0,0,0],
  },
  summer: {
    baseload: [0.62,0.59,0.58,0.58,0.60,0.65,0.74,0.84,0.92,0.95,0.93,0.90,0.88,0.87,0.88,0.90,0.92,0.94,0.90,0.84,0.78,0.72,0.67,0.63],
    heatPump: [0.08,0.08,0.08,0.08,0.08,0.08,0.10,0.12,0.18,0.22,0.28,0.30,0.33,0.33,0.30,0.28,0.25,0.20,0.15,0.12,0.10,0.08,0.08,0.08],
    ev:       [0.08,0.07,0.07,0.07,0.07,0.08,0.10,0.12,0.15,0.12,0.10,0.10,0.10,0.10,0.12,0.22,0.45,0.75,0.95,0.80,0.55,0.30,0.15,0.10],
    btmSolar: [0,0,0,0,0,0.10,0.30,0.55,0.75,0.88,0.95,0.95,0.95,0.90,0.85,0.75,0.60,0.40,0.20,0.05,0,0,0,0],
  },
};

// ── Chart colours & legend ──────────────────────────────────────
// ── Electricity demand trend + NESO projections (TWh) ───────────
// Historical: DESNZ total net electricity generation (proxy for demand)
// Projections: NESO FES 2024 scenarios for total electricity demand
// Past FES: earlier projections showing how forecasts shifted over time
const DEMAND_TREND = [
  { year: 2000, actual: 357 },
  { year: 2001, actual: 364 },
  { year: 2002, actual: 367 },
  { year: 2003, actual: 377 },
  { year: 2004, actual: 373 },
  { year: 2005, actual: 377 },
  { year: 2006, actual: 374 },
  { year: 2007, actual: 374 },
  { year: 2008, actual: 367 },
  { year: 2009, actual: 355 },
  { year: 2010, actual: 362 },
  { year: 2011, actual: 348 },
  { year: 2012, actual: 342 },
  { year: 2013, actual: 337 },
  { year: 2014, actual: 318 },
  { year: 2015, actual: 319 },
  { year: 2016, actual: 320 },
  { year: 2017, actual: 319 },
  { year: 2018, actual: 315 },
  { year: 2019, actual: 310, fes19: 310 },
  { year: 2020, actual: 297 },
  { year: 2021, actual: 293, fes21: 293 },
  { year: 2022, actual: 310, fes19: 330, fes21: 310 },
  { year: 2023, actual: 280 },
  { year: 2024, actual: 269 },
  // FES 2024 scenarios diverge from here
  { year: 2025, fes24EE: 295, fes24CF: 290, fes19: 340, fes21: 320 },
  { year: 2027, fes24EE: 310, fes24CF: 295 },
  { year: 2028, fes19: 370, fes21: 345 },
  { year: 2030, fes24EE: 355, fes24CF: 315, fes19: 395, fes21: 370 },
  { year: 2033, fes24EE: 400, fes24CF: 330 },
  { year: 2035, fes24EE: 435, fes24CF: 340, fes19: 450, fes21: 425 },
];

const GEN_SOURCES = [
  { key: "nuclear",          label: "Nuclear",          color: P.navy },
  { key: "windOffshore",     label: "Wind (offshore)",  color: P.teal },
  { key: "windOnshore",      label: "Wind (onshore)",   color: "#3A9E8C" },
  { key: "solar",            label: "Solar",            color: P.yellow },
  { key: "hydro",            label: "Hydro",            color: "#5B9BD5" },
  { key: "biomass",          label: "Biomass",          color: "#4A7A58" },
  { key: "interconnectors",  label: "Interconnectors",  color: P.grey },
  { key: "storageDischarge", label: "Storage",          color: "#9B6ED0" },
  { key: "gas",              label: "Gas & oil",        color: P.sienna },
];

// ── NESO FES 2024 residual DSR not already in the model (GW at peak) ─
// Smart EV charging is already reflected in the demand assumptions (EV peak
// aligned to NESO diversity-adjusted values). Heat pump diversity is also
// partially included. The values below represent *additional* flexibility
// NESO assumes beyond what this model already captures.
const DSR_PROJECTION = [
  { year: 2025, heatPump: 0.2, industrial: 1.0, btmBattery: 0.1 },
  { year: 2026, heatPump: 0.3, industrial: 1.1, btmBattery: 0.2 },
  { year: 2027, heatPump: 0.5, industrial: 1.2, btmBattery: 0.3 },
  { year: 2028, heatPump: 0.7, industrial: 1.3, btmBattery: 0.5 },
  { year: 2029, heatPump: 1.0, industrial: 1.5, btmBattery: 0.7 },
  { year: 2030, heatPump: 1.3, industrial: 1.7, btmBattery: 0.8 },
  { year: 2031, heatPump: 1.5, industrial: 1.8, btmBattery: 0.9 },
  { year: 2032, heatPump: 1.7, industrial: 1.9, btmBattery: 1.0 },
  { year: 2033, heatPump: 1.9, industrial: 2.0, btmBattery: 1.1 },
  { year: 2034, heatPump: 2.0, industrial: 2.1, btmBattery: 1.2 },
  { year: 2035, heatPump: 2.2, industrial: 2.2, btmBattery: 1.3 },
];

const DSR_COMPONENTS = [
  { key: "heatPump",    label: "Heat pump flexibility",   color: P.sienna },
  { key: "industrial",  label: "Industrial & commercial",  color: P.navy },
  { key: "btmBattery",  label: "Behind-meter batteries",  color: "#9B6ED0" },
];

const NESO_SOURCE = (
  <>SOURCE: <a href="https://www.nationalgrideso.com/future-energy/future-energy-scenarios" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>NESO Future Energy Scenarios 2024</a> — simplified dispatch model</>
);

// ── Helpers ──────────────────────────────────────────────────────
function lerp(m, year) {
  if (year <= 2025) return m[2025];
  if (year >= 2035) return m[2035];
  if (year <= 2030) return m[2025] + ((year - 2025) / 5) * (m[2030] - m[2025]);
  return m[2030] + ((year - 2030) / 5) * (m[2035] - m[2030]);
}

function solarGen(hourOfDay, capacity, peakLF, sunrise, sunset) {
  if (hourOfDay < sunrise || hourOfDay >= sunset) return 0;
  const t = (hourOfDay - sunrise) / (sunset - sunrise);
  return capacity * peakLF * Math.sin(Math.PI * t);
}

// ── Simulation ──────────────────────────────────────────────────
function runSimulation(year, scenarioKey) {
  const sc = SCENARIOS[scenarioKey];
  const prof = PROFILES[sc.season];

  // Interpolate capacities
  const cap = {};
  for (const [k, m] of Object.entries(CAPACITY)) cap[k] = lerp(m, year);
  const storagePower = lerp(STORAGE.power, year);
  const storageEnergy = lerp(STORAGE.energy, year);

  // Storage split: pumped hydro 30% power / 70% energy, batteries 70% / 30%
  const phPower = storagePower * 0.30;
  const phEnergy = storageEnergy * 0.70;
  const phChargeRate = phPower * 0.83;
  const phEff = 0.75;
  const batPower = storagePower * 0.70;
  const batEnergy = storageEnergy * 0.30;
  const batEff = 0.85;

  let phSoC = phEnergy;
  let batSoC = batEnergy;

  // Demand capacities
  const dBase = lerp(DEMAND.baseload, year);
  const dHP = lerp(DEMAND.heatPump, year);
  const dEV = lerp(DEMAND.ev, year);
  const dBTM = lerp(DEMAND.btmSolar, year);

  const hourly = [];
  let totalCurtailment = 0;
  let unmetHours = 0;
  let peakDemand = 0;
  let peakCurtailment = 0;
  let peakUnmet = 0;
  let totalDischarged = 0;

  for (let h = 0; h < 96; h++) {
    const hod = h % 24;
    const day = Math.floor(h / 24) + 1;

    // Demand
    let demand = sc.demandScale * (
      dBase * prof.baseload[hod] +
      dHP * prof.heatPump[hod] +
      dEV * prof.ev[hod] -
      dBTM * prof.btmSolar[hod]
    );
    demand = Math.max(0, demand);
    if (demand > peakDemand) peakDemand = demand;

    // Non-dispatchable generation
    const nuclear = cap.nuclear * sc.nuclear;
    const solar = solarGen(hod, cap.solar, sc.solarPeak, sc.sunrise, sc.sunset);
    const windOff = cap.windOffshore * sc.windOffshore;
    const windOn = cap.windOnshore * sc.windOnshore;
    const hydro = cap.hydro * sc.hydro;
    const biomass = cap.biomass * sc.biomass;
    const intercon = cap.interconnectors * sc.interconnectors;
    const renewTotal = nuclear + solar + windOff + windOn + hydro + biomass + intercon;

    let storageOut = 0;
    let gasCCGT = 0;
    let gasOCGT = 0;
    let oil = 0;
    let curtailment = 0;
    let unmet = 0;

    if (renewTotal >= demand) {
      // Surplus: charge storage, curtail remainder
      const surplus = renewTotal - demand;
      const batChargeMax = Math.min(surplus, batPower, (batEnergy - batSoC) / batEff);
      const batCharge = Math.max(0, batChargeMax);
      const rem1 = surplus - batCharge;
      const phChargeMax = Math.min(rem1, phChargeRate, (phEnergy - phSoC) / phEff);
      const phCharge = Math.max(0, phChargeMax);
      batSoC += batCharge * batEff;
      phSoC += phCharge * phEff;
      curtailment = surplus - batCharge - phCharge;
      if (curtailment > peakCurtailment) peakCurtailment = curtailment;
      totalCurtailment += curtailment;
    } else if (scenarioKey === "dunkelflaute") {
      // Dunkelflaute: max resilience — gas dispatches first, storage
      // preserved for peak hours when deficit exceeds gas capacity
      let deficit = demand - renewTotal;

      gasCCGT = Math.min(deficit, cap.gasCCGT);
      deficit -= gasCCGT;
      gasOCGT = Math.min(deficit, cap.gasOCGT);
      deficit -= gasOCGT;
      oil = Math.min(deficit, cap.oilPeakers);
      deficit -= oil;

      // Storage only if gas cannot cover the full deficit
      if (deficit > 0) {
        const batOut = Math.min(deficit, batPower, batSoC);
        batSoC -= batOut;
        deficit -= batOut;
        const phOut = Math.min(deficit, phPower, phSoC);
        phSoC -= phOut;
        deficit -= phOut;
        storageOut = batOut + phOut;
        totalDischarged += storageOut;
      }

      unmet = Math.max(0, deficit);
      if (unmet > 0.01) {
        unmetHours++;
        if (unmet > peakUnmet) peakUnmet = unmet;
      }
    } else {
      // Summer: storage before gas (cheaper, lower carbon)
      let deficit = demand - renewTotal;

      const batOut = Math.min(deficit, batPower, batSoC);
      batSoC -= batOut;
      deficit -= batOut;
      const phOut = Math.min(deficit, phPower, phSoC);
      phSoC -= phOut;
      deficit -= phOut;
      storageOut = batOut + phOut;
      totalDischarged += storageOut;

      gasCCGT = Math.min(deficit, cap.gasCCGT);
      deficit -= gasCCGT;
      gasOCGT = Math.min(deficit, cap.gasOCGT);
      deficit -= gasOCGT;
      oil = Math.min(deficit, cap.oilPeakers);
      deficit -= oil;
      unmet = Math.max(0, deficit);

      if (unmet > 0.01) {
        unmetHours++;
        if (unmet > peakUnmet) peakUnmet = unmet;
      }
    }

    hourly.push({
      hour: h,
      label: `Day ${day} ${String(hod).padStart(2, "0")}:00`,
      nuclear, windOffshore: windOff, windOnshore: windOn,
      solar, hydro, biomass, interconnectors: intercon,
      storageDischarge: storageOut,
      gas: gasCCGT + gasOCGT + oil,
      demand,
      phSoC, batSoC,
      curtailment,
      unmetDemand: unmet > 0.01 ? -unmet : 0,
    });
  }

  return {
    hourly,
    metrics: {
      totalCurtailment,
      unmetDemandHours: unmetHours,
      peakDemand,
      peakCurtailment,
      peakUnmetDemand: peakUnmet,
      storageUtilisation: storageEnergy > 0
        ? Math.min(100, (totalDischarged / storageEnergy) * 100)
        : 0,
    },
  };
}

// ── Component ───────────────────────────────────────────────────
export default function GridSimulator() {
  const isMobile = useIsMobile();
  const [year, setYear] = useState(2030);
  const [scenario, setScenario] = useState("dunkelflaute");
  const sim = useMemo(() => runSimulation(year, scenario), [year, scenario]);
  const m = sim.metrics;

  const xTicks = isMobile ? [0, 24, 48, 72] : [0, 12, 24, 36, 48, 60, 72, 84];
  const hourFmt = (h) => {
    if (h % 24 === 0) return `Day ${h / 24 + 1}`;
    return `${String(h % 24).padStart(2, "0")}:00`;
  };

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(26px, 4vw, 36px)",
        fontWeight: 600,
        color: P.text,
        margin: "0 0 6px",
      }}>
        Energy Security
      </h2>
      <p style={{ ...SECTION_NOTE, margin: "0 0 24px", maxWidth: 720 }}>
        UK electricity demand has fallen by nearly 30% since its 2005 peak, driven by
        efficiency gains in lighting, appliances and insulation. All NESO scenarios now
        project significant demand growth as electrification of heating and transport
        adds substantial new load. This raises questions about security of supply during
        extended winter periods of low wind and solar output (Dunkelflaute).
      </p>

      {/* ── Demand Trend Chart ─────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Electricity Demand: Historical &amp; Projected</h3>
        <p style={SECTION_NOTE}>
          Total UK net electricity generation (a proxy for demand) from DESNZ statistics,
          with NESO Future Energy Scenarios 2024 projections. The two FES 2024 lines
          show the Electric Engagement scenario (high electrification) and the
          Counterfactual (slower progress). Past FES projections are shown in lighter
          lines, showing how demand forecasts have shifted over successive vintages.
        </p>

        <ChartCard
          title="UK Electricity Demand"
          subtitle="TWh, 2000-2035, with NESO FES projections"
          source={<>SOURCE: <a href="https://www.gov.uk/government/statistics/electricity-section-5-energy-trends" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DESNZ Energy Trends</a>; <a href="https://www.nationalgrideso.com/future-energy/future-energy-scenarios" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>NESO FES 2024</a></>}
          legend={[
            { key: "actual", label: "Actual", color: P.text },
            { key: "fes24EE", label: "FES 2024 (Electric Engagement)", color: P.teal },
            { key: "fes24CF", label: "FES 2024 (Counterfactual)", color: P.navy },
            { key: "fes19", label: "FES 2019 (Leading the Way)", color: P.textLight },
            { key: "fes21", label: "FES 2021 (Leading the Way)", color: P.border },
          ]}
          height={340}
        >
          <ComposedChart data={DEMAND_TREND} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2000, 2035]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 500]}
              label={yAxisLabel("TWh")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v} TWh`} />} />
            <ReferenceLine x={2024.5} stroke={P.border} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="actual" stroke={P.text} strokeWidth={2.5} dot={false} name="Actual" connectNulls />
            <Line type="monotone" dataKey="fes24EE" stroke={P.teal} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2.5 }} name="FES 2024 (Electric Engagement)" connectNulls />
            <Line type="monotone" dataKey="fes24CF" stroke={P.navy} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2.5 }} name="FES 2024 (Counterfactual)" connectNulls />
            <Line type="monotone" dataKey="fes19" stroke={P.textLight} strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="FES 2019" connectNulls />
            <Line type="monotone" dataKey="fes21" stroke={P.border} strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="FES 2021" connectNulls />
          </ComposedChart>
        </ChartCard>
      </section>

      {/* ── Simulation ─────────────────────────────────────────── */}
      <h3 style={SECTION_HEADING}>96-Hour Dispatch Simulation</h3>
      <p style={SECTION_NOTE}>
        A simplified dispatch model for the GB grid over 96 hours (4 days). Capacity
        projections from NESO FES, interpolated between 2025, 2030 and 2035 milestones.
        Dunkelflaute (German: "dark doldrums") refers to extended winter periods of
        sustained low wind and little sunshine, typically lasting several days, when
        renewable output falls to a fraction of installed capacity while heating demand
        peaks. In Dunkelflaute mode, gas and oil are dispatched before storage (max
        resilience), preserving storage for peak hours when gas capacity alone cannot
        meet demand. The model does not include demand-side response, transmission
        constraints, or frequency markets.
      </p>

      {/* ── Controls ───────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        gap: 24,
        alignItems: "flex-end",
        flexWrap: "wrap",
        marginBottom: 20,
      }}>
        <div style={{ flex: "1 1 280px" }}>
          <span style={{ fontSize: "11px", color: P.textMuted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Year
          </span>
          <input
            type="range"
            min={2025}
            max={2035}
            step={1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: "100%", accentColor: P.teal, margin: "4px 0" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "20px", fontWeight: 600, fontFamily: "'Playfair Display', serif", color: P.text }}>
              {year}
            </span>
            <span style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
              NESO FES capacity projections
            </span>
          </div>
        </div>
        <div>
          <span style={{ fontSize: "11px", color: P.textMuted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
            Scenario
          </span>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
            <button style={toggleBtn(scenario === "dunkelflaute")} onClick={() => setScenario("dunkelflaute")}>
              Dunkelflaute
            </button>
            <button style={toggleBtn(scenario === "summer")} onClick={() => setScenario("summer")}>
              Summer Windy
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric cards ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        <MetricCard
          label="Peak demand"
          value={`${m.peakDemand.toFixed(1)} GW`}
          change={`${SCENARIOS[scenario].label}`}
          color={P.navy}
          delay={0}
        />
        <MetricCard
          label="Renewable curtailment"
          value={`${m.totalCurtailment.toFixed(0)} GWh`}
          change="Over 96 hours"
          color={P.teal}
          delay={0.05}
        />
        <MetricCard
          label="Unmet demand"
          value={`${m.unmetDemandHours} hours`}
          change={m.unmetDemandHours === 0 ? "No shortfall" : `Peak ${m.peakUnmetDemand.toFixed(1)} GW`}
          color={m.unmetDemandHours > 0 ? P.red : P.teal}
          delay={0.1}
        />
        <MetricCard
          label="Storage utilisation"
          value={`${m.storageUtilisation.toFixed(0)}%`}
          change={`of ${lerp(STORAGE.energy, year).toFixed(0)} GWh`}
          color="#9B6ED0"
          delay={0.15}
        />
      </div>

      {/* ── Simulation Charts (side by side on desktop) ───────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 16,
        marginBottom: 16,
        alignItems: "start",
      }}>
        <ChartCard
          title="Generation Dispatch"
          subtitle={`${SCENARIOS[scenario].label}, ${year}`}
          source={NESO_SOURCE}
          legend={GEN_SOURCES.concat([{ key: "demand", label: "Demand", color: P.text }])}
          height={isMobile ? 300 : 360}
        >
          <ComposedChart data={sim.hourly} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 95]}
              ticks={xTicks}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={hourFmt}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              label={yAxisLabel("GW")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)} GW`} />} />
            {GEN_SOURCES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stackId="gen"
                fill={s.color}
                fillOpacity={0.5}
                stroke={s.color}
                strokeWidth={0.5}
                name={s.label}
                isAnimationActive={false}
              />
            ))}
            <Line
              type="monotone"
              dataKey="demand"
              stroke={P.text}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="Demand"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartCard>

        <ChartCard
          title="Renewable Curtailment & Unmet Demand"
          subtitle={`${SCENARIOS[scenario].label}, ${year}`}
          source={NESO_SOURCE}
          legend={[
            { key: "curtailment", label: "Renewable curtailment", color: P.teal },
            { key: "unmetDemand", label: "Unmet demand", color: P.red },
          ]}
          height={isMobile ? 300 : 360}
        >
          <ComposedChart data={sim.hourly} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 95]}
              ticks={xTicks}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={hourFmt}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              label={yAxisLabel("GW")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)} GW`} />} />
            <ReferenceLine y={0} stroke={P.textLight} />
            <Area type="monotone" dataKey="curtailment" fill={P.teal} fillOpacity={0.4} stroke={P.teal} strokeWidth={1} name="Renewable curtailment" isAnimationActive={false} />
            <Area type="monotone" dataKey="unmetDemand" fill={P.red} fillOpacity={0.4} stroke={P.red} strokeWidth={1} name="Unmet demand" isAnimationActive={false} />
          </ComposedChart>
        </ChartCard>
      </div>

      {/* ── Storage State of Charge (compact) ────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <ChartCard
          title="Storage State of Charge"
          subtitle={`${year}, ${lerp(STORAGE.energy, year).toFixed(0)} GWh total capacity`}
          source={NESO_SOURCE}
          legend={[
            { key: "phSoC", label: "Pumped hydro", color: "#5B9BD5" },
            { key: "batSoC", label: "Batteries", color: "#9B6ED0" },
          ]}
          height={200}
        >
          <LineChart data={sim.hourly} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 95]}
              ticks={xTicks}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={hourFmt}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              label={yAxisLabel("GWh")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)} GWh`} />} />
            <Line type="monotone" dataKey="phSoC" stroke="#5B9BD5" strokeWidth={2} dot={false} name="Pumped hydro" isAnimationActive={false} />
            <Line type="monotone" dataKey="batSoC" stroke="#9B6ED0" strokeWidth={2} dot={false} name="Batteries" isAnimationActive={false} />
          </LineChart>
        </ChartCard>
      </div>

      {/* ── Chart reading guide ──────────────────────────────── */}
      <p style={{ ...SECTION_NOTE, marginBottom: 32 }}>
        Generation by source is stacked in merit order, with total demand overlaid
        as a dashed line. Where the stack exceeds demand, the surplus chart shows
        renewable generation that must be curtailed. Where demand exceeds all dispatched sources, unmet demand
        appears as a negative bar. Storage state of charge tracks energy remaining
        in pumped hydro and batteries (starting at full capacity).
      </p>

      {/* ── Capacity Table ────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Installed Capacity ({year})</h3>
        <p style={SECTION_NOTE}>
          Generation and storage capacity used in this simulation, interpolated from
          NESO FES milestones for 2025, 2030 and 2035.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
          gap: "8px 20px",
          fontSize: "12px",
          fontFamily: "'DM Mono', monospace",
          color: P.text,
          background: P.bgCard,
          border: `1px solid ${P.border}`,
          borderRadius: 6,
          padding: 16,
        }}>
          {Object.entries(CAPACITY).map(([k, m]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${P.border}`, padding: "4px 0" }}>
              <span style={{ color: P.textMuted }}>{
                k === "gasCCGT" ? "Gas CCGT" :
                k === "gasOCGT" ? "Gas OCGT" :
                k === "oilPeakers" ? "Oil peakers" :
                k === "windOffshore" ? "Wind (offshore)" :
                k === "windOnshore" ? "Wind (onshore)" :
                k.charAt(0).toUpperCase() + k.slice(1)
              }</span>
              <span style={{ fontWeight: 500 }}>{lerp(m, year).toFixed(1)} GW</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${P.border}`, padding: "4px 0" }}>
            <span style={{ color: P.textMuted }}>Storage power</span>
            <span style={{ fontWeight: 500 }}>{lerp(STORAGE.power, year).toFixed(1)} GW</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${P.border}`, padding: "4px 0" }}>
            <span style={{ color: P.textMuted }}>Storage energy</span>
            <span style={{ fontWeight: 500 }}>{lerp(STORAGE.energy, year).toFixed(0)} GWh</span>
          </div>
        </div>
      </section>

      {/* ── Load Factors Table ────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Assumed Load Factors</h3>
        <p style={SECTION_NOTE}>
          Capacity factors applied to installed capacity for each scenario. Dunkelflaute
          assumes sustained low wind and cloud over 4 days with full winter demand.
          Summer Windy assumes high renewable output with reduced demand (70% of peak).
          Dunkelflaute conditions are typically driven by persistent anticyclonic weather
          systems that extend across northwestern Europe, meaning interconnector imports
          are unreliable as neighbouring countries face similar supply constraints.
        </p>
        <div style={{
          fontSize: "12px",
          fontFamily: "'DM Mono', monospace",
          color: P.text,
          background: P.bgCard,
          border: `1px solid ${P.border}`,
          borderRadius: 6,
          padding: 16,
          overflowX: "auto",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${P.border}` }}>
                <th style={{ textAlign: "left", padding: "4px 8px 4px 0", color: P.textMuted, fontWeight: 500 }}>Source</th>
                <th style={{ textAlign: "right", padding: "4px 8px", color: P.textMuted, fontWeight: 500 }}>Dunkelflaute</th>
                <th style={{ textAlign: "right", padding: "4px 0 4px 8px", color: P.textMuted, fontWeight: 500 }}>Summer Windy</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Wind (offshore)", "10%", "85%"],
                ["Wind (onshore)", "5%", "75%"],
                ["Solar (peak)", "10%", "80%"],
                ["Nuclear", "90%", "90%"],
                ["Hydro", "30%", "40%"],
                ["Biomass", "85%", "60%"],
                ["Interconnectors", "10%", "\u22125% (net export)"],
                ["Demand vs peak", "100%", "70%"],
              ].map(([label, dunk, summer]) => (
                <tr key={label} style={{ borderBottom: `1px solid ${P.border}` }}>
                  <td style={{ padding: "4px 8px 4px 0", color: P.textMuted }}>{label}</td>
                  <td style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500 }}>{dunk}</td>
                  <td style={{ textAlign: "right", padding: "4px 0 4px 8px", fontWeight: 500 }}>{summer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Demand Assumptions ───────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Demand Assumptions vs NESO FES 2024</h3>
        <p style={SECTION_NOTE}>
          Demand components (heat pumps, EVs, behind-the-meter solar) are aligned to
          NESO FES 2024 (Electric Engagement) projections, including diversity factors
          and smart charging assumptions. The model does not include demand-side response
          (DSR), which NESO assumes will reduce peak demand by an estimated 8-15 GW by
          2035 through time-of-use tariffs, flexible heat pump operation and managed EV
          charging. DSR depends on consumer behaviour change and infrastructure that does
          not yet exist at scale. When all other demand components are aligned to NESO
          projections, the DSR assumption is approximately equal to the remaining gap
          between gross peak demand and available supply capacity. NESO values below
          are approximate ranges from published FES data workbooks.
        </p>
        <div style={{
          fontSize: "12px",
          fontFamily: "'DM Mono', monospace",
          color: P.text,
          background: P.bgCard,
          border: `1px solid ${P.border}`,
          borderRadius: 6,
          padding: 16,
          overflowX: "auto",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${P.border}` }}>
                <th style={{ textAlign: "left", padding: "4px 8px 4px 0", color: P.textMuted, fontWeight: 500 }}>Component</th>
                <th style={{ textAlign: "right", padding: "4px 8px", color: P.textMuted, fontWeight: 500 }}>Model 2025</th>
                <th style={{ textAlign: "right", padding: "4px 8px", color: P.textMuted, fontWeight: 500 }}>Model 2035</th>
                <th style={{ textAlign: "right", padding: "4px 8px", color: P.textMuted, fontWeight: 500 }}>NESO 2035 (approx.)</th>
                <th style={{ textAlign: "left", padding: "4px 0 4px 8px", color: P.textMuted, fontWeight: 500 }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Baseload", "42 GW", "46 GW", "~45\u201348 GW", "Broadly aligned"],
                ["Heat pumps (peak)", "2 GW", "10 GW", "~8\u201312 GW", "Aligned (with diversity factors)"],
                ["EVs (peak)", "2 GW", "7 GW", "~5\u20138 GW", "Aligned (with smart charging)"],
                ["BTM solar (reduction)", "5 GW", "15 GW", "~12\u201318 GW", "Aligned"],
                ["Demand-side response", "\u2014", "\u2014", "~8\u201315 GW reduction", "Not modelled (see note)"],
                ["Net winter peak", "~45 GW", "~58\u201362 GW", "~50\u201358 GW", "Difference is DSR"],
              ].map(([label, m25, m35, neso, note]) => (
                <tr key={label} style={{ borderBottom: `1px solid ${P.border}` }}>
                  <td style={{ padding: "4px 8px 4px 0", color: P.textMuted }}>{label}</td>
                  <td style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500 }}>{m25}</td>
                  <td style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500 }}>{m35}</td>
                  <td style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500 }}>{neso}</td>
                  <td style={{ padding: "4px 0 4px 8px", color: P.textMuted, fontSize: "11px" }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── DSR Projection ─────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Residual Demand-Side Response</h3>
        <p style={SECTION_NOTE}>
          Demand-side response (DSR) refers to the deliberate shifting or reduction of
          electricity consumption during peak periods. Smart EV charging, the largest
          single DSR component in NESO projections, is already reflected in this model's
          demand assumptions (EV peak aligned to NESO diversity-adjusted values). The
          chart below shows the remaining DSR that NESO assumes beyond what this model
          captures: active heat pump flexibility (pre-heating homes during off-peak hours
          using thermal inertia), industrial and commercial load shifting, and
          behind-the-meter batteries. In winter, behind-meter batteries have limited
          solar input and would rely on overnight grid charging to shift load from
          evening peaks, reducing their effective contribution during a dunkelflaute.
          Delivering DSR at scale requires widespread smart meter rollout, time-of-use
          tariff adoption, and sustained consumer behaviour change.
        </p>

        <ChartCard
          title="Residual DSR (Beyond Model Assumptions)"
          subtitle="GW additional peak reduction, NESO FES 2024 (approx.)"
          source={<>SOURCE: <a href="https://www.nationalgrideso.com/future-energy/future-energy-scenarios" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>NESO FES 2024</a> — approximate values from data workbook</>}
          legend={DSR_COMPONENTS}
          height={320}
        >
          <AreaChart data={DSR_PROJECTION} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[2025, 2035]}
              tick={AXIS_TICK_MONO}
              tickLine={false}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              tick={AXIS_TICK_MONO}
              tickLine={false}
              axisLine={false}
              domain={[0, 8]}
              label={yAxisLabel("GW")}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)} GW`} />} />
            {DSR_COMPONENTS.map((c) => (
              <Area
                key={c.key}
                type="monotone"
                dataKey={c.key}
                stackId="dsr"
                fill={c.color}
                fillOpacity={0.4}
                stroke={c.color}
                strokeWidth={1.5}
                name={c.label}
              />
            ))}
          </AreaChart>
        </ChartCard>
      </section>

      {/* ── Analysis ──────────────────────────────────────────── */}
      <AnalysisBox color={P.teal} label="Methodology">
        This simulator models hourly dispatch for the GB electricity system over a
        96-hour period. Installed capacity follows NESO Future Energy Scenarios
        milestones for 2025, 2030 and 2035, with linear interpolation for intermediate
        years. Two weather scenarios, a winter Dunkelflaute and a high-renewables summer,
        bracket the range of grid stress conditions. Storage is split between pumped
        hydro (75% round-trip efficiency) and batteries (85%). Dispatch follows a
        simplified merit order: renewables and nuclear first, then storage discharge,
        then gas CCGT, OCGT and oil peakers. The model does not include transmission
        constraints, frequency response markets, demand-side response (such as smart EV
        charging or time-of-use tariffs), hydrogen electrolysis, or cross-border
        balancing beyond fixed interconnector flows. Peak demand values are therefore
        higher than NESO central projections, which assume significant demand flexibility.
      </AnalysisBox>
      <AnalysisBox color={P.teal} label="Uncertainty">
        Several of these assumptions may prove conservative or optimistic. NESO demand
        projections depend on the pace of heat pump and EV adoption, which could be
        slower than modelled, reducing the supply gap. On the supply side, gas plant
        lifetime extensions, the pace of renewable and storage buildout, and nuclear
        commissioning timelines all introduce uncertainty in both directions. A milder
        winter or shorter dunkelflaute would ease the constraint, while a more severe
        or prolonged event would deepen it. The model uses fixed load factors rather
        than stochastic weather, so it does not capture the full distribution of
        outcomes. In practice, the most likely failure mode is not a sustained system-wide
        shortfall but a marginal system tripping into deficit when one or two large gas
        plants suffer unplanned outages during a stress event. In winter 2024-25 the GB
        grid operated within 3 GW of total available capacity. Within the range of
        plausible assumptions, security of supply during extended winter low-wind periods
        becomes a binding constraint as the system tightens through the early 2030s.
      </AnalysisBox>
    </div>
  );
}
