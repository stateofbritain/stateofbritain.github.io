/**
 * Dashboard metric registry.
 *
 * Each entry tells `<MetricTile />` how to load, transform, and render a
 * single metric. The catalogue in `data/dashboard-metrics.md` is the
 * editorial reference; this file is the runtime spec.
 *
 * Dashboard rule: only metrics with monthly (or faster) cadence belong
 * here. Anything quarterly, annual, or slower lives in the /data pages.
 *
 * Required fields per metric:
 *   id           unique kebab-case
 *   subtab       "service-delivery" | "sovereign-capability" | "construction" | "quality-of-life"
 *   title        tile heading
 *   dataset      filename in /public/data (e.g. "nhs-waiting.json")
 *   seriesKey    key into the unwrapped data object (e.g. "rtt")
 *   timeKey      field within each data row that is the time
 *   valueKey     field within each data row that is the headline value
 *   cadence      "monthly" or faster
 *   direction    "up-good" | "up-bad" | "neutral"
 *   unit         display suffix (e.g. "treatments")
 *   format       "number" | "percent" | "currency" | "raw"
 *   source       citation string
 *
 * Optional:
 *   href            click-through to existing /data page
 *   deltaPctMode    true (default) for percent deltas; false for absolute deltas
 *   periodLabel     map of period-key → label, e.g. { mom: "vs prior month" }
 *   transform       (value, row) => transformedValue (rare)
 */

