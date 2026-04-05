import { useMemo, useState } from "react";
import P from "../../theme/palette";
import {
  ComposedChart, AreaChart, BarChart, Bar, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from "recharts";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, GRID_PROPS, yAxisLabel,
} from "../../theme/chartStyles";
import ChartCard from "../../components/ChartCard";
import CustomTooltip from "../../components/CustomTooltip";
import MetricCard from "../../components/MetricCard";
import AnalysisBox from "../../components/AnalysisBox";
import { useJsonDataset } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

// ── Electricity demand trend + NESO projections (TWh) ───────────
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
  { year: 2025, fes24EE: 295, fes24CF: 290, fes19: 340, fes21: 320 },
  { year: 2027, fes24EE: 310, fes24CF: 295 },
  { year: 2028, fes19: 370, fes21: 345 },
  { year: 2030, fes24EE: 355, fes24CF: 315, fes19: 395, fes21: 370 },
  { year: 2033, fes24EE: 400, fes24CF: 330 },
  { year: 2035, fes24EE: 435, fes24CF: 340, fes19: 450, fes21: 425 },
];

// ── NESO FES 2024 capacity projections (GW) ─────────────────────
const CAPACITY = [
  { source: "Wind (offshore)",  y2025: 15.5,  y2030: 45,   y2035: 75   },
  { source: "Wind (onshore)",   y2025: 15.2,  y2030: 27,   y2035: 36   },
  { source: "Solar",            y2025: 17,    y2030: 45,   y2035: 62   },
  { source: "Nuclear",          y2025: 5.88,  y2030: 3.7,  y2035: 5.2  },
  { source: "Gas CCGT",         y2025: 33,    y2030: 35,   y2035: 22   },
  { source: "Gas OCGT",         y2025: 2.4,   y2030: 2.5,  y2035: 2.5  },
  { source: "Biomass",          y2025: 4.8,   y2030: 4.0,  y2035: 3.5  },
  { source: "Hydro",            y2025: 1.47,  y2030: 1.5,  y2035: 1.5  },
  { source: "Interconnectors",  y2025: 10.8,  y2030: 13,   y2035: 20   },
  { source: "Oil peakers",      y2025: 0.5,   y2030: 0.5,  y2035: 0.5  },
  { source: "Storage power",    y2025: 7.5,   y2030: 27,   y2035: 35   },
  { source: "Storage energy",   y2025: 30,    y2030: 70,   y2035: 100, unit: "GWh" },
];

// ── Peak demand components (GW) ─────────────────────────────────
const DEMAND_COMPONENTS = [
  { component: "Baseload",              y2025: 42,  y2030: 44,  y2035: 46,  neso: "~45\u201348", note: "Aligned" },
  { component: "Heat pumps (peak)",     y2025: 2,   y2030: 5,   y2035: 10,  neso: "~8\u201312",  note: "With diversity factors" },
  { component: "EVs (peak)",            y2025: 2,   y2030: 4,   y2035: 7,   neso: "~5\u20138",   note: "With smart charging" },
  { component: "BTM solar (reduction)", y2025: 5,   y2030: 10,  y2035: 15,  neso: "~12\u201318", note: "Aligned" },
  { component: "Demand-side response",  y2025: null, y2030: null, y2035: null, neso: "~8\u201315 GW reduction", note: "Not in model" },
];

