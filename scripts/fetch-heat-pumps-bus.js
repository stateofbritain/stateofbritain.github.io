/**
 * fetch-heat-pumps-bus.js
 *
 * Monthly heat pump installations under the DESNZ Boiler Upgrade Scheme.
 *
 * Source: DESNZ — Boiler Upgrade Scheme statistics (monthly ODS/XLSX).
 * https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics
 *
 * Discovery + parse routine. No hardcoded fallback — if discovery fails the
 * tile shows "no data" until the next successful run.
 *
 * Output: public/data/heat-pumps-bus.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import {
  discoverGovUkAsset,
  fetchBuffer,
  readXlsx,
  sheetToRows,
} from "./lib/xlsx-fetch.js";

const COLLECTION = "https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics";

const MONTH_TO_NUM = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04",
  june: "06", july: "07", august: "08", september: "09",
  october: "10", november: "11", december: "12",
};

function parseMonthHeader(s) {
  if (typeof s !== "string") return null;
  const a = s.trim().toLowerCase().match(/^([a-z]{3,9})\s+(\d{4})$/);
  if (a && MONTH_TO_NUM[a[1]]) return `${a[2]}-${MONTH_TO_NUM[a[1]]}`;
  const b = s.trim().match(/^(\d{4})-(\d{2})$/);
  if (b) return s.trim();
  return null;
}

function extractFromSpreadsheet(buffer) {
  const wb = readXlsx(buffer);
  for (const sheetName of wb.SheetNames) {
    const rows = sheetToRows(wb.Sheets[sheetName]);
    if (!rows || rows.length < 5) continue;
    // Look for a monthly time column and an ASHP/GSHP redemptions column.
    let hdrIdx = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const cells = (rows[i] || []).map((c) => String(c ?? "").toLowerCase());
      if (cells.some((c) => /redemptions?|installed|grants/i.test(c)) &&
          cells.some((c) => /month|date/i.test(c))) {
        hdrIdx = i;
        break;
      }
    }
    if (hdrIdx < 0) continue;
    const header = rows[hdrIdx].map((c) => String(c ?? "").toLowerCase());
    const monthCol = header.findIndex((c) => /^month$|^date$|reporting/i.test(c));
    const ashpCol = header.findIndex((c) => /ashp.*redempt|air.*redempt/i.test(c));
    const gshpCol = header.findIndex((c) => /gshp.*redempt|ground.*redempt/i.test(c));
    const totalCol = header.findIndex((c) => /^total\s+redempt|all redempt/i.test(c));
    if (monthCol < 0) continue;

    const data = [];
    for (let r = hdrIdx + 1; r < rows.length; r++) {
      const period = parseMonthHeader(String(rows[r][monthCol] ?? ""));
      if (!period) continue;
      let count;
      if (totalCol >= 0) count = Number.parseFloat(rows[r][totalCol]);
      else if (ashpCol >= 0 || gshpCol >= 0) {
        const a = Number.parseFloat(rows[r][ashpCol]) || 0;
        const g = Number.parseFloat(rows[r][gshpCol]) || 0;
        count = a + g;
      }
      if (Number.isFinite(count) && count > 0) {
        data.push({ month: period, redemptions: Math.round(count) });
      }
    }
    if (data.length > 0) return data.sort((a, b) => a.month.localeCompare(b.month));
  }
  return null;
}

async function main() {
  let data = [];
  let liveUrl = null;

  try {
    const url = await discoverGovUkAsset({
      collectionUrl: COLLECTION,
      filenamePattern: /Boiler.Upgrade.Scheme.*\.(ods|xlsx)$/i,
    });
    if (url) {
      console.log(`BUS file discovered: ${url}`);
      const buf = await fetchBuffer(url);
      const extracted = extractFromSpreadsheet(buf);
      if (extracted) { data = extracted; liveUrl = url; }
      else console.warn("Could not extract redemptions from spreadsheet; series empty.");
    } else {
      console.warn("No BUS file matched on collection page; series empty.");
    }
  } catch (err) {
    console.warn(`Discovery / parse failed (${err.message}); series empty.`);
  }

  const output = {
    $schema: "sob-dataset-v1",
    id: "heat-pumps-bus",
    pillar: "foundations",
    topic: "energy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "desnz-bus",
        name: "DESNZ — Boiler Upgrade Scheme statistics",
        url: liveUrl ?? COLLECTION,
        publisher: "DESNZ",
        note: liveUrl
          ? "Monthly heat pump grant redemptions (ASHP + GSHP) under the BUS scheme."
          : "Live discovery did not succeed this run; series empty.",
      },
    ],
    snapshot: data.length
      ? { redemptions: data[data.length - 1].redemptions, redemptionsMonth: data[data.length - 1].month }
      : {},
    series: {
      monthly: {
        sourceId: "desnz-bus",
        timeField: "month",
        unit: "grants redeemed / month",
        description: "Monthly heat pump grant redemptions under the Boiler Upgrade Scheme.",
        data,
      },
    },
  };

  writeFileSync(
    "public/data/heat-pumps-bus.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `${data.length > 0 ? "✓" : "⚠"} public/data/heat-pumps-bus.json (${data.length} months; source=${liveUrl ? "live" : "empty (no fallback)"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
