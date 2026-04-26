/**
 * Helpers for turning a raw v1-dataset series into the props a Tile needs:
 * latest value, sparkline, sparklineRange labels, longSeries, and
 * MoM/3M/1Y deltas.
 *
 * Operates on plain arrays of objects with a known time-key + value-key.
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Latest value at offset (0=latest, 1=prior, …). null if out of range. */
export function valueAt(series, valueKey, offset = 0) {
  const idx = series.length - 1 - offset;
  if (idx < 0 || idx >= series.length) return null;
  return series[idx]?.[valueKey] ?? null;
}

/** Percent change from latest to N periods ago. null if computation fails. */
export function pctChange(series, valueKey, offset) {
  const latest = valueAt(series, valueKey, 0);
  const past = valueAt(series, valueKey, offset);
  if (latest == null || past == null || past === 0) return null;
  return ((latest - past) / past) * 100;
}

/** Absolute change from latest to N periods ago. */
export function absChange(series, valueKey, offset) {
  const latest = valueAt(series, valueKey, 0);
  const past = valueAt(series, valueKey, offset);
  if (latest == null || past == null) return null;
  return latest - past;
}

/**
 * Compute deltas at MoM / 3M / 1Y windows for the given cadence.
 * Returns { mom, q, y }, each `{ percent }` (or `{ value }` if pctMode=false).
 *
 * Cadence determines how many array steps to look back:
 *   monthly:   mom=1,  q=3,  y=12
 *   quarterly: mom=1,  q=1,  y=4
 *   annual:    mom=1,  q=1,  y=1
 */
export function computeDeltas(series, valueKey, cadence = "monthly", pctMode = true) {
  const offsets = (
    cadence === "quarterly" ? { mom: 1, q: 1, y: 4 } :
    cadence === "annual"    ? { mom: 1, q: 1, y: 1 } :
    /* monthly */             { mom: 1, q: 3, y: 12 }
  );
  const fn = pctMode ? pctChange : absChange;
  return {
    mom: pctMode ? { percent: fn(series, valueKey, offsets.mom) ?? 0 } : { value: fn(series, valueKey, offsets.mom) ?? 0 },
    q:   pctMode ? { percent: fn(series, valueKey, offsets.q)   ?? 0 } : { value: fn(series, valueKey, offsets.q)   ?? 0 },
    y:   pctMode ? { percent: fn(series, valueKey, offsets.y)   ?? 0 } : { value: fn(series, valueKey, offsets.y)   ?? 0 },
  };
}

/** Sparkline values: last N raw points (default 24). Filters out nulls. */
export function sparkline(series, valueKey, n = 24) {
  return series
    .slice(-n)
    .map((d) => d[valueKey])
    .filter((v) => v != null && !Number.isNaN(v));
}

/** Sparkline range labels { start, end } from the time-key. */
export function sparklineRange(series, timeKey, n = 24, formatter = formatPeriod) {
  const slice = series.slice(-n);
  if (slice.length === 0) return null;
  return {
    start: formatter(slice[0][timeKey]),
    end: formatter(slice[slice.length - 1][timeKey]),
  };
}

/**
 * Build a long series of ~10 yearly points. For monthly/quarterly inputs,
 * compute the annual mean per calendar year. For annual inputs, take as-is.
 *
 * @returns { values: number[], startYear: number }
 */
export function longSeries(series, valueKey, timeKey, cadence = "monthly", years = 10) {
  if (cadence === "annual") {
    const slice = series.slice(-years);
    const startYear = parseYear(slice[0]?.[timeKey]) ?? new Date().getFullYear() - slice.length + 1;
    return {
      values: slice.map((d) => d[valueKey]),
      startYear,
    };
  }
  const byYear = new Map();
  for (const point of series) {
    const yr = parseYear(point[timeKey]);
    if (yr == null) continue;
    if (point[valueKey] == null) continue;
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr).push(point[valueKey]);
  }
  const yrs = [...byYear.keys()].sort((a, b) => a - b).slice(-years);
  const values = yrs.map((y) => {
    const vs = byYear.get(y);
    return vs.reduce((s, v) => s + v, 0) / vs.length;
  });
  return { values, startYear: yrs[0] ?? null };
}

/**
 * Enrich a series with a year-over-year percent column.
 * Adds a `yoy` field to each row (null where no comparison is possible).
 *
 * @param series   array
 * @param valueKey field name of the level value
 * @param cadence  "monthly" | "quarterly" | "annual" — sets the year-ago offset
 */
export function enrichWithYoY(series, valueKey, cadence = "monthly") {
  const offset = cadence === "quarterly" ? 4 : cadence === "annual" ? 1 : 12;
  return series.map((d, i) => {
    const past = series[i - offset];
    if (!past || past[valueKey] == null || past[valueKey] === 0 || d[valueKey] == null) {
      return { ...d, yoy: null };
    }
    return { ...d, yoy: ((d[valueKey] - past[valueKey]) / past[valueKey]) * 100 };
  });
}

/** Parse a year out of a period string ("2024-01", "2024 Q1", "2024-25", 2024). */
export function parseYear(p) {
  if (typeof p === "number") return p;
  if (typeof p !== "string") return null;
  const m = p.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Format a period for display.
 *  "2024-01"  → "Jan 2024"
 *  "2024 Q1"  → "Q1 2024"
 *  "2024-Q1"  → "Q1 2024"
 *  "2024-25"  → "2024-25"
 *  2024       → "2024"
 */
export function formatPeriod(p) {
  if (typeof p === "number") return String(p);
  if (typeof p !== "string") return "";
  const monthly = p.match(/^(\d{4})-(\d{2})$/);
  if (monthly) {
    const month = parseInt(monthly[2], 10);
    if (month >= 1 && month <= 12) return `${MONTHS_SHORT[month - 1]} ${monthly[1]}`;
  }
  const quarterly = p.match(/^(\d{4})[\s-]?Q(\d)$/i);
  if (quarterly) return `Q${quarterly[2]} ${quarterly[1]}`;
  return p;
}