// ── NESO projected DSR (GW at peak) ─────────────────────────────
// Full NESO DSR projection including smart EV charging
const DSR_PROJECTION = [
  { year: 2025, smartEV: 0.5,  heatPump: 0.3, industrial: 1.0, btmBattery: 0.2 },
  { year: 2026, smartEV: 1.0,  heatPump: 0.5, industrial: 1.1, btmBattery: 0.4 },
  { year: 2027, smartEV: 1.5,  heatPump: 0.8, industrial: 1.2, btmBattery: 0.6 },
  { year: 2028, smartEV: 2.2,  heatPump: 1.2, industrial: 1.3, btmBattery: 1.0 },
  { year: 2029, smartEV: 3.0,  heatPump: 1.6, industrial: 1.5, btmBattery: 1.3 },
  { year: 2030, smartEV: 3.8,  heatPump: 2.2, industrial: 1.7, btmBattery: 1.8 },
  { year: 2031, smartEV: 4.5,  heatPump: 2.8, industrial: 1.8, btmBattery: 2.2 },
  { year: 2032, smartEV: 5.0,  heatPump: 3.3, industrial: 1.9, btmBattery: 2.5 },
  { year: 2033, smartEV: 5.5,  heatPump: 3.8, industrial: 2.0, btmBattery: 2.8 },
  { year: 2034, smartEV: 6.0,  heatPump: 4.2, industrial: 2.1, btmBattery: 3.0 },
  { year: 2035, smartEV: 6.5,  heatPump: 4.8, industrial: 2.2, btmBattery: 3.2 },
];

const DSR_COMPONENTS = [
  { key: "smartEV",     label: "Smart EV charging",       color: P.teal },
  { key: "heatPump",    label: "Heat pump flexibility",   color: P.sienna },
  { key: "industrial",  label: "Industrial & commercial", color: P.navy },
  { key: "btmBattery",  label: "Behind-meter batteries",  color: "#9B6ED0" },
];

const ELEC_FUELS = [
  { key: "convThermal", label: "Coal & Other Thermal", color: "#4A4A4A" },
  { key: "ccgt", label: "Gas (CCGT)", color: P.yellow },
  { key: "nuclear", label: "Nuclear", color: P.navy },
  { key: "renewables", label: "Renewables", color: P.teal },
];

// ── Electricity prices ───────────────────────────────────────────
// Domestic: DESNZ QEP Table 2.2.4, average variable unit rate, all payment types
// Industrial: DESNZ QEP Table 3.4.1, medium non-domestic consumer, excluding CCL
const PRICE_ANNUAL = [
  { year: 2004, domestic: 7.0 }, { year: 2005, domestic: 7.5 }, { year: 2006, domestic: 8.7 },
  { year: 2007, domestic: 9.9 }, { year: 2008, domestic: 11.0 }, { year: 2009, domestic: 11.8 },
  { year: 2010, domestic: 11.8, industrial: 7.2 }, { year: 2011, domestic: 12.5, industrial: 7.6 },
  { year: 2012, domestic: 13.7, industrial: 8.3 }, { year: 2013, domestic: 14.4, industrial: 8.9 },
  { year: 2014, domestic: 15.3, industrial: 9.4 }, { year: 2015, domestic: 15.1, industrial: 9.8 },
  { year: 2016, domestic: 14.3, industrial: 9.6 }, { year: 2017, domestic: 14.4, industrial: 10.1 },
  { year: 2018, domestic: 15.2, industrial: 11.1 }, { year: 2019, domestic: 16.1, industrial: 11.9 },
  { year: 2020, domestic: 17.2, industrial: 12.6 }, { year: 2021, domestic: 18.9, industrial: 13.6 },
  { year: 2022, domestic: 29.3, industrial: 19.5 }, { year: 2023, domestic: 30.2, industrial: 28.5 },
  { year: 2024, domestic: 25.5, industrial: 28.2 }, { year: 2025, domestic: 24.5, industrial: 25.4 },
];

