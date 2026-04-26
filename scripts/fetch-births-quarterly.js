/**
 * fetch-births-quarterly.js
 *
 * Quarterly live births in England & Wales. ONS launched this dataset in
 * Feb 2025; reverts to annual cadence May 2026.
 *
 * Source: ONS — Quarterly births in England and Wales.
 * https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/quarterlybirthsenglandandwales
 *
 * Discovery + CSV parsing from the ONS dataset page. No hardcoded fallback —
 * if discovery fails, the tile reads as "no data" rather than rendering
 * approximate values.
 *
 * Output: public/data/births-quarterly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchHtml, fetchBuffer } from "./lib/xlsx-fetch.js";

const ONS_DATASET_URL =
  "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/quarterlybirthsenglandandwales";

function findCsvLinks(html) {
  const re = /https?:\/\/[^"'\s]+?\.csv/gi;
  return [...new Set(html.match(re) || [])];
}

async function tryLiveCsv() {
  try {
    const html = await fetchHtml(ONS_DATASET_URL);
    for (const url of findCsvLinks(html).slice(0, 5)) {
      try {
        const buf = await fetchBuffer(url);
        const text = buf.toString("utf-8");
        const data = parseQuarterlyCsv(text);
        if (data && data.length > 0) return { data, url };
      } catch (err) {
        console.warn(`  CSV ${url}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Discovery failed: ${err.message}`);
  }
  return null;
}

function parseQuarterlyCsv(text) {
  // Best-effort: parse a CSV with a quarter-like column and a numeric births
  // column. ONS releases vary; we hunt for likely column headers.
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const header = lines[0].split(",").map((c) => c.trim().replace(/"/g, ""));
  const periodCol = header.findIndex((c) => /quarter|period|time/i.test(c));
  const valueCol = header.findIndex((c) =>
    /(births|live\s*births|count|value|observations?)/i.test(c)
  );
  if (periodCol < 0 || valueCol < 0) return null;
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const period = cells[periodCol];
    const value = Number.parseFloat(cells[valueCol]);
    if (!period || !Number.isFinite(value)) continue;
    const m = period.match(/(\d{4})\s*Q(\d)/i);
    if (!m) continue;
    out.push({ quarter: `${m[1]}-Q${m[2]}`, births: Math.round(value) });
  }
  return out.length > 0 ? out.sort((a, b) => a.quarter.localeCompare(b.quarter)) : null;
}

async function main() {
  let data = [];
  let liveUrl = null;
  const live = await tryLiveCsv();
  if (live) {
    data = live.data;
    liveUrl = live.url;
  } else {
    console.warn("Live ONS CSV discovery did not succeed; writing empty series.");
  }

  const output = {
    $schema: "sob-dataset-v1",
    id: "births-quarterly",
    pillar: "foundations",
    topic: "family",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-quarterly-births",
        name: "ONS — Quarterly births in England and Wales",
        url: liveUrl ?? ONS_DATASET_URL,
        publisher: "ONS",
        note: liveUrl
          ? "Quarterly live births in England & Wales."
          : "Live discovery did not succeed this run; series empty (tile will show 'no data' until next successful fetch).",
      },
    ],
    snapshot: data.length
      ? { births: data[data.length - 1].births, birthsQuarter: data[data.length - 1].quarter }
      : {},
    series: {
      quarterly: {
        sourceId: "ons-quarterly-births",
        timeField: "quarter",
        unit: "live births",
        description: "Quarterly live births in England & Wales.",
        data,
      },
    },
  };

  writeFileSync(
    "public/data/births-quarterly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `${data.length > 0 ? "✓" : "⚠"} public/data/births-quarterly.json (${data.length} quarters; source=${liveUrl ? "live" : "empty (no fallback)"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
