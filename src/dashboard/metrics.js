/**
 * Dashboard metric registry.
 *
 * Each entry tells `<MetricTile />` how to load, transform, and render a
 * single metric. The catalogue in `data/dashboard-metrics.md` is the
 * editorial reference; this file is the runtime spec.
 *
 * Required fields per metric:
 *   id           unique kebab-case
 *   subtab       "service-delivery" | "sovereign-capability" | "construction" | "quality-of-life"
 *   title        tile heading
 *   dataset      filename in /public/data (e.g. "nhs-waiting.json")
 *   seriesKey    key into the unwrapped data object (e.g. "rtt")
 *   timeKey      field within each data row that is the time
 *   valueKey     field within each data row that is the headline value
 *   cadence      "monthly" | "quarterly" | "annual"
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

  "sd-asylum-backlog": {
    id: "sd-asylum-backlog",
    subtab: "service-delivery",
    title: "Asylum decisions backlog",
    dataset: "asylum-statistics.json",
    seriesKey: "asylumBacklogQuarterly",
    timeKey: "quarter",
    valueKey: "pending",
    cadence: "quarterly",
    direction: "up-bad",
    unit: "cases",
    format: "number",
    source: "Home Office, Immigration Statistics",
    href: "/data/state/immigration",
    periodLabel: {
      mom: "vs prior quarter",
      q: "vs prior quarter",
      y: "vs prior year",
    },
  },

  // ── Building ──────────────────────────────────────────────────────

  "bd-housing-completions": {
    id: "bd-housing-completions",
    subtab: "construction",
    title: "Housing completions (England)",
    dataset: "housing-supply.json",
    seriesKey: "netAdditions",
    timeKey: "year",
    valueKey: "dwellings",
    cadence: "annual",
    direction: "up-good",
    unit: "net additions / year",
    format: "number",
    source: "DLUHC Live Table 120",
    href: "/data/foundations/housing/supply",
    periodLabel: {
      mom: "vs prior year",
      q: "vs prior year",
      y: "vs prior year",
    },
  },

  // ── Sovereign Capability ──────────────────────────────────────────

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

  // ── Quality of Life ───────────────────────────────────────────────

  "ql-real-wages-annual": {
    id: "ql-real-wages-annual",
    subtab: "quality-of-life",
    title: "Real median pay",
    dataset: "jobs.json",
    seriesKey: "realEarningsTrend",
    timeKey: "year",
    valueKey: "realMedian",
    cadence: "annual",
    direction: "up-good",
    unit: "£ (real, 2025 prices)",
    format: "currency",
    source: "ONS ASHE, deflated by CPI",
    href: "/data/growth/jobs/earnings",
    periodLabel: {
      mom: "vs prior year",
      q: "vs prior year",
      y: "vs prior year",
    },
  },

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

  // More metrics to be added as Phase 3b/3c fetches land.
};

/** Metrics filtered by sub-tab, in display order. */
export function metricsForSubtab(subtab) {
  return Object.values(METRICS).filter((m) => m.subtab === subtab);
}