// Ofgem default tariff cap — electricity unit rate, p/kWh, direct debit
// Semi-annual before Q4 2022, quarterly after. EPG applied Q4 2022-Q2 2023.
const PRICE_QUARTERLY = [
  { q: "2019-Q1", domestic: 15.1 }, { q: "2019-Q2", domestic: 14.4 },
  { q: "2019-Q3", domestic: 14.4 }, { q: "2019-Q4", domestic: 15.1 },
  { q: "2020-Q1", domestic: 15.1 }, { q: "2020-Q2", domestic: 16.3 },
  { q: "2020-Q3", domestic: 16.3 }, { q: "2020-Q4", domestic: 17.2 },
  { q: "2021-Q1", domestic: 17.2 }, { q: "2021-Q2", domestic: 18.9 },
  { q: "2021-Q3", domestic: 18.9 }, { q: "2021-Q4", domestic: 20.8 },
  { q: "2022-Q1", domestic: 20.8 }, { q: "2022-Q2", domestic: 28.3 },
  { q: "2022-Q3", domestic: 34.0 }, { q: "2022-Q4", domestic: 34.0 },
  { q: "2023-Q1", domestic: 33.2 }, { q: "2023-Q2", domestic: 30.1 },
  { q: "2023-Q3", domestic: 30.1 }, { q: "2023-Q4", domestic: 27.4 },
  { q: "2024-Q1", domestic: 28.6 }, { q: "2024-Q2", domestic: 24.5 },
  { q: "2024-Q3", domestic: 24.5 }, { q: "2024-Q4", domestic: 24.5 },
  { q: "2025-Q1", domestic: 24.5 }, { q: "2025-Q2", domestic: 24.7 },
];

// ── Ofgem cap component breakdown (£/year per customer, exc. VAT) ─
// Source: Ofgem Annex 9 — Levelised cap levels v1.8
// Wholesale = Wholesale (direct fuel) + Capacity Market
// Supplier = Operating + Smart Meter + EBIT + Headroom
// Semi-annual periods are repeated per quarter for consistent spacing
const COST_BREAKDOWN = [
  { q: "2019-Q2", wholesale: 259, network: 139, policy: 110, supplier: 115 },
  { q: "2019-Q3", wholesale: 259, network: 139, policy: 110, supplier: 115 },
  { q: "2019-Q4", wholesale: 236, network: 140, policy: 112, supplier: 115 },
  { q: "2020-Q1", wholesale: 236, network: 140, policy: 112, supplier: 115 },
  { q: "2020-Q2", wholesale: 231, network: 141, policy: 115, supplier: 118 },
  { q: "2020-Q3", wholesale: 231, network: 141, policy: 115, supplier: 118 },
  { q: "2020-Q4", wholesale: 205, network: 144, policy: 114, supplier: 118 },
  { q: "2021-Q1", wholesale: 205, network: 144, policy: 114, supplier: 118 },
  { q: "2021-Q2", wholesale: 235, network: 153, policy: 121, supplier: 120 },
  { q: "2021-Q3", wholesale: 235, network: 153, policy: 121, supplier: 120 },
  { q: "2021-Q4", wholesale: 293, network: 153, policy: 121, supplier: 123 },
  { q: "2022-Q1", wholesale: 293, network: 153, policy: 121, supplier: 123 },
  { q: "2022-Q2", wholesale: 524, network: 202, policy: 127, supplier: 133 },
  { q: "2022-Q3", wholesale: 524, network: 202, policy: 127, supplier: 133 },
  { q: "2022-Q4", wholesale: 1167, network: 207, policy: 126, supplier: 161 },
  { q: "2023-Q1", wholesale: 1609, network: 207, policy: 126, supplier: 177 },
  { q: "2023-Q2", wholesale: 1108, network: 226, policy: 140, supplier: 166 },
  { q: "2023-Q3", wholesale: 511, network: 232, policy: 140, supplier: 146 },
  { q: "2023-Q4", wholesale: 454, network: 233, policy: 141, supplier: 149 },
  { q: "2024-Q1", wholesale: 491, network: 233, policy: 141, supplier: 150 },
  { q: "2024-Q2", wholesale: 377, network: 217, policy: 162, supplier: 149 },
  { q: "2024-Q3", wholesale: 322, network: 211, policy: 162, supplier: 147 },
  { q: "2024-Q4", wholesale: 367, network: 225, policy: 161, supplier: 155 },
  { q: "2025-Q1", wholesale: 377, network: 225, policy: 161, supplier: 155 },
  { q: "2025-Q2", wholesale: 415, network: 213, policy: 169, supplier: 160 },
];

