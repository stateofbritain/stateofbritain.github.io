/**
 * fetch-gas-imports.js
 *
 * UK gas import country concentration. Computed as the Herfindahl-Hirschman
 * Index (HHI) on monthly gas-import shares by source country.
 *
 * HHI = sum(share^2) × 10000, where share is each country's % of total
 * gas imports. Range 0–10000. Higher = more concentrated = worse security.
 *
 * Strategy:
 *   1. Try DESNZ Energy Trends Section 4 (Gas) XLSX/ODS discovery.
 *   2. Parse the gas-trade-by-country table; compute monthly HHI.
 *   3. Fall back to hardcoded historical HHI series if discovery / parse fails.
 *
 * Source: DESNZ — Energy Trends Section 4: gas.
 * https://www.gov.uk/government/statistics/energy-trends-section-4-gas
 *
 * Output: public/data/gas-imports.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import {
  discoverGovUkAsset,
  fetchBuffer,
  readXlsx,
  sheetToRows,
} from "./lib/xlsx-fetch.js";

const COLLECTION = "https://www.gov.uk/government/statistics/energy-trends-section-4-gas";

// No hardcoded fallback — only real upstream-computed HHI is admissible.
// If live discovery / parse fails, the JSON is written empty and the tile
// shows "no data" until the next successful run.
const FALLBACK = [];

const MONTH_TO_NUM = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04",
  june: "06", july: "07", august: "08", september: "09",
  october: "10", november: "11", december: "12",
};

function parseMonthHeader(s) {
  if (typeof s !== "string") return null;
  // "Jan 2024", "January 2024", "2024 Jan", "2024-01"
  const a = s.trim().toLowerCase().match(/^([a-z]{3,9})\s+(\d{4})$/);
  if (a && MONTH_TO_NUM[a[1]]) return `${a[2]}-${MONTH_TO_NUM[a[1]]}`;
  const b = s.trim().toLowerCase().match(/^(\d{4})\s+([a-z]{3,9})$/);
  if (b && MONTH_TO_NUM[b[2]]) return `${b[1]}-${MONTH_TO_NUM[b[2]]}`;
  const c = s.trim().match(/^(\d{4})-(\d{2})$/);
  if (c) return `${c[1]}-${c[2]}`;
  return null;
}

function computeHHI(shares) {
  // shares: array of decimal proportions summing to ~1
  const total = shares.reduce((s, v) => s + v, 0);
  if (total <= 0) return null;
  return Math.round(shares.reduce((s, v) => s + (v / total) * (v / total), 0) * 10000);
}

/**
 * Try to extract a monthly HHI series from a DESNZ Energy Trends XLSX.
 * Looks for a sheet with ET 4.x Gas-imports-by-country layout: countries
 * down rows, months across columns.
 */
function extractHHIFromXlsx(buffer) {
  const wb = readXlsx(buffer);
  for (const sheetName of wb.SheetNames) {
    if (!/4[._\s]?[34]/.test(sheetName)) continue; // ET 4.3 / 4.4 are the gas-trade tabs
    const rows = sheetToRows(wb.Sheets[sheetName]);
    if (!rows || rows.length < 5) continue;

    // Find header row with month headers across.
    let hdrIdx = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const monthCells = rows[i].filter((c) => parseMonthHeader(String(c ?? "")));
      if (monthCells.length >= 4) { hdrIdx = i; break; }
    }
    if (hdrIdx < 0) continue;

    const headerRow = rows[hdrIdx];
    // Identify country rows: first cell is a non-empty string, value cells numeric.
    const monthCols = [];
    for (let c = 0; c < headerRow.length; c++) {
      const period = parseMonthHeader(String(headerRow[c] ?? ""));
      if (period) monthCols.push({ col: c, period });
    }
    if (monthCols.length < 4) continue;

    // Sum imports by country per month (skip totals / subtotals).
    const monthData = new Map(); // period -> [{country, value}]
    for (let r = hdrIdx + 1; r < rows.length; r++) {
      const label = String(rows[r][0] ?? "").trim();
      if (!label) continue;
      const lower = label.toLowerCase();
      if (/total|subtotal|imports|exports|net|all/.test(lower)) continue;
      // Restrict to country-like labels (capitalised, alpha)
      if (!/^[A-Z]/.test(label)) continue;
      for (const { col, period } of monthCols) {
        const v = Number.parseFloat(rows[r][col]);
        if (!Number.isFinite(v) || v <= 0) continue;
        if (!monthData.has(period)) monthData.set(period, []);
        monthData.get(period).push(v);
      }
    }

    if (monthData.size === 0) continue;
    const hhi = [];
    for (const [period, values] of monthData) {
      const h = computeHHI(values);
      if (h != null) hhi.push({ month: period, hhi: h });
    }
    if (hhi.length >= 4) return hhi.sort((a, b) => a.month.localeCompare(b.month));
  }
  return null;
}

async function main() {
  let series = null;
  let liveSource = null;

  try {
    const url = await discoverGovUkAsset({
      collectionUrl: COLLECTION,
      filenamePattern: /\b(et|energy_trends?)[_.\s]*4[._\s]*[34]\.(xlsx|ods)$/i,
    });
    if (url) {
      console.log(`DESNZ Energy Trends Gas XLSX/ODS discovered: ${url}`);
      const buf = await fetchBuffer(url);
      const extracted = extractHHIFromXlsx(buf);
      if (extracted) { series = extracted; liveSource = url; }
      else console.warn("Could not extract HHI from XLSX; using fallback");
    } else {
      console.warn("No matching ET 4.x file found on collection page; using fallback");
    }
  } catch (err) {
    console.warn(`Discovery / parse failed (${err.message}); using fallback`);
  }

  if (!series) series = FALLBACK.slice();
  series.sort((a, b) => a.month.localeCompare(b.month));
  const latest = series[series.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "gas-imports",
    pillar: "foundations",
    topic: "energy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "desnz-et4-gas",
        name: "DESNZ Energy Trends Section 4 — Gas",
        url: liveSource ?? COLLECTION,
        publisher: "DESNZ",
        note: liveSource
          ? "Monthly Herfindahl-Hirschman Index of UK gas-import country concentration, computed from ET 4.x table."
          : "Monthly HHI of gas-import country concentration (hardcoded historical fallback; live discovery did not succeed this run).",
      },
    ],
    snapshot: {
      hhi: latest.hhi,
      hhiMonth: latest.month,
      hhiUnit: "Herfindahl-Hirschman Index (×10000)",
    },
    series: {
      monthly: {
        sourceId: "desnz-et4-gas",
        timeField: "month",
        unit: "HHI (×10000)",
        description:
          "Monthly Herfindahl-Hirschman Index of UK gas-import country concentration. Higher = more concentrated.",
        data: series,
      },
    },
  };

  writeFileSync(
    "public/data/gas-imports.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/gas-imports.json (${series.length} months; latest HHI ${latest.hhi} for ${latest.month}, source=${liveSource ? "live" : "fallback"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
