import { useJsonDataset } from "../hooks/useDataset";
import Tile from "../components/Tile";
import {
  valueAt,
  computeDeltas,
  sparkline as toSparkline,
  sparklineRange,
  longSeries as toLongSeries,
  formatPeriod,
  enrichWithYoY,
} from "./metricHelpers";

/**
 * Wrapper around <Tile /> that loads a v1 dataset, extracts the configured
 * series, and renders the tile with computed sparkline / longSeries / delta.
 *
 * `period` controls which delta window the tile shows: "mom" / "q" / "y".
 * If the dataset is loading or the series is missing, renders a Tile with
 * a neutral placeholder.
 */
export default function MetricTile({ metric, period = "mom" }) {
  const { data, loading, error } = useJsonDataset(metric.dataset);

  if (loading || error || !data) {
    return (
      <Tile
        title={metric.title}
        unit={metric.unit}
        source={error ? "Data error" : "Loading…"}
      />
    );
  }

  let series = data[metric.seriesKey];
  if (!Array.isArray(series) || series.length === 0) {
    return (
      <Tile
        title={metric.title}
        unit={metric.unit}
        source="No data"
      />
    );
  }

  // Optional pre-processing: yoy enrichment (e.g. for inflation rate from index)
  if (metric.enrich?.type === "yoy") {
    series = enrichWithYoY(series, metric.enrich.baseValueKey, metric.cadence);
  }

  const value = valueAt(series, metric.valueKey, 0);
  const deltas = computeDeltas(series, metric.valueKey, metric.cadence, metric.deltaPctMode !== false);
  const spark = toSparkline(series, metric.valueKey, 24);
  const range = sparklineRange(series, metric.timeKey, 24, formatPeriod);
  const long = toLongSeries(series, metric.valueKey, metric.timeKey, metric.cadence, 10);

  const activeDelta = deltas[period] ?? deltas.mom;
  const periodLabel =
    metric.periodLabel?.[period] ?? metric.periodLabel?.mom ?? "vs prior period";

  return (
    <Tile
      title={metric.title}
      value={value}
      unit={metric.unit}
      format={metric.format}
      delta={{ percent: activeDelta.percent, period: periodLabel }}
      direction={metric.direction}
      sparkline={spark}
      sparklineRange={range}
      source={metric.source}
      asOf={range?.end}
      longSeries={long.values}
      longSeriesStartYear={long.startYear}
      href={metric.href}
    />
  );
}

/**
 * Compute the Overview MiniTile-shaped object for a metric (no React).
 * Returns { title, direction, deltas: { mom, q, y } } or null if data not ready.
 *
 * For the Overview, the parent component calls this against pre-loaded data
 * for each metric to populate the MiniTile grid.
 */
export function metricToOverviewEntry(metric, data) {
  if (!data) return null;
  let series = data[metric.seriesKey];
  if (!Array.isArray(series) || series.length === 0) return null;
  if (metric.enrich?.type === "yoy") {
    series = enrichWithYoY(series, metric.enrich.baseValueKey, metric.cadence);
  }
  const deltas = computeDeltas(series, metric.valueKey, metric.cadence, metric.deltaPctMode !== false);
  return {
    title: metric.title,
    direction: metric.direction,
    deltas,
  };
}

/**
 * MiniTile that loads a metric's dataset and shows the active-period delta.
 *
 * Used by Overview where the period toggle (MoM / 3M / 1Y) is shared across
 * many metrics. Each MiniTile loads its own dataset; useJsonDataset's caching
 * means metrics that share a dataset don't refetch.
 */
import { MiniTile } from "../components/Tile";

export function OverviewMiniTile({ metric, period, href }) {
  const { data, loading } = useJsonDataset(metric.dataset);
  const entry = !loading ? metricToOverviewEntry(metric, data) : null;

  return (
    <MiniTile
      title={metric.title}
      delta={entry?.deltas?.[period]}
      direction={entry?.direction ?? metric.direction}
      href={href}
    />
  );
}
