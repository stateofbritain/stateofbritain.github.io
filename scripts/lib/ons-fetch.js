/**
 * Shared helpers for ONS time-series API fetches.
 *
 * The ONS API endpoint pattern is:
 *   https://www.ons.gov.uk/{topic-path}/timeseries/{SERIES_ID}/data
 *
 * Returns JSON with `months`, `quarters`, `years` arrays.
 */
import https from "https";

export const MONTHS_SHORT = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

export function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https
        .get(
          {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { "User-Agent": "StateOfBritain/1.0 (+dashboard)" },
          },
          (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              res.resume();
              return get(res.headers.location);
            }
            if (res.statusCode !== 200) {
              res.resume();
              return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
            }
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
              try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
              } catch (err) {
                reject(err);
              }
            });
            res.on("error", reject);
          }
        )
        .on("error", reject);
    };
    get(url);
  });
}

export function parseOnsMonth(date) {
  if (typeof date !== "string") return null;
  const m1 = date.match(/^(\d{4})\s+([A-Z]{3})$/);
  if (m1 && MONTHS_SHORT[m1[2]]) return `${m1[1]}-${MONTHS_SHORT[m1[2]]}`;
  const m2 = date.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return null;
}

export function parseOnsQuarter(date) {
  if (typeof date !== "string") return null;
  const m = date.match(/^(\d{4})\s*Q(\d)$/i);
  return m ? `${m[1]}-Q${m[2]}` : date;
}

/**
 * Fetch an ONS time-series JSON URL and normalise into months/quarters/annual.
 * Each shaped: months: [{ period: "YYYY-MM", value }], quarters: [{ period, value }], annual: [{ year, value }].
 */
export async function fetchOnsTimeSeries(url) {
  const json = await fetchJson(url);
  const months = (json.months || [])
    .map((m) => ({
      period: parseOnsMonth(m.date),
      value: Number.parseFloat(m.value),
    }))
    .filter((m) => m.period && Number.isFinite(m.value))
    .sort((a, b) => a.period.localeCompare(b.period));

  const quarters = (json.quarters || [])
    .map((q) => ({
      period: parseOnsQuarter(q.date),
      value: Number.parseFloat(q.value),
    }))
    .filter((q) => q.period && Number.isFinite(q.value))
    .sort((a, b) => a.period.localeCompare(b.period));

  const annual = (json.years || [])
    .map((y) => ({
      year: Number.parseInt(y.date, 10),
      value: Number.parseFloat(y.value),
    }))
    .filter((y) => Number.isFinite(y.year) && Number.isFinite(y.value))
    .sort((a, b) => a.year - b.year);

  return { months, quarters, annual, raw: json };
}

/**
 * Build a v1 dataset shell from an ONS series result. Helper to reduce
 * boilerplate in individual fetch scripts.
 */
export function buildOnsDataset({
  id,
  pillar,
  topic,
  sourceId,
  sourceName,
  url,
  unit,
  description,
  result,
  snapshotKeys,
}) {
  const latest = result.months[result.months.length - 1] || null;
  const out = {
    $schema: "sob-dataset-v1",
    id,
    pillar,
    topic,
    generated: new Date().toISOString().slice(0, 10),
    sources: [{ id: sourceId, name: sourceName, url, publisher: "ONS" }],
    snapshot: latest
      ? {
          [snapshotKeys?.value ?? "value"]: latest.value,
          [snapshotKeys?.period ?? "period"]: latest.period,
          [snapshotKeys?.unit ?? "unit"]: unit,
        }
      : {},
    series: {
      monthly: {
        sourceId,
        timeField: "period",
        unit,
        description,
        data: result.months,
      },
    },
  };
  if (result.annual.length > 0) {
    out.series.annual = {
      sourceId,
      timeField: "year",
      unit,
      description,
      data: result.annual,
    };
  }
  return out;
}
