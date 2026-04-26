/**
 * fetch-knife-crime-quarterly.js
 *
 * Quarterly police-recorded knife/sharp-instrument offences in England & Wales.
 *
 * Strategy:
 *   1. Try ONS dataset page scrape for the latest knife-crime XLSX.
 *   2. If discovery + parse fails, fall back to hardcoded HISTORY below.
 *
 * Source: ONS Crime in England and Wales — police-force-area data tables.
 *
 * Output: public/data/knife-crime-quarterly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import {
  fetchHtml,
  fetchBuffer,
  findGovUkAssets,
  readXlsx,
  sheetToRows,
} from "./lib/xlsx-fetch.js";

const ONS_DATASET_URL =
  "https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/policeforceareadatatables";

// No hardcoded fallback — dashboard shows only real upstream-fetched data.
// When live XLSX discovery fails, the JSON is written empty and the tile
// shows "no data" until the next run that succeeds.
const FALLBACK = [];

function extractFromXlsx(buffer) {
  const wb = readXlsx(buffer);
  for (const sheetName of wb.SheetNames) {
    const rows = sheetToRows(wb.Sheets[sheetName]);
    if (!rows || rows.length < 2) continue;

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const cells = rows[i].map((c) => String(c ?? ""));
      const qHeaders = cells.filter((c) => /^(Q[1-4]\s*\d{4}|\d{4}\s*Q[1-4])$/i.test(c.trim()));
      if (qHeaders.length >= 4) { headerRowIdx = i; break; }
    }
    if (headerRowIdx < 0) continue;

    const headerRow = rows[headerRowIdx];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const label = String(rows[r][0] ?? "").trim().toLowerCase();
      if (!/(knife|sharp instrument)/.test(label)) continue;
      const data = [];
      for (let c = 1; c < headerRow.length; c++) {
        const headerCell = String(headerRow[c] ?? "").trim();
        const valueCell = rows[r][c];
        const m = headerCell.match(/^(?:Q([1-4])\s*(\d{4})|(\d{4})\s*Q([1-4]))$/i);
        if (!m) continue;
        const year = m[2] ?? m[3];
        const q = m[1] ?? m[4];
        const value = Number.parseFloat(valueCell);
        if (!Number.isFinite(value)) continue;
        data.push({ quarter: `${year}-Q${q}`, offences: Math.round(value) });
      }
      if (data.length >= 4) {
        return data.sort((a, b) => a.quarter.localeCompare(b.quarter));
      }
    }
  }
  return null;
}

async function tryLive() {
  try {
    const html = await fetchHtml(ONS_DATASET_URL);
    const candidates = findGovUkAssets(html, /\.xlsx$/i);
    for (const url of candidates.slice(0, 3)) {
      try {
        console.log(`Trying XLSX: ${url}`);
        const buf = await fetchBuffer(url);
        const extracted = extractFromXlsx(buf);
        if (extracted) return { series: extracted, url };
      } catch (err) {
        console.warn(`  parse failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Discovery failed: ${err.message}`);
  }
  return null;
}

async function main() {
  let series = null;
  let liveUrl = null;
  const live = await tryLive();
  if (live) {
    series = live.series;
    liveUrl = live.url;
  } else {
    console.warn("Falling back to hardcoded HISTORY");
    series = FALLBACK.slice();
  }
  series.sort((a, b) => a.quarter.localeCompare(b.quarter));
  const latest = series[series.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "knife-crime-quarterly",
    pillar: "foundations",
    topic: "safety",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-crime-eaw",
        name: "ONS — Crime in England and Wales (police-recorded knife/sharp instrument offences)",
        url: liveUrl ?? ONS_DATASET_URL,
        publisher: "ONS",
        note: liveUrl
          ? "Quarterly police-recorded knife or sharp instrument offences."
          : "Quarterly police-recorded knife or sharp instrument offences (hardcoded historical fallback; live XLSX discovery did not succeed this run). Q2 2020 dip reflects first COVID lockdown.",
      },
    ],
    snapshot: {
      offences: latest.offences,
      offencesQuarter: latest.quarter,
    },
    series: {
      quarterly: {
        sourceId: "ons-crime-eaw",
        timeField: "quarter",
        unit: "offences",
        description:
          "Quarterly police-recorded knife/sharp-instrument offences, England & Wales.",
        data: series,
      },
    },
  };

  writeFileSync(
    "public/data/knife-crime-quarterly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/knife-crime-quarterly.json (${series.length} quarters; latest ${latest.offences} for ${latest.quarter}, source=${liveUrl ? "live" : "fallback"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
