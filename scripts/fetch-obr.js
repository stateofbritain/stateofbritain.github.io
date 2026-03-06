/**
 * fetch-obr.js
 *
 * Downloads and parses:
 *  1. OBR Public Finances Databank (XLSX)
 *     - Aggregates (£bn): receipts, TME, borrowing, debt interest, debt, GDP
 *     - Aggregates (% of GDP): same as above as shares
 *     - Receipts (£bn): breakdown by tax type
 *
 *  2. PESA 2025 Chapter 9 Tables (XLSX)
 *     - Tables 9.5-9.14: COFOG spending by function, UK totals
 *     - "Total Expenditure on Services" for each function (includes non-identifiable)
 *
 * Outputs: public/data/spending.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import http from "http";
import XLSX from "xlsx";

const OBR_URL =
  "https://obr.uk/download/public-finances-databank-february-2026/?tmstv=1772810375";

const PESA_CH9_URL =
  "https://assets.publishing.service.gov.uk/media/6874fe89730a1bf28e2f932e/PESA_2025_CP_Chapter_9_tables.xlsx";

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      const mod = parsed.protocol === "http:" ? http : https;
      mod.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (data fetch script)" },
        },
        (res) => {
          if ([301, 302, 303, 307].includes(res.statusCode)) {
            res.resume();
            return get(res.headers.location);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} from ${u}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        }
      );
    };
    get(url);
  });
}

// ── OBR Aggregates ──────────────────────────────────────────────
function parseOBR(buf) {
  const wb = XLSX.read(buf);

  // --- £bn sheet ---
  const bnRows = XLSX.utils.sheet_to_json(wb.Sheets["Aggregates (£bn)"], { header: 1 });
  // Col layout (from row 3): 2=receipts, 3=TME, 5=PSNI, 14=PSNB, 21=CG debt interest, 23=PSND, 30=GDP
  const aggregates = [];
  for (let r = 7; r < bnRows.length; r++) {
    const row = bnRows[r];
    const fyStr = row?.[1];
    if (typeof fyStr !== "string" || !/^\d{4}-\d{2}$/.test(fyStr)) continue;
    const year = parseInt(fyStr.slice(0, 4), 10);
    if (year < 1978) continue; // sparse data before this

    const entry = {
      fy: fyStr,
      year,
      receipts: typeof row[2] === "number" ? Math.round(row[2] * 10) / 10 : null,
      tme: typeof row[3] === "number" ? Math.round(row[3] * 10) / 10 : null,
      borrowing: typeof row[14] === "number" ? Math.round(row[14] * 10) / 10 : null,
      debtInterest: typeof row[21] === "number" ? Math.round(row[21] * 10) / 10 : null,
      debt: typeof row[23] === "number" ? Math.round(row[23] * 10) / 10 : null,
      gdp: typeof row[30] === "number" ? Math.round(row[30] * 10) / 10 : null,
    };
    // Flag forecast vs outturn
    entry.forecast = year >= 2025;
    aggregates.push(entry);
  }

  // --- % of GDP sheet ---
  const pctRows = XLSX.utils.sheet_to_json(wb.Sheets["Aggregates (per cent of GDP)"], { header: 1 });
  const pctGDP = [];
  for (let r = 7; r < pctRows.length; r++) {
    const row = pctRows[r];
    const fyStr = row?.[1];
    if (typeof fyStr !== "string" || !/^\d{4}-\d{2}$/.test(fyStr)) continue;
    const year = parseInt(fyStr.slice(0, 4), 10);
    if (year < 1978) continue;

    pctGDP.push({
      fy: fyStr,
      year,
      receipts: typeof row[2] === "number" ? Math.round(row[2] * 10) / 10 : null,
      tme: typeof row[3] === "number" ? Math.round(row[3] * 10) / 10 : null,
      borrowing: typeof row[14] === "number" ? Math.round(row[14] * 10) / 10 : null,
      debtInterest: typeof row[21] === "number" ? Math.round(row[21] * 10) / 10 : null,
      debt: typeof row[23] === "number" ? Math.round(row[23] * 10) / 10 : null,
      forecast: year >= 2025,
    });
  }

  // --- Receipts breakdown ---
  const recRows = XLSX.utils.sheet_to_json(wb.Sheets["Receipts (£bn)"], { header: 1 });
  const recHeaders = recRows[3]; // Tax type names
  // Latest outturn year is typically column 26 area - find "2024-25"
  let latestCol = -1;
  for (let c = 2; c < (recRows[6] || []).length; c++) {
    if (typeof recRows[6]?.[c] === "number") latestCol = c;
  }
  // Map column 2..N to receipts
  const receiptTypes = [];
  if (latestCol >= 2) {
    const fyLabels = [];
    for (let r = 6; r < recRows.length; r++) {
      const row = recRows[r];
      if (typeof row?.[1] !== "string" || !/^\d{4}-\d{2}$/.test(row[1])) continue;
      fyLabels.push(row[1]);
    }
    // Get key tax receipts for the latest outturn year (2024-25)
    // Find the 2024-25 row
    for (let r = 6; r < recRows.length; r++) {
      const row = recRows[r];
      if (row?.[1] === "2024-25") {
        // Map major taxes
        const taxes = [
          { name: "Income tax (PAYE)", col: 16 },
          { name: "Income tax (SA)", col: 17 },
          { name: "National Insurance", col: 27 },
          { name: "VAT", col: 2 },
          { name: "Corporation tax", col: 20 },
          { name: "Council tax", col: 28 },
          { name: "Capital gains tax", col: 19 },
          { name: "Stamp duty (land)", col: 5 },
          { name: "Fuel duty", col: 4 },
          { name: "Alcohol duty", col: 8 },
          { name: "Tobacco duty", col: 7 },
          { name: "Vehicle excise duty", col: 9 },
          { name: "Air passenger duty", col: 10 },
          { name: "Insurance premium tax", col: 11 },
          { name: "Inheritance tax", col: 26 },
        ];
        for (const t of taxes) {
          const val = row[t.col];
          if (typeof val === "number" && val > 0) {
            receiptTypes.push({ name: t.name, value: Math.round(val * 10) / 10 });
          }
        }
        break;
      }
    }
    receiptTypes.sort((a, b) => b.value - a.value);
  }

  return { aggregates, pctGDP, receiptTypes };
}

// ── PESA COFOG Functions ────────────────────────────────────────
function parsePESA(buf) {
  const wb = XLSX.read(buf);

  const funcSheets = [
    { sheet: "9.5", name: "General public services" },
    { sheet: "9.6", name: "Defence" },
    { sheet: "9.7", name: "Public order & safety" },
    { sheet: "9.8", name: "Economic affairs" },
    { sheet: "9.9", name: "Environment protection" },
    { sheet: "9.10", name: "Housing & community" },
    { sheet: "9.11", name: "Health" },
    { sheet: "9.12", name: "Recreation & culture" },
    { sheet: "9.13", name: "Education" },
    { sheet: "9.14", name: "Social protection" },
  ];

  // For each function, extract "Total Expenditure on Services" time series
  // Columns: 1=2019-20, 2=2020-21, 3=2021-22, 4=2022-23, 5=2023-24
  const fys = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"];
  const cofogTimeSeries = fys.map((fy) => ({ fy, year: parseInt(fy, 10) }));
  const cofogLatest = [];

  for (const { sheet, name } of funcSheets) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
    for (let r = 0; r < rows.length; r++) {
      if (rows[r]?.[0] === "Total Expenditure on Services") {
        for (let c = 1; c <= 5; c++) {
          const val = rows[r][c];
          const key = name.replace(/[^a-zA-Z]/g, "");
          cofogTimeSeries[c - 1][key] = typeof val === "number" ? Math.round(val) : null;
        }
        // Latest (2023-24) value
        const latest = rows[r][5];
        if (typeof latest === "number") {
          cofogLatest.push({ name, value: Math.round(latest) });
        }
        break;
      }
    }
  }

  // Also get TME and accounting adjustments from 9.4a
  const rows4a = XLSX.utils.sheet_to_json(wb.Sheets["9.3a"], { header: 1 });
  let accAdj = null;
  for (let r = 0; r < rows4a.length; r++) {
    if (rows4a[r]?.[0] === "Accounting adjustments") {
      accAdj = Math.round(rows4a[r][5]);
      break;
    }
  }
  if (accAdj) {
    cofogLatest.push({ name: "Accounting adjustments", value: accAdj });
  }

  // Sort by value descending
  cofogLatest.sort((a, b) => b.value - a.value);

  return { cofogLatest, cofogTimeSeries };
}

async function main() {
  console.log("Downloading OBR Public Finances Databank...");
  const obrBuf = await download(OBR_URL);
  const { aggregates, pctGDP, receiptTypes } = parseOBR(obrBuf);
  console.log(`  → ${aggregates.length} fiscal years of aggregates`);
  console.log(`  → ${receiptTypes.length} receipt types`);

  console.log("\nDownloading PESA 2025 Chapter 9...");
  const pesaBuf = await download(PESA_CH9_URL);
  const { cofogLatest, cofogTimeSeries } = parsePESA(pesaBuf);
  console.log(`  → ${cofogLatest.length} COFOG functions`);

  const output = {
    meta: {
      sources: [
        {
          name: "OBR Public Finances Databank, February 2026",
          url: "https://obr.uk/data/",
          note: "Fiscal aggregates in £bn and % of GDP. Forecast years from 2025-26 consistent with OBR EFO November 2025.",
        },
        {
          name: "HM Treasury PESA 2025 — Country and Regional Analysis (Chapter 9)",
          url: "https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2025",
          note: "Total managed expenditure by COFOG function. 2023-24 outturn. Includes identifiable and non-identifiable spending.",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    aggregates,
    pctGDP,
    receiptTypes,
    cofogLatest,
    cofogTimeSeries,
  };

  writeFileSync("public/data/spending.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/spending.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
