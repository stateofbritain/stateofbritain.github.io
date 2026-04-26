/**
 * fetch-train-ppm.js
 *
 * Passenger rail Public Performance Measure (PPM): the share of trains
 * arriving at their final destination within 5 minutes (commuter) or 10
 * minutes (long-distance) of the planned time. ORR publishes this as
 * 4-weekly periodic data (13 periods per year).
 *
 * Strategy: discover the headline CSV via ORR's CKAN-style data portal.
 *
 * Source: ORR — Passenger rail performance
 * https://dataportal.orr.gov.uk/statistics/performance/passenger-rail-performance/
 *
 * Output: public/data/train-ppm.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchHtml, fetchBuffer } from "./lib/xlsx-fetch.js";

const ORR_PAGE =
  "https://dataportal.orr.gov.uk/statistics/performance/passenger-rail-performance/";
const ORR_CKAN =
  "https://dataportal.orr.gov.uk/api/3/action/package_show?id=passenger-rail-performance";

async function fetchJson(url) {
  const buf = await fetchBuffer(url);
  return JSON.parse(buf.toString("utf-8"));
}

function findCsvLinks(html) {
  const re = /https?:\/\/[^"'\s]+?\.csv/gi;
  return [...new Set(html.match(re) || [])];
}

function parsePeriodLabel(s) {
  if (typeof s !== "string") return null;
  // Accept "2024-25 P9", "2024-25 Period 9", "P9 2024-25"
  let m = s.match(/(\d{4})[-/](\d{2,4})\s*(?:P|Period\s*)(\d{1,2})/i);
  if (m) {
    const year = m[1];
    const period = m[3].padStart(2, "0");
    return `${year}-P${period}`;
  }
  m = s.match(/(?:P|Period\s*)(\d{1,2})\s*[-/]?\s*(\d{4})/i);
  if (m) {
    const period = m[1].padStart(2, "0");
    return `${m[2]}-P${period}`;
  }
  return null;
}

function parsePpmCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map((c) => c.trim().replace(/"/g, "").toLowerCase());

  const periodCol = headers.findIndex((c) => /period|time_period|year_period/.test(c));
  const ppmCol = headers.findIndex(
    (c) => /^(ppm|public_performance_measure|on.?time|punctuality)/.test(c)
  );
  if (periodCol < 0 || ppmCol < 0) return null;

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const period = parsePeriodLabel(cells[periodCol]);
    const ppm = Number.parseFloat(cells[ppmCol]);
    if (!period || !Number.isFinite(ppm)) continue;
    out.push({ period, ppm });
  }
  return out.length > 0 ? out.sort((a, b) => a.period.localeCompare(b.period)) : null;
}

async function tryCkan() {
  try {
    const json = await fetchJson(ORR_CKAN);
    const resources = json?.result?.resources || [];
    for (const r of resources) {
      const url = r.url;
      if (!url || !/\.csv$/i.test(url)) continue;
      const name = (r.name || "").toLowerCase();
      if (!/headline|ppm|punctuality|performance/.test(name)) continue;
      try {
        const buf = await fetchBuffer(url);
        const data = parsePpmCsv(buf.toString("utf-8"));
        if (data) return { data, url };
      } catch (err) {
        console.warn(`  ORR ${name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`ORR CKAN API failed: ${err.message}`);
  }
  return null;
}

async function tryPublicHtml() {
  try {
    const html = await fetchHtml(ORR_PAGE);
    for (const url of findCsvLinks(html).slice(0, 8)) {
      try {
        const buf = await fetchBuffer(url);
        const data = parsePpmCsv(buf.toString("utf-8"));
        if (data) return { data, url };
      } catch (err) {
        console.warn(`  CSV ${url}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Public page scrape failed: ${err.message}`);
  }
  return null;
}

async function main() {
  let result = await tryCkan();
  if (!result) result = await tryPublicHtml();

  const data = result?.data ?? [];
  const liveUrl = result?.url ?? null;

  const output = {
    $schema: "sob-dataset-v1",
    id: "train-ppm",
    pillar: "growth",
    topic: "transport",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "orr-ppm",
        name: "ORR — Passenger rail performance (PPM)",
        url: liveUrl ?? ORR_PAGE,
        publisher: "Office of Rail and Road",
        note: liveUrl
          ? "4-weekly periodic share of passenger trains arriving on time (PPM threshold)."
          : "Live discovery did not succeed this run; series empty.",
      },
    ],
    snapshot: data.length
      ? { ppm: data[data.length - 1].ppm, period: data[data.length - 1].period, ppmUnit: "% on time" }
      : {},
    series: {
      periodic: {
        sourceId: "orr-ppm",
        timeField: "period",
        unit: "% on time",
        description: "Public Performance Measure: % of trains arriving on time, GB national rail.",
        data,
      },
    },
  };

  writeFileSync("public/data/train-ppm.json", JSON.stringify(output, null, 2) + "\n");
  console.log(
    `${data.length > 0 ? "✓" : "⚠"} public/data/train-ppm.json (${data.length} periods; source=${liveUrl ? "live" : "empty (no fallback)"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