const COST_COMPONENTS = [
  { key: "wholesale", label: "Wholesale energy (marginal)", color: P.yellow },
  { key: "network", label: "Network (fixed infrastructure)", color: P.navy },
  { key: "policy", label: "Policy levies (RO, CfD, ECO)", color: "#9B6ED0" },
  { key: "supplier", label: "Supplier costs + margin", color: P.textLight },
];

// ── International comparison (2024, inc. taxes, p/kWh) ──────────
// DESNZ QEP Tables 5.3.1 (industrial) and 5.5.1 (domestic), derived from IEA
const INTL_PRICES = [
  { country: "Germany", domestic: 33.5, industrial: 21.0 },
  { country: "UK", domestic: 30.5, industrial: 26.6 },
  { country: "Italy", domestic: 30.3, industrial: 23.5 },
  { country: "Ireland", domestic: 29.3, industrial: 24.8 },
  { country: "France", domestic: 23.7, industrial: 16.3 },
  { country: "Spain", domestic: 22.5, industrial: 13.3 },
  { country: "Sweden", domestic: 17.1, industrial: 8.8 },
  { country: "Japan", domestic: 16.5, industrial: 13.2 },
  { country: "USA", domestic: 12.9, industrial: 7.4 },
  { country: "Canada", domestic: 10.3, industrial: 7.4 },
];

const DESNZ_INTL_SOURCE = (
  <>SOURCE: <a href="https://www.gov.uk/government/statistical-data-sets/international-industrial-energy-prices" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DESNZ International Energy Prices</a> (derived from IEA Energy Prices and Taxes, 2024)</>
);

const DESNZ_QEP_SOURCE = (
  <>SOURCE: <a href="https://www.gov.uk/government/collections/quarterly-energy-prices" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DESNZ Quarterly Energy Prices</a>; <a href="https://www.ofgem.gov.uk/check-if-energy-price-cap-affects-you" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>Ofgem Price Cap</a></>
);

const OFGEM_ANNEX_SOURCE = (
  <>SOURCE: <a href="https://www.ofgem.gov.uk/energy-policy-and-regulation/policy-and-regulatory-programmes/energy-price-cap/energy-price-cap-default-tariff-levels" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>Ofgem Annex 9 (Levelised cap levels v1.8)</a></>
);

const NESO_SOURCE = (
  <>SOURCE: <a href="https://www.nationalgrideso.com/future-energy/future-energy-scenarios" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>NESO Future Energy Scenarios 2024</a></>
);

const DESNZ_NESO_SOURCE = (
  <>SOURCE: <a href="https://www.gov.uk/government/statistics/electricity-section-5-energy-trends" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DESNZ Energy Trends</a>; <a href="https://www.nationalgrideso.com/future-energy/future-energy-scenarios" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>NESO FES 2024</a></>
);

const tableCell = { padding: "4px 8px", fontWeight: 500, textAlign: "right" };
const tableCellLeft = { padding: "4px 8px 4px 0", color: P.textMuted };
const tableHead = { ...tableCell, color: P.textMuted, fontWeight: 500 };
const tableRow = (border) => ({ borderBottom: `1px solid ${border}` });
const tableBox = (border, bgCard) => ({
  fontSize: "12px",
  fontFamily: "'DM Mono', monospace",
  color: P.text,
  background: bgCard,
  border: `1px solid ${border}`,
  borderRadius: 6,
  padding: 16,
  overflowX: "auto",
});

