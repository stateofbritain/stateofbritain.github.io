import { useMemo } from "react";
import P from "../../theme/palette";
import {
  ComposedChart, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
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
  const { data: energyData } = useJsonDataset("energy.json");

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