export const METRICS = {
  // ── Service Delivery ──────────────────────────────────────────────

  "sd-nhs-rtt-waiting-list": {
    id: "sd-nhs-rtt-waiting-list",
    subtab: "service-delivery",
    title: "NHS RTT waiting list",
    dataset: "nhs-waiting.json",
    seriesKey: "rtt",
    timeKey: "period",
    valueKey: "totalWaiting",
    cadence: "monthly",
    direction: "up-bad",
    unit: "treatments",
    format: "number",
    source: "NHS England, RTT",
    href: "/data/foundations/healthcare/waiting",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "sd-gp-appointments": {
    id: "sd-gp-appointments",
    subtab: "service-delivery",
    title: "GP appointments per month",
    dataset: "gp-access.json",
    seriesKey: "appointments",
    timeKey: "month",
    valueKey: "total",
    cadence: "monthly",
    direction: "up-good",
    unit: "millions / month",
    format: "raw",
    source: "NHS Digital — Appointments in General Practice",
    href: "/data/foundations/healthcare/gp",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "sd-public-sector-debt": {
    id: "sd-public-sector-debt",
    subtab: "service-delivery",
    title: "Public sector net debt",
    dataset: "public-sector-debt.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-bad",
    unit: "% of GDP",
    format: "percent",
    source: "ONS PSND (HF6X)",
    href: "/data/spending/spending/borrowing",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  // ── Sovereign Capability ──────────────────────────────────────────

  "sc-mfg-output": {
    id: "sc-mfg-output",
    subtab: "sovereign-capability",
    title: "Manufacturing output",
    dataset: "mfg-output.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "index (2022=100)",
    format: "raw",
    source: "ONS Index of Production (K222)",
    href: "/data/growth/industrial",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "sc-tech-incorporations": {
    id: "sc-tech-incorporations",
    subtab: "sovereign-capability",
    title: "New tech-sector incorporations",
    dataset: "tech-incorporations.json",
    seriesKey: "monthly",
    timeKey: "month",
    valueKey: "count",
    cadence: "monthly",
    direction: "up-good",
    unit: "/ month",
    format: "number",
    source: "Companies House Advanced Search",
    href: "/data/growth/startups",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "sc-gas-import-concentration": {
    id: "sc-gas-import-concentration",
    subtab: "sovereign-capability",
    title: "Gas import concentration",
    dataset: "gas-imports.json",
    seriesKey: "monthly",
    timeKey: "month",
    valueKey: "hhi",
    cadence: "monthly",
    direction: "up-bad",
    unit: "HHI (×10000)",
    format: "number",
    source: "DESNZ Energy Trends — gas trade",
    href: "/data/foundations/energy",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "sc-iop-chemicals": {
    id: "sc-iop-chemicals",
    subtab: "sovereign-capability",
    title: "Chemicals manufacturing index",
    dataset: "iop-chemicals.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "index (2022=100)",
    format: "raw",
    source: "ONS Index of Production (K226)",
    href: "/data/growth/industrial",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "sc-co2-intensity": {
    id: "sc-co2-intensity",
    subtab: "sovereign-capability",
    title: "CO₂ intensity of generation",
    dataset: "co2-intensity.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "intensity",
    cadence: "monthly",
    direction: "up-bad",
    unit: "gCO₂/kWh",
    format: "raw",
    source: "NESO Carbon Intensity API",
    href: "/data/foundations/energy/electricity",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  // ── Construction ──────────────────────────────────────────────────

  "bd-heat-pumps-bus": {
    id: "bd-heat-pumps-bus",
    subtab: "construction",
    title: "Heat pump installations (BUS)",
    dataset: "heat-pumps-bus.json",
    seriesKey: "monthly",
    timeKey: "month",
    valueKey: "redemptions",
    cadence: "monthly",
    direction: "up-good",
    unit: "grants / month",
    format: "number",
    source: "DESNZ Boiler Upgrade Scheme",
    href: "/data/foundations/energy",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "bd-brick-deliveries": {
    id: "bd-brick-deliveries",
    subtab: "construction",
    title: "Brick deliveries (SA)",
    dataset: "housing-supply.json",
    seriesKey: "brickDeliveries",
    timeKey: "month",
    valueKey: "saDeliveries",
    cadence: "monthly",
    direction: "up-good",
    unit: "millions / month",
    format: "number",
    source: "DESNZ — Construction Building Materials, Table 9a",
    href: "/data/foundations/housing/supply",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "bd-iop-cement": {
    id: "bd-iop-cement",
    subtab: "construction",
    title: "Cement & concrete production",
    dataset: "iop-cement.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "index (2022=100)",
    format: "raw",
    source: "ONS Index of Production (K23F)",
    href: "/data/foundations/housing/supply",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "bd-iop-steel": {
    id: "bd-iop-steel",
    subtab: "construction",
    title: "Iron & steel production",
    dataset: "iop-steel.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "index (2022=100)",
    format: "raw",
    source: "ONS Index of Production (K23I)",
    href: "/data/growth/industrial",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "qol-construction-output": {
    id: "qol-construction-output",
    subtab: "construction",
    title: "Construction output",
    dataset: "construction-output.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "£m / month",
    format: "currency",
    source: "ONS Construction Output (KFAP)",
    href: "/data/foundations/housing/supply",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  // ── Quality of Life ───────────────────────────────────────────────

  "ql-real-wages-monthly": {
    id: "ql-real-wages-monthly",
    subtab: "quality-of-life",
    title: "Real wages YoY",
    dataset: "real-wages-monthly.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "realYoY",
    cadence: "monthly",
    direction: "up-good",
    unit: "% YoY",
    format: "percent",
    source: "ONS AWE / CPIH",
    href: "/data/growth/jobs/earnings",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-house-price": {
    id: "ql-house-price",
    subtab: "quality-of-life",
    title: "UK average house price",
    dataset: "house-price-index.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "avgPrice",
    cadence: "monthly",
    direction: "neutral",
    unit: "£",
    format: "currency",
    source: "HM Land Registry, UK HPI",
    href: "/data/foundations/housing/prices",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-cpih-inflation": {
    id: "ql-cpih-inflation",
    subtab: "quality-of-life",
    title: "CPIH inflation",
    dataset: "cpih.json",
    seriesKey: "series",
    timeKey: "time",
    valueKey: "yoy",
    enrich: { type: "yoy", baseValueKey: "CP00" },
    cadence: "monthly",
    direction: "neutral",
    unit: "% YoY",
    format: "percent",
    source: "ONS CPIH",
    href: "/data/spending/spending/moneySupply",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "qol-services-output": {
    id: "qol-services-output",
    subtab: "quality-of-life",
    title: "Services output",
    dataset: "services-output.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "index (2022=100)",
    format: "raw",
    source: "ONS Index of Services (S2KU)",
    href: "/data/spending/spending/gdp",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "ql-avg-hours": {
    id: "ql-avg-hours",
    subtab: "quality-of-life",
    title: "Average weekly hours",
    dataset: "avg-weekly-hours.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "neutral",
    unit: "hours / week",
    format: "raw",
    source: "ONS LFS (YBUS)",
    href: "/data/growth/jobs/overview",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "qol-monthly-gdp": {
    id: "qol-monthly-gdp",
    subtab: "quality-of-life",
    title: "GDP (monthly index)",
    dataset: "monthly-gdp.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "index (2022=100)",
    format: "raw",
    source: "ONS Monthly GDP (ECY2)",
    href: "/data/spending/spending/gdp",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-unemployment-rate": {
    id: "ql-unemployment-rate",
    subtab: "quality-of-life",
    title: "Unemployment rate",
    dataset: "unemployment-rate.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-bad",
    unit: "%",
    format: "percent",
    source: "ONS LFS (MGSX)",
    href: "/data/growth/jobs/unemployment",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-gilt-yield-10y": {
    id: "ql-gilt-yield-10y",
    subtab: "quality-of-life",
    title: "10-year gilt yield",
    dataset: "borrowing.json",
    seriesKey: "giltYields",
    timeKey: "month",
    valueKey: "y10",
    cadence: "monthly",
    direction: "up-bad",
    unit: "% (10-year nominal)",
    format: "percent",
    source: "Bank of England, gilt yield curve",
    href: "/data/spending/spending/borrowing",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-gbp-usd": {
    id: "ql-gbp-usd",
    subtab: "quality-of-life",
    title: "GBP / USD exchange rate",
    dataset: "exchange-rates.json",
    seriesKey: "monthly",
    timeKey: "month",
    valueKey: "gbpUsd",
    cadence: "monthly",
    direction: "up-good",
    unit: "$ / £",
    format: "raw",
    source: "Bank of England",
    href: "/data/spending/personalFinance",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "ql-mortgage-rate": {
    id: "ql-mortgage-rate",
    subtab: "quality-of-life",
    title: "Average mortgage rate",
    dataset: "money-supply.json",
    seriesKey: "mortgageRate",
    timeKey: "month",
    valueKey: "rate",
    cadence: "monthly",
    direction: "up-bad",
    unit: "% (effective rate)",
    format: "percent",
    source: "Bank of England (CFM)",
    href: "/data/spending/personalFinance",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "ql-mortgage-approvals": {
    id: "ql-mortgage-approvals",
    subtab: "quality-of-life",
    title: "Mortgage approvals (house purchase)",
    dataset: "money-supply.json",
    seriesKey: "mortgageApprovals",
    timeKey: "month",
    valueKey: "approvals",
    cadence: "monthly",
    direction: "up-good",
    unit: "/ month",
    format: "number",
    source: "Bank of England Bankstats",
    href: "/data/spending/personalFinance",
    periodLabel: { mom: "vs prior month", q: "vs 3 months ago", y: "vs prior year" },
  },

  "ql-employment-rate": {
    id: "ql-employment-rate",
    subtab: "quality-of-life",
    title: "Employment rate (16-64)",
    dataset: "employment-rate.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "%",
    format: "percent",
    source: "ONS LFS (LF24)",
    href: "/data/growth/jobs/overview",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-cpi-inflation": {
    id: "ql-cpi-inflation",
    subtab: "quality-of-life",
    title: "CPI inflation (BoE target metric)",
    dataset: "cpi-inflation.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "neutral",
    unit: "% YoY",
    format: "percent",
    source: "ONS CPI (D7G7)",
    href: "/data/spending/spending/moneySupply",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-economic-inactivity": {
    id: "ql-economic-inactivity",
    subtab: "quality-of-life",
    title: "Economic inactivity (16-64)",
    dataset: "economic-inactivity.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-bad",
    unit: "%",
    format: "percent",
    source: "ONS LFS (LF2S)",
    href: "/data/growth/jobs/overview",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },

  "ql-retail-sales": {
    id: "ql-retail-sales",
    subtab: "quality-of-life",
    title: "Retail sales volume",
    dataset: "retail-sales.json",
    seriesKey: "monthly",
    timeKey: "period",
    valueKey: "value",
    cadence: "monthly",
    direction: "up-good",
    unit: "index (2022=100)",
    format: "raw",
    source: "ONS Retail Sales Index (J5EL)",
    href: "/data/growth/jobs/overview",
    periodLabel: {
      mom: "vs prior month",
      q: "vs 3 months ago",
      y: "vs prior year",
    },
  },
};

/** Metrics filtered by sub-tab, in display order. */
export function metricsForSubtab(subtab) {
  return Object.values(METRICS).filter((m) => m.subtab === subtab);
}