export default function Electricity() {
  const isMobile = useIsMobile();
  const [priceView, setPriceView] = useState("annual");
  const [costView, setCostView] = useState("absolute");
  const { data: energyData } = useJsonDataset("energy.json");

  const costPctData = useMemo(() => {
    return COST_BREAKDOWN.map((row) => {
      const total = row.wholesale + row.network + row.policy + row.supplier;
      return {
        q: row.q,
        wholesale: Math.round((row.wholesale / total) * 1000) / 10,
        network: Math.round((row.network / total) * 1000) / 10,
        policy: Math.round((row.policy / total) * 1000) / 10,
        supplier: Math.round((row.supplier / total) * 1000) / 10,
      };
    });
  }, []);

  const elecPctData = useMemo(() => {
    if (!energyData?.electricity) return [];
    return energyData.electricity.map((row) => {
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
  }, [energyData]);

  const latestElec = energyData?.electricity?.[energyData.electricity.length - 1];
  const renewElecPct = latestElec?.totalNet > 0
    ? ((latestElec.renewables / latestElec.totalNet) * 100).toFixed(1)
    : null;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(26px, 4vw, 36px)",
        fontWeight: 600,
        color: P.text,
        margin: "0 0 6px",
      }}>
        Electricity
      </h2>
      <p style={{ ...SECTION_NOTE, margin: "0 0 24px", maxWidth: 720 }}>
        UK electricity demand has fallen by nearly 30% since its 2005 peak, driven by
        efficiency gains in lighting, appliances and insulation. All NESO scenarios now
        project significant demand growth as electrification of heating and transport
        adds substantial new load. This page presents NESO Future Energy Scenarios
        capacity projections and the demand-side response assumptions underpinning them.
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
          source={DESNZ_NESO_SOURCE}
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

      {/* ── Electricity Generation by Fuel ────────────────────── */}
      {latestElec && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Electricity Generation by Fuel</h3>
          <p style={SECTION_NOTE}>
            Electricity is a subset of primary energy, roughly a quarter of total consumption.
            The electricity mix looks different from the primary energy mix because transport
            and industrial fuel use play no direct role in generation. Decarbonisation of the
            grid has moved faster than decarbonisation of the economy as a whole.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <MetricCard label="Renewables Share" value={`${renewElecPct}%`} change={`of electricity generated (${latestElec.year})`} up={false} color={P.teal} delay={0.1} />
            <MetricCard label="Gas (CCGT)" value={`${latestElec.totalNet > 0 ? ((latestElec.ccgt / latestElec.totalNet) * 100).toFixed(1) : "--"}%`} change="of electricity generated" up={true} color={P.yellow} delay={0.18} />
            <MetricCard label="Nuclear" value={`${latestElec.totalNet > 0 ? ((latestElec.nuclear / latestElec.totalNet) * 100).toFixed(1) : "--"}%`} change="of electricity generated" up={false} color={P.navy} delay={0.26} />
            <MetricCard label="Total Generation" value={`${Math.round(latestElec.totalNet / 1000)} TWh`} change={`net, all generators (${latestElec.year})`} up={false} color={P.grey} delay={0.34} />
          </div>

          <ChartCard
            title="Electricity Generation by Fuel"
            subtitle={`% share, 1990–${latestElec.year}`}
            source={<>SOURCE: <a href="https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DESNZ Digest of UK Energy Statistics (DUKES)</a></>}
            legend={ELEC_FUELS}
            height={340}
          >
            <AreaChart data={elecPctData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" label={yAxisLabel("Share of generation (%)")} />
              <Tooltip content={<CustomTooltip />} />
              {ELEC_FUELS.map((fuel) => (
                <Area key={fuel.key} type="monotone" dataKey={fuel.key} name={fuel.label} stackId="1" stroke={fuel.color} fill={fuel.color} fillOpacity={0.8} />
              ))}
            </AreaChart>
          </ChartCard>
        </section>
      )}

      {/* ── Electricity Prices ─────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Electricity Prices</h3>
        <p style={SECTION_NOTE}>
          Domestic prices from DESNZ Quarterly Energy Prices, industrial from DESNZ
          Table 3.4.1 (medium consumers, excluding Climate Change Levy). Domestic consumers
          are protected by the Ofgem price cap (from January 2019) and were further shielded
          by the Energy Price Guarantee (October 2022 to June 2023). Industrial consumers
          have no price cap, which is why industrial prices exceeded domestic in 2023-2024:
          businesses were fully exposed to wholesale market rates while households were not.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="Domestic" value="24.5p" change="per kWh, Q1 2025 Ofgem cap" up={false} color={P.sienna} delay={0.1} />
          <MetricCard label="Industrial" value="25.4p" change="per kWh, medium consumer, 2025 avg" up={false} color={P.navy} delay={0.18} />
          <MetricCard label="Annual Bill" value="\u00A31,063" change="average domestic electricity, 2025" up={false} color={P.grey} delay={0.26} />
        </div>

        <ChartCard
          title="Electricity Unit Rate"
          subtitle={priceView === "annual" ? "p/kWh, annual average, 2004\u20132025 (industrial from 2010)" : "p/kWh, quarterly Ofgem cap rate, 2019\u20132025"}
          source={DESNZ_QEP_SOURCE}
          legend={priceView === "annual" ? [
            { key: "domestic", label: "Domestic (inc. 5% VAT)", color: P.sienna },
            { key: "industrial", label: "Industrial (exc. CCL)", color: P.navy },
          ] : [
            { key: "domestic", label: "Domestic (Ofgem cap rate)", color: P.sienna },
          ]}
          views={["annual", "quarterly"]}
          viewLabels={["Annual", "Quarterly"]}
          activeView={priceView}
          onViewChange={setPriceView}
          height={340}
        >
          {priceView === "annual" ? (
            <ComposedChart data={PRICE_ANNUAL} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={[2004, 2025]} tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={(v) => String(v)} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} domain={[0, 35]} label={yAxisLabel("p/kWh")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)}p/kWh`} />} />
              <Line type="monotone" dataKey="domestic" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} name="Domestic" />
              <Line type="monotone" dataKey="industrial" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} name="Industrial" connectNulls={false} />
            </ComposedChart>
          ) : (
            <ComposedChart data={PRICE_QUARTERLY} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="q" tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={(v) => v.slice(0, 4)} interval={isMobile ? 7 : 3} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} domain={[0, 40]} label={yAxisLabel("p/kWh")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)}p/kWh`} />} />
              <Line type="monotone" dataKey="domestic" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 2.5, fill: P.sienna }} name="Domestic (cap rate)" />
            </ComposedChart>
          )}
        </ChartCard>
      </section>

      {/* ── Cost Breakdown ────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>What Drives the Price</h3>
        <p style={SECTION_NOTE}>
          Ofgem price cap component breakdown for domestic electricity. Wholesale energy
          is the marginal cost, set by the most expensive generator running (usually gas
          CCGT). Even when renewables generate over half of output, the wholesale price is
          set at the gas clearing price under current GB market design. Network costs cover
          transmission and distribution infrastructure, and have risen as the grid is
          upgraded for offshore wind and distributed generation. Policy levies (Renewables
          Obligation, Contracts for Difference, Energy Company Obligation, Warm Home
          Discount) fall almost entirely on electricity bills, not gas, which makes
          electricity relatively more expensive and discourages electrification of heating.
          Figures exclude 5% VAT.
        </p>

        <ChartCard
          title="Domestic Electricity Cost Components"
          subtitle={costView === "absolute" ? "\u00A3 per customer per year (exc. VAT), Ofgem cap periods, 2019\u20132025" : "% share of total cost (exc. VAT), Ofgem cap periods, 2019\u20132025"}
          source={OFGEM_ANNEX_SOURCE}
          legend={COST_COMPONENTS}
          views={["absolute", "share"]}
          viewLabels={["\u00A3/year", "% Share"]}
          activeView={costView}
          onViewChange={setCostView}
          height={360}
        >
          {costView === "absolute" ? (
            <AreaChart data={COST_BREAKDOWN} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="q" tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={(v) => v.slice(0, 4)} interval={isMobile ? 7 : 3} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} domain={[0, 2200]} label={yAxisLabel("\u00A3/year")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `\u00A3${v}`} />} />
              {COST_COMPONENTS.map((c) => (
                <Area key={c.key} type="monotone" dataKey={c.key} stackId="cost" fill={c.color} fillOpacity={0.7} stroke={c.color} strokeWidth={1} name={c.label} />
              ))}
            </AreaChart>
          ) : (
            <AreaChart data={costPctData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="q" tick={AXIS_TICK_MONO} tickLine={false} tickFormatter={(v) => v.slice(0, 4)} interval={isMobile ? 7 : 3} />
              <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" label={yAxisLabel("Share (%)")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
              {COST_COMPONENTS.map((c) => (
                <Area key={c.key} type="monotone" dataKey={c.key} stackId="cost" fill={c.color} fillOpacity={0.7} stroke={c.color} strokeWidth={1} name={c.label} />
              ))}
            </AreaChart>
          )}
        </ChartCard>
      </section>

      {/* ── International Comparison ─────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>International Comparison</h3>
        <p style={SECTION_NOTE}>
          Electricity prices across IEA member states, including all non-refundable taxes,
          converted to pence per kWh at annual average exchange rates. The UK has the second
          highest domestic electricity price in the IEA after Germany, and the highest
          industrial price among major economies. The gap between domestic and industrial
          prices in the UK is unusually narrow: UK industrial consumers pay 87% of the
          domestic rate, compared to 63% in Germany and 69% in France.
        </p>

        <ChartCard
          title="Electricity Prices by Country"
          subtitle="p/kWh, including taxes, 2024"
          source={DESNZ_INTL_SOURCE}
          legend={[
            { key: "domestic", label: "Domestic (household)", color: P.sienna },
            { key: "industrial", label: "Industrial (medium)", color: P.navy },
          ]}
          height={360}
        >
          <BarChart data={INTL_PRICES} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="country" tick={AXIS_TICK_MONO} tickLine={false} interval={0} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 60 : 30} />
            <YAxis tick={AXIS_TICK_MONO} tickLine={false} axisLine={false} domain={[0, 40]} label={yAxisLabel("p/kWh")} />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v.toFixed(1)}p/kWh`} />} />
            <Bar dataKey="domestic" name="Domestic" fill={P.sienna} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {INTL_PRICES.map((d, i) => (
                <Cell key={i} fillOpacity={d.country === "UK" ? 1 : 0.5} />
              ))}
            </Bar>
            <Bar dataKey="industrial" name="Industrial" fill={P.navy} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {INTL_PRICES.map((d, i) => (
                <Cell key={i} fillOpacity={d.country === "UK" ? 1 : 0.5} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </section>

      {/* ── Capacity Projections ──────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>NESO Capacity Projections</h3>
        <p style={SECTION_NOTE}>
          Installed generation and storage capacity from NESO FES 2024 and Clean Power
          2030 (CP30) milestones. Offshore wind and solar capacity are projected to
          roughly triple by 2030. Gas CCGT capacity is retained through 2030 as reserve,
          with partial retirement by 2035 as renewables and storage scale.
        </p>
        <div style={tableBox(P.border, P.bgCard)}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${P.border}` }}>
                <th style={{ ...tableHead, textAlign: "left", padding: "4px 8px 4px 0" }}>Source</th>
                <th style={tableHead}>2025</th>
                <th style={tableHead}>2030</th>
                <th style={tableHead}>2035</th>
              </tr>
            </thead>
            <tbody>
              {CAPACITY.map((row) => (
                <tr key={row.source} style={tableRow(P.border)}>
                  <td style={tableCellLeft}>{row.source}</td>
                  <td style={tableCell}>{row.y2025} {row.unit || "GW"}</td>
                  <td style={tableCell}>{row.y2030} {row.unit || "GW"}</td>
                  <td style={tableCell}>{row.y2035} {row.unit || "GW"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Interconnectors ─────────────────────────────────────── */}
      {energyData?.energySecurity && (() => {
        const sec = energyData.energySecurity;
        const snap = sec.snapshot;
        return (
          <div style={{ marginBottom: 48 }}>
            <div style={tableBox(P.border, P.bgCard)}>
              <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
                Electricity interconnectors &middot; {snap.totalInterconnectorMw.toLocaleString()} MW total
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginTop: 12 }}>
                {sec.interconnectors.map((ic) => (
                  <div key={ic.name} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 10px", borderRadius: 3, background: "rgba(28,43,69,0.03)",
                    fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
                    <span style={{ color: P.text, fontWeight: 500 }}>
                      {ic.name} <span style={{ color: P.textLight, fontWeight: 400 }}>&rarr; {ic.partner}</span>
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

      {/* ── Demand Components ─────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Peak Demand Components</h3>
        <p style={SECTION_NOTE}>
          Winter peak electricity demand broken down by component, compared with
          approximate NESO FES 2024 (Electric Engagement) equivalents. Heat pump and
          EV figures reflect NESO diversity factors and smart charging assumptions.
          NESO also assumes significant demand-side response (DSR) which further reduces
          net peak demand.
        </p>
        <div style={tableBox(P.border, P.bgCard)}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${P.border}` }}>
                <th style={{ ...tableHead, textAlign: "left", padding: "4px 8px 4px 0" }}>Component</th>
                <th style={tableHead}>2025</th>
                <th style={tableHead}>2030</th>
                <th style={tableHead}>2035</th>
                <th style={tableHead}>NESO 2035</th>
                <th style={{ ...tableHead, textAlign: "left", padding: "4px 0 4px 8px" }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {DEMAND_COMPONENTS.map((row) => (
                <tr key={row.component} style={tableRow(P.border)}>
                  <td style={tableCellLeft}>{row.component}</td>
                  <td style={tableCell}>{row.y2025 != null ? `${row.y2025} GW` : "\u2014"}</td>
                  <td style={tableCell}>{row.y2030 != null ? `${row.y2030} GW` : "\u2014"}</td>
                  <td style={tableCell}>{row.y2035 != null ? `${row.y2035} GW` : "\u2014"}</td>
                  <td style={tableCell}>{row.neso}</td>
                  <td style={{ padding: "4px 0 4px 8px", color: P.textMuted, fontSize: "11px" }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── DSR Projection ────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>NESO Projected Demand-Side Response</h3>
        <p style={SECTION_NOTE}>
          Demand-side response (DSR) refers to the deliberate shifting or reduction of
          electricity consumption during peak periods. Rather than building additional
          generation capacity, DSR reduces the demand that supply must meet. NESO FES
          2024 projects DSR growing from approximately 2 GW today to 12-17 GW by 2035,
          drawn from four main sources: smart EV charging (vehicles charge overnight
          rather than at the evening peak), heat pump flexibility (pre-heating homes
          during off-peak hours using thermal inertia), industrial and commercial load
          shifting, and behind-the-meter batteries discharging during peak periods.
          Delivering DSR at this scale requires widespread smart meter rollout,
          time-of-use tariff adoption, vehicle-to-grid infrastructure, and sustained
          consumer behaviour change.
        </p>

        <ChartCard
          title="Projected Demand-Side Response"
          subtitle="GW peak demand reduction, NESO FES 2024 (Electric Engagement, approx.)"
          source={NESO_SOURCE}
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
              domain={[0, 20]}
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
      <AnalysisBox color={P.teal}>
        UK electricity demand fell from 377 TWh in 2005 to 269 TWh in 2024, a decline
        of nearly 30%. NESO FES 2024 projects this trend reversing as heat pumps, electric
        vehicles and data centres add substantial new load. In the Electric Engagement
        scenario, demand reaches 435 TWh by 2035. To meet this, installed renewable
        capacity roughly triples (offshore wind from 15.5 to 75 GW, solar from 17 to
        62 GW) while gas CCGT is partially retired from 33 to 22 GW. NESO assumes
        demand-side response of 12-17 GW by 2035 to manage peak demand, relying on smart
        EV charging, heat pump flexibility, industrial load shifting, and behind-meter
        batteries. The scale of this DSR assumption is broadly equal to the gap between
        projected gross peak demand and available supply capacity.
      </AnalysisBox>
    </div>
  );
}
