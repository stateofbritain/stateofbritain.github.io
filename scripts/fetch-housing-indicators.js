/**
 * fetch-housing-indicators.js
 *
 * Downloads and parses two ODS files to add housing supply indicators:
 *
 *  1. EPC new build lodgements (England & Wales)
 *     - Source: MHCLG Energy Performance of Buildings Certificates, Table NB1
 *     - Quarterly new domestic property EPC lodgements
 *
 *  2. Brick deliveries (Great Britain)
 *     - Source: DESNZ Construction Building Materials monthly statistics
 *     - Monthly seasonally adjusted and total brick deliveries (millions)
 *
 * Merges new series into the existing public/data/housing-supply.json
 *
 * Outputs: public/data/housing-supply.json (sob-dataset-v1)
 */
import { readFileSync, writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import http from "http";
import XLSX from "xlsx";

const EPC_URL =
  "https://assets.publishing.service.gov.uk/media/697a11c41d8c53a85d6bd3c4/NB1-_New_Domestic_Properties.ods";

const BRICKS_URL =
  "https://assets.publishing.service.gov.uk/media/69a065fadb2401de164d6e0b/construction_building_materials_-_tables_february_2026.ods";

// ── Download helper (follows redirects) ──────────────────────────────
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

// ── Parse EPC new build lodgements ───────────────────────────────────
// Sheet: NB1_England_and_Wales
// Row 3 = header: Year, Quarter, Number Lodgements, Total Floor Area,
//                 A, B, C, D, E, F, G, Not Recorded
// Rows 5-21 = annual totals (2009-2025)
// Rows 22-90 = quarterly data (format "YYYY/Q")
function parseEPC(buf) {
  const wb = XLSX.read(buf);
  const sheetName = "NB1_England_and_Wales";
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    const available = wb.SheetNames.join(", ");
    throw new Error(
      `Sheet "${sheetName}" not found. Available: ${available}`
    );
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Log header row for debugging
  console.log("  EPC header (row 3):", rows[2]?.slice(0, 6));

  const quarterly = [];

  // Quarterly data starts at row index 21 (row 22 in 1-based)
  // Format: year column = YYYY, quarter column = Q number, lodgements column = count
  for (let r = 21; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;

    const yearVal = row[0];
    const quarterVal = row[1];
    const lodgements = row[2];

    // Quarter format in the spreadsheet is "YYYY/Q" in column A,
    // or year in col A and quarter in col B
    // Need to handle both possibilities
    let yearStr, qNum;

    if (typeof yearVal === "string" && yearVal.includes("/")) {
      // Combined format like "2024/4"
      const parts = yearVal.split("/");
      yearStr = parts[0].trim();
      qNum = parseInt(parts[1].trim(), 10);
    } else if (typeof quarterVal === "string" && quarterVal.includes("/")) {
      // Quarter in col B as "YYYY/Q"
      const parts = quarterVal.split("/");
      yearStr = parts[0].trim();
      qNum = parseInt(parts[1].trim(), 10);
    } else if (
      typeof yearVal === "number" &&
      typeof quarterVal === "number" &&
      quarterVal >= 1 &&
      quarterVal <= 4
    ) {
      // Numeric year and quarter
      yearStr = String(yearVal);
      qNum = quarterVal;
    } else if (
      typeof yearVal === "string" &&
      /^\d{4}$/.test(yearVal.trim()) &&
      typeof quarterVal === "number" &&
      quarterVal >= 1 &&
      quarterVal <= 4
    ) {
      yearStr = yearVal.trim();
      qNum = quarterVal;
    } else {
      // Skip non-data rows (e.g. annual totals, blank rows, notes)
      continue;
    }

    if (!yearStr || isNaN(qNum) || qNum < 1 || qNum > 4) continue;

    const numLodgements =
      typeof lodgements === "number" ? Math.round(lodgements) : null;
    if (numLodgements == null) continue;

    const quarter = `${yearStr}-Q${qNum}`;
    quarterly.push({ quarter, lodgements: numLodgements });
  }

  // Also extract annual totals from rows 4-20 (indices 4 to 20)
  const annual = [];
  for (let r = 4; r <= 20 && r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;

    const yearVal = row[0];
    const lodgements = row[2];

    let year;
    if (typeof yearVal === "number") {
      year = yearVal;
    } else if (typeof yearVal === "string" && /^\d{4}$/.test(yearVal.trim())) {
      year = parseInt(yearVal.trim(), 10);
    } else {
      continue;
    }

    if (typeof lodgements !== "number") continue;
    annual.push({ year, lodgements: Math.round(lodgements) });
  }

  return { quarterly, annual };
}

// ── Parse brick deliveries ───────────────────────────────────────────
// Sheet: 9a (monthly brick data for GB)
// Columns include Year, Month, then various metrics
// Column C (index 2) = seasonally adjusted deliveries
// We need to find the correct column indices by inspecting headers
function parseBricks(buf) {
  const wb = XLSX.read(buf);
  const sheetName = "9a";
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    const available = wb.SheetNames.join(", ");
    throw new Error(
      `Sheet "${sheetName}" not found. Available: ${available}`
    );
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Log first few rows for debugging
  console.log("  Bricks sheet 9a, first 10 rows:");
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    console.log(`    Row ${i}: ${JSON.stringify(rows[i]?.slice(0, 15))}`);
  }

  // Find the header row — look for a row where column A is "Year" and column B is "Month"
  let headerRow = -1;
  let saDeliveriesCol = 2; // default: column C (index 2)
  let totalDeliveriesCol = 10; // default: column K (index 10)

  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;
    const colA = String(row[0] || "").trim().toLowerCase();
    const colB = String(row[1] || "").trim().toLowerCase();
    if (colA === "year" && colB === "month") {
      headerRow = r;
      // Find column indices from header labels
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").toLowerCase();
        if (
          cell.includes("seasonally adjusted") &&
          cell.includes("deliveries")
        ) {
          saDeliveriesCol = c;
        }
        if (
          cell === "total deliveries" ||
          (cell.includes("total") &&
            cell.includes("deliveries") &&
            !cell.includes("seasonally") &&
            !cell.includes("stocks") &&
            !cell.includes("production"))
        ) {
          totalDeliveriesCol = c;
        }
      }
      console.log(
        `  Found header at row ${r}, SA deliveries col=${saDeliveriesCol}, total deliveries col=${totalDeliveriesCol}`
      );
      break;
    }
  }

  const monthly = [];
  const startRow = headerRow >= 0 ? headerRow + 1 : 5;

  // Month name to number mapping
  const monthMap = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  let currentYear = null;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;

    // Column A = Year (may only appear in first month of each year)
    // Column B = Month name
    const yearVal = row[0];
    const monthVal = row[1];

    if (typeof yearVal === "number" && yearVal >= 1900 && yearVal <= 2100) {
      currentYear = yearVal;
    } else if (
      typeof yearVal === "string" &&
      /^\d{4}$/.test(yearVal.trim())
    ) {
      currentYear = parseInt(yearVal.trim(), 10);
    }

    if (!currentYear) continue;

    // Parse month
    let monthNum;
    if (typeof monthVal === "string") {
      const key = monthVal.trim().toLowerCase();
      monthNum = monthMap[key];
    } else if (typeof monthVal === "number") {
      monthNum = String(monthVal).padStart(2, "0");
    }
    if (!monthNum) continue;

    const saVal = row[saDeliveriesCol];
    const totalVal =
      totalDeliveriesCol >= 0 ? row[totalDeliveriesCol] : null;

    const saDeliveries =
      typeof saVal === "number" ? Math.round(saVal) : null;
    const totalDeliveries =
      typeof totalVal === "number" ? Math.round(totalVal) : null;

    if (saDeliveries == null && totalDeliveries == null) continue;

    const month = `${currentYear}-${monthNum}`;
    const entry = { month };
    if (saDeliveries != null) entry.saDeliveries = saDeliveries;
    if (totalDeliveries != null) entry.totalDeliveries = totalDeliveries;
    monthly.push(entry);
  }

  return monthly;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  // Read existing housing-supply.json
  const existingPath = "public/data/housing-supply.json";
  let existing;
  try {
    existing = JSON.parse(readFileSync(existingPath, "utf-8"));
    console.log("Read existing housing-supply.json");
  } catch (err) {
    console.error(`Could not read ${existingPath}: ${err.message}`);
    process.exit(1);
  }

  // Download EPC data
  console.log("\nDownloading EPC new build lodgements...");
  const epcBuf = await download(EPC_URL);
  console.log(`  Downloaded ${(epcBuf.length / 1024).toFixed(0)} KB`);
  const { quarterly: epcQuarterly, annual: epcAnnual } = parseEPC(epcBuf);
  console.log(
    `  → ${epcQuarterly.length} quarterly data points, ${epcAnnual.length} annual totals`
  );

  // Download bricks data
  console.log("\nDownloading brick deliveries data...");
  const bricksBuf = await download(BRICKS_URL);
  console.log(`  Downloaded ${(bricksBuf.length / 1024).toFixed(0)} KB`);
  const brickMonthly = parseBricks(bricksBuf);
  console.log(`  → ${brickMonthly.length} monthly data points`);

  // Add new sources (avoid duplicates)
  const existingSourceIds = new Set(existing.sources.map((s) => s.id));

  if (!existingSourceIds.has("mhclg-epc-nb1")) {
    existing.sources.push({
      id: "mhclg-epc-nb1",
      name: "MHCLG Energy Performance of Buildings Certificates: Table NB1, new domestic properties",
      url: "https://www.gov.uk/government/statistical-data-sets/live-tables-on-energy-performance-of-buildings-certificates",
      publisher: "MHCLG",
      note: "Quarterly EPC lodgements for new build domestic properties, England and Wales",
    });
  }

  if (!existingSourceIds.has("desnz-bricks")) {
    existing.sources.push({
      id: "desnz-bricks",
      name: "DESNZ Construction Building Materials: Table 9a, bricks monthly",
      url: "https://www.gov.uk/government/statistical-data-sets/building-materials-and-components-monthly-statistics-2012",
      publisher: "DESNZ",
      note: "Monthly brick production, deliveries, and stocks for Great Britain (millions of bricks)",
    });
  }

  // Add new series
  existing.series.epcNewBuilds = {
    sourceId: "mhclg-epc-nb1",
    label: "New Build EPC Lodgements",
    unit: "lodgements per quarter",
    timeField: "quarter",
    data: epcQuarterly,
  };

  existing.series.brickDeliveries = {
    sourceId: "desnz-bricks",
    label: "Brick Deliveries (Seasonally Adjusted)",
    unit: "millions of bricks",
    timeField: "month",
    data: brickMonthly,
  };

  // Update snapshot with latest values
  if (epcQuarterly.length > 0) {
    const latestEpc = epcQuarterly[epcQuarterly.length - 1];
    existing.snapshot.epcNewBuildLodgements = latestEpc.lodgements;
    existing.snapshot.epcNewBuildLodgementsQuarter = latestEpc.quarter;
  }

  if (brickMonthly.length > 0) {
    const latestBrick = brickMonthly[brickMonthly.length - 1];
    if (latestBrick.saDeliveries != null) {
      existing.snapshot.brickDeliveriesSA = latestBrick.saDeliveries;
      existing.snapshot.brickDeliveriesMonth = latestBrick.month;
    }
  }

  // Update generated date
  existing.generated = new Date().toISOString().slice(0, 10);

  // Write output
  writeFileSync(existingPath, JSON.stringify(existing, null, 2));
  console.log(`\n✓ Written ${existingPath}`);
  console.log(
    `  EPC: ${epcQuarterly.length} quarterly points` +
      (epcQuarterly.length > 0
        ? ` (${epcQuarterly[0].quarter} to ${epcQuarterly[epcQuarterly.length - 1].quarter})`
        : "")
  );
  console.log(
    `  Bricks: ${brickMonthly.length} monthly points` +
      (brickMonthly.length > 0
        ? ` (${brickMonthly[0].month} to ${brickMonthly[brickMonthly.length - 1].month})`
        : "")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
