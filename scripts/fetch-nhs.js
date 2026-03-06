/**
 * fetch-nhs.js
 *
 * Downloads NHS England statistics and outputs public/data/nhs.json.
 *
 * Sources:
 *   - RTT Overview Timeseries — national waiting list data (Apr 2007 – Dec 2025)
 *   - A&E Monthly — latest month England totals
 *
 * Run: node scripts/fetch-nhs.js
 */

import XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const URLS = {
  rtt: "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/RTT-Overview-Timeseries-Including-Estimates-for-Missing-Trusts-Dec25-XLS-115K-6jPlxd.xlsx",
  ae: "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/January-2026-AE-by-provider-mj588-1.xls",
};

// Recent A&E monthly files to build a mini time series
const AE_MONTHS = [
  { period: "2025-04", url: "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/11/April-2025-AE-by-provider-sfo2q-revised.xls" },
  { period: "2025-07", url: "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/11/July-2025-AE-by-provider-iX1Zj-revised.xls" },
  { period: "2025-10", url: "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/11/October-2025-AE-by-provider-lFUBF.xls" },
  { period: "2026-01", url: "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/January-2026-AE-by-provider-mj588-1.xls" },
];

async function fetchXLSX(url) {
  const name = url.split("/").pop();
  console.log(`  Fetching ${name}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf);
}

function sheetRows(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

// Convert Excel serial date to YYYY-MM
function excelDateToYM(serial) {
  if (typeof serial !== "number") return null;
  // Excel serial: days since 1899-12-30
  const d = new Date((serial - 25569) * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ─── RTT Waiting List Time Series ────────────────────────────────────
function parseRTT(wb) {
  const rows = sheetRows(wb, "Full Time Series");
  // Row 10-11: headers
  // Data starts at row 12
  // Col 0: blank, Col 1: year, Col 2: month (Excel serial date)
  // Col 3: median wait, Col 7: % within 18 weeks (with estimates)
  // Col 11: >52 weeks, Col 21: total waiting (millions)
  // Col 22: total waiting with estimates (millions)

  const series = [];
  for (let i = 12; i < rows.length; i++) {
    const row = rows[i];
    const dateSerial = row[2];
    if (typeof dateSerial !== "number") continue;

    const ym = excelDateToYM(dateSerial);
    if (!ym || ym < "2012-01") continue; // Start from 2012 for cleaner chart

    const medianWait = typeof row[3] === "number" ? Math.round(row[3] * 10) / 10 : null;
    const pctWithin18 = typeof row[8] === "number" ? Math.round(row[8] * 1000) / 10 : null;
    const over52weeks = typeof row[12] === "number" ? row[12] : null;
    const totalWaiting = typeof row[22] === "number" ? Math.round(row[22] * 1000) / 1000 : null;

    if (medianWait === null && pctWithin18 === null) continue;

    series.push({
      period: ym,
      medianWait,
      pctWithin18,
      over52weeks,
      totalWaiting,
    });
  }
  return series;
}

// ─── A&E Monthly — extract England totals ────────────────────────────
function parseAE(wb, period) {
  const rows = sheetRows(wb, "System Level Data");

  // Row 16 is England total (code="-")
  // Col 5: Total attendances
  // Col 9: Total < 4 hours
  // Col 13: Total > 4 hours
  // Col 14: % within 4 hours (all)
  // Col 15: % within 4 hours (type 1)
  // Col 21: Emergency admissions total
  // Col 23: Total emergency admissions (via A&E + other)

  const engRow = rows[16];
  if (!engRow || engRow[0] !== "-") {
    // Search for England total row
    for (let i = 12; i < rows.length; i++) {
      if (rows[i][0] === "-" && rows[i][1] === "-") {
        return extractAERow(rows[i], period);
      }
    }
    console.warn(`  WARNING: Could not find England total for ${period}`);
    return null;
  }
  return extractAERow(engRow, period);
}

function extractAERow(row, period) {
  return {
    period,
    totalAttendances: numOrNull(row[5]),
    within4Hours: numOrNull(row[9]),
    over4Hours: numOrNull(row[13]),
    pctWithin4Hours: typeof row[14] === "number" ? Math.round(row[14] * 1000) / 10 : null,
    pctWithin4HoursType1: typeof row[15] === "number" ? Math.round(row[15] * 1000) / 10 : null,
    emergencyAdmissions: numOrNull(row[21]),
  };
}

function numOrNull(v) {
  return typeof v === "number" ? v : null;
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching NHS England data...\n");

  const rttWb = await fetchXLSX(URLS.rtt);
  const rtt = parseRTT(rttWb);

  // Fetch A&E monthly files
  const aeSeries = [];
  for (const { period, url } of AE_MONTHS) {
    try {
      const wb = await fetchXLSX(url);
      const ae = parseAE(wb, period);
      if (ae) aeSeries.push(ae);
    } catch (err) {
      console.warn(`  Failed to fetch A&E for ${period}:`, err.message);
    }
  }

  const latestRTT = rtt[rtt.length - 1];
  const latestAE = aeSeries[aeSeries.length - 1];

  const output = {
    meta: {
      sources: [
        {
          name: "NHS England RTT Waiting Times",
          url: "https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/",
        },
        {
          name: "NHS England A&E Attendances and Emergency Admissions",
          url: "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/",
        },
      ],
      fetched: new Date().toISOString().slice(0, 10),
    },
    rtt,
    ae: aeSeries,
    summary: {
      totalWaiting: latestRTT?.totalWaiting ?? null,
      medianWait: latestRTT?.medianWait ?? null,
      pctWithin18Weeks: latestRTT?.pctWithin18 ?? null,
      over52Weeks: latestRTT?.over52weeks ?? null,
      rttPeriod: latestRTT?.period ?? null,
      aeTotalAttendances: latestAE?.totalAttendances ?? null,
      aePctWithin4Hours: latestAE?.pctWithin4Hours ?? null,
      aePeriod: latestAE?.period ?? null,
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "nhs.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`  RTT: ${rtt.length} months (${rtt[0]?.period} to ${latestRTT?.period})`);
  console.log(`  A&E: ${aeSeries.length} months`);
  console.log(`  Summary: ${JSON.stringify(output.summary, null, 2)}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
