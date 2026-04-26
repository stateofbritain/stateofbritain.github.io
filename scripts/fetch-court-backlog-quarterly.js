/**
 * fetch-court-backlog-quarterly.js
 *
 * Quarterly Crown Court outstanding (open) cases in England & Wales.
 *
 * Strategy:
 *   1. Try live XLSX discovery from MoJ Criminal Court Statistics collection.
 *      The "Receipts/Disposals/Open Cases tool" uses filename cc_rdos_tool.xlsx
 *      and the URL UUID changes per release.
 *   2. If discovery + parse succeeds, write the live data.
 *   3. If anything fails, fall back to the hardcoded historical series.
 *
 * Source: MoJ Criminal Court Statistics Quarterly.
 * https://www.gov.uk/government/collections/criminal-court-statistics
 *
 * Output: public/data/court-backlog-quarterly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import {
  discoverGovUkAsset,
  fetchBuffer,
  readXlsx,
  sheetToRows,
} from "./lib/xlsx-fetch.js";

const COLLECTION = "https://www.gov.uk/government/collections/criminal-court-statistics";

// Hardcoded historical fallback (Q1 2018 – present). Refreshed when
// live discovery succeeds. Source: MoJ Criminal Court Statistics.
const FALLBACK = [
  { quarter: "2018-Q1", outstanding: 38900 },
  { quarter: "2018-Q2", outstanding: 39400 },
  { quarter: "2018-Q3", outstanding: 38700 },
  { quarter: "2018-Q4", outstanding: 33700 },
  { quarter: "2019-Q1", outstanding: 33000 },
  { quarter: "2019-Q2", outstanding: 36300 },
  { quarter: "2019-Q3", outstanding: 37400 },
  { quarter: "2019-Q4", outstanding: 39300 },
  { quarter: "2020-Q1", outstanding: 41100 },
  { quarter: "2020-Q2", outstanding: 47500 },
  { quarter: "2020-Q3", outstanding: 53300 },
  { quarter: "2020-Q4", outstanding: 57000 },
  { quarter: "2021-Q1", outstanding: 59500 },
  { quarter: "2021-Q2", outstanding: 60200 },
  { quarter: "2021-Q3", outstanding: 60100 },
  { quarter: "2021-Q4", outstanding: 58700 },
  { quarter: "2022-Q1", outstanding: 58100 },
  { quarter: "2022-Q2", outstanding: 60400 },
  { quarter: "2022-Q3", outstanding: 62500 },
  { quarter: "2022-Q4", outstanding: 64700 },
  { quarter: "2023-Q1", outstanding: 65000 },
  { quarter: "2023-Q2", outstanding: 67700 },
  { quarter: "2023-Q3", outstanding: 67400 },
  { quarter: "2023-Q4", outstanding: 67500 },
  { quarter: "2024-Q1", outstanding: 67700 },
  { quarter: "2024-Q2", outstanding: 70500 },
  { quarter: "2024-Q3", outstanding: 73100 },
  { quarter: "2024-Q4", outstanding: 76500 },
  { quarter: "2025-Q1", outstanding: 78200 },
  { quarter: "2025-Q2", outstanding: 79100 },
  { quarter: "2025-Q3", outstanding: 80200 },
];

/**
 * Try to extract a quarterly outstanding-cases series from the MoJ XLSX.
 * The tool's structure changes between releases, so this scans every sheet
 * for a row containing "Open cases" or "Outstanding" and pairs the numeric
 * cells with quarterly headers in row 1 (e.g. "Q1 2025" or "2025-Q1").
 *
 * Returns null if the structure can't be matched.
 */
function extractFromXlsx(buffer) {
  const wb = readXlsx(buffer);
  for (const sheetName of wb.SheetNames) {
    const rows = sheetToRows(wb.Sheets[sheetName]);
    if (!rows || rows.length < 2) continue;

    // Find header row that looks like quarterly periods.
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const cells = rows[i].map((c) => String(c ?? ""));
      const qHeaders = cells.filter((c) => /^(Q[1-4]\s*\d{4}|\d{4}\s*Q[1-4])$/i.test(c.trim()));
      if (qHeaders.length >= 4) { headerRowIdx = i; break; }
    }
    if (headerRowIdx < 0) continue;

    const headerRow = rows[headerRowIdx];

    // Find row with "Open" and "outstanding"-like label.
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const label = String(rows[r][0] ?? "").trim().toLowerCase();
      if (!/(open|outstanding)/.test(label)) continue;

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
        data.push({ quarter: `${year}-Q${q}`, outstanding: Math.round(value) });
      }
      if (data.length >= 4) {
        return data.sort((a, b) => a.quarter.localeCompare(b.quarter));
      }
    }
  }
  return null;
}

async function main() {
  let series = null;
  let liveSource = null;

  try {
    const url = await discoverGovUkAsset({
      collectionUrl: COLLECTION,
      filenamePattern: /cc_rdos_tool\.xlsx$/i,
    });
    if (url) {
      console.log(`MoJ XLSX discovered: ${url}`);
      const buf = await fetchBuffer(url);
      const extracted = extractFromXlsx(buf);
      if (extracted && extracted.length > 0) {
        series = extracted;
        liveSource = url;
      } else {
        console.warn("Could not extract Open cases from XLSX; falling back to hardcoded history");
      }
    } else {
      console.warn("No XLSX matching cc_rdos_tool.xlsx found on collection page; falling back to hardcoded history");
    }
  } catch (err) {
    console.warn(`Discovery/parse failed (${err.message}); falling back to hardcoded history`);
  }

  if (!series) series = FALLBACK.slice();
  series.sort((a, b) => a.quarter.localeCompare(b.quarter));
  const latest = series[series.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "court-backlog-quarterly",
    pillar: "state",
    topic: "justice",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "moj-ccs",
        name: "Ministry of Justice — Criminal Court Statistics Quarterly",
        url: liveSource ?? "https://www.gov.uk/government/collections/criminal-court-statistics",
        publisher: "MoJ",
        note: liveSource
          ? `Crown Court outstanding cases extracted from cc_rdos_tool.xlsx.`
          : `Crown Court outstanding cases (hardcoded historical fallback; live XLSX discovery did not succeed this run).`,
      },
    ],
    snapshot: {
      outstanding: latest.outstanding,
      outstandingQuarter: latest.quarter,
    },
    series: {
      quarterly: {
        sourceId: "moj-ccs",
        timeField: "quarter",
        unit: "cases outstanding",
        description:
          "Quarterly Crown Court outstanding cases at end of period, England & Wales.",
        data: series,
      },
    },
  };

  writeFileSync(
    "public/data/court-backlog-quarterly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/court-backlog-quarterly.json (${series.length} quarters; latest ${latest.outstanding} for ${latest.quarter}, source=${liveSource ? "live" : "fallback"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
