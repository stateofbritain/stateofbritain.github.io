/**
 * fetch-energy.js
 *
 * Downloads DESNZ/DUKES energy statistics (Excel) and outputs
 * public/data/energy.json for the Energy page.
 *
 * Sources:
 *   - DUKES 1.1.1 — Inland consumption of primary fuels (mtoe + % shares)
 *   - DUKES 5.1.3 — Electricity generated and supplied (GWh)
 *   - DUKES 1.1.6 — Energy expenditure by final user (£m)
 *   - DUKES 1.1.2 — Availability and consumption (production + imports)
 *
 * Run: node scripts/fetch-energy.js
 */

import XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const URLS = {
  consumption: "https://assets.publishing.service.gov.uk/media/6889eafc76f68cc8414d5b55/DUKES_1.1.1.xlsx",
  electricity: "https://assets.publishing.service.gov.uk/media/688a29918b3a37b63e739065/DUKES_5.1.3.xlsx",
  expenditure: "https://assets.publishing.service.gov.uk/media/6889eb3de1a850d72c4091dc/DUKES_1.1.6.xlsx",
  availability: "https://assets.publishing.service.gov.uk/media/6889eb088b3a37b63e738fe2/DUKES_1.1.2.xlsx",
};

async function fetchXLSX(url) {
  console.log(`  Fetching ${url.split("/").pop()}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf);
}

function sheetRows(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in [${wb.SheetNames}]`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

// ─── Energy Mix (% shares) ───────────────────────────────────────────
function parseEnergyMix(wb) {
  const rows = sheetRows(wb, "1.1.1.C");
  // Row 6 = header (years), rows 7-14 = fuel categories
  const headerRow = rows[6];
  const fuelRows = {
    coal: rows[7],
    petroleum: rows[8],
    gas: rows[9],
    nuclear: rows[10],
    renewables: rows[11], // "Wind, solar and hydro"
    imports: rows[12],    // "Net electricity imports"
    bioenergy: rows[13],  // "Bioenergy and waste"
  };

  const series = [];
  for (let col = 1; col < headerRow.length; col++) {
    const year = headerRow[col];
    if (typeof year !== "number" && typeof year !== "string") continue;
    const yr = parseInt(year);
    if (isNaN(yr) || yr < 1990) continue;

    const point = { year: yr };
    for (const [key, row] of Object.entries(fuelRows)) {
      const val = row[col];
      point[key] = typeof val === "number" ? Math.round(val * 10) / 10 : 0;
    }
    series.push(point);
  }
  return series;
}

// ─── Primary fuel consumption (mtoe) ─────────────────────────────────
function parseFuelConsumption(wb) {
  const rows = sheetRows(wb, "1.1.1.B");
  const headerRow = rows[6];
  const fuelRows = {
    coal: rows[7],
    petroleum: rows[8],
    gas: rows[9],
    nuclear: rows[10],
    renewables: rows[11],
    imports: rows[12],
    bioenergy: rows[13],
    total: rows[14],
  };

  const series = [];
  for (let col = 1; col < headerRow.length; col++) {
    const yr = parseInt(headerRow[col]);
    if (isNaN(yr) || yr < 1990) continue;

    const point = { year: yr };
    for (const [key, row] of Object.entries(fuelRows)) {
      const val = row[col];
      point[key] = typeof val === "number" ? Math.round(val * 100) / 100 : 0;
    }
    series.push(point);
  }
  return series;
}

// ─── Electricity generation by fuel (GWh, all generators) ────────────
function parseElectricity(wb) {
  const rows = sheetRows(wb, "5.1.3");
  // Header at row 5, data starts at row 6
  // Columns: 0=Year, 19=conv thermal (all), 20=CCGT, 21=nuclear, 22=non-thermal renewables,
  //          23=pumped storage, 24=battery, 25=total net
  const series = [];
  for (let i = 6; i < rows.length; i++) {
    const yr = rows[i][0];
    if (typeof yr !== "number" || yr < 1990) continue;

    series.push({
      year: yr,
      convThermal: round(rows[i][19]),
      ccgt: round(rows[i][20]),
      nuclear: round(rows[i][21]),
      renewables: round(rows[i][22]),
      pumpedStorage: round(rows[i][23]),
      battery: round(rows[i][24]),
      totalNet: round(rows[i][25]),
    });
  }
  return series;
}

// ─── Household energy spend (£m) ─────────────────────────────────────
function parseExpenditure(wb) {
  const rows = sheetRows(wb, "1.1.6");
  // Header at row 5:
  //   0=Year, 6=Total Industry, 12=Total Domestic, 19=Total Other, 25=Total All
  //   Domestic breakdown: 7=coal, 8=gas, 9=electricity, 10=petroleum, 11=heat/other
  const series = [];
  for (let i = 6; i < rows.length; i++) {
    const yr = rows[i][0];
    if (typeof yr !== "number" || yr < 1990) continue;

    series.push({
      year: yr,
      domesticGas: numOrZero(rows[i][8]),
      domesticElectricity: numOrZero(rows[i][9]),
      domesticTotal: numOrZero(rows[i][12]),
      industryTotal: numOrZero(rows[i][6]),
      allTotal: numOrZero(rows[i][25]),
    });
  }
  return series;
}

// ─── Import dependency (production vs consumption) ───────────────────
function parseImportDependency(wb) {
  const rows = sheetRows(wb, "1.1.2");
  // Header at row 5:
  //   0=Year, 5=Total Production, 10=Total Imports, 27=Total Consumption
  // But column layout is wide — let me find the right cols
  const header = rows[5];
  let prodCol = -1, totalCol = -1;
  for (let c = 0; c < header.length; c++) {
    const h = String(header[c]).toLowerCase();
    if (h.includes("total production")) prodCol = c;
    if (h.includes("total") && h.includes("inland consumption")) totalCol = c;
  }

  // Fallback: col 5 = Total Production, last col area ~ col 27
  if (prodCol === -1) prodCol = 5;
  if (totalCol === -1) totalCol = header.length - 1;

  const series = [];
  for (let i = 6; i < rows.length; i++) {
    const yr = rows[i][0];
    if (typeof yr !== "number" || yr < 1990) continue;

    const production = numOrZero(rows[i][prodCol]);
    const consumption = numOrZero(rows[i][totalCol]);
    const importDep = consumption > 0
      ? Math.round(((consumption - production) / consumption) * 1000) / 10
      : 0;

    series.push({ year: yr, production, consumption, importDependency: importDep });
  }
  return series;
}

function round(v) {
  return typeof v === "number" ? Math.round(v) : 0;
}

function numOrZero(v) {
  return typeof v === "number" ? Math.round(v) : 0;
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching DESNZ/DUKES energy data...\n");

  const [consumptionWb, electricityWb, expenditureWb, availabilityWb] =
    await Promise.all([
      fetchXLSX(URLS.consumption),
      fetchXLSX(URLS.electricity),
      fetchXLSX(URLS.expenditure),
      fetchXLSX(URLS.availability),
    ]);

  const energyMix = parseEnergyMix(consumptionWb);
  const fuelConsumption = parseFuelConsumption(consumptionWb);
  const electricity = parseElectricity(electricityWb);
  const expenditure = parseExpenditure(expenditureWb);
  const importDependency = parseImportDependency(availabilityWb);

  const output = {
    meta: {
      source: "Department for Energy Security and Net Zero (DESNZ)",
      publication: "Digest of UK Energy Statistics (DUKES) 2025",
      url: "https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes",
      fetched: new Date().toISOString().slice(0, 10),
    },
    energyMix,
    fuelConsumption,
    electricity,
    expenditure,
    importDependency,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "energy.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`  energyMix: ${energyMix.length} years`);
  console.log(`  fuelConsumption: ${fuelConsumption.length} years`);
  console.log(`  electricity: ${electricity.length} years`);
  console.log(`  expenditure: ${expenditure.length} years`);
  console.log(`  importDependency: ${importDependency.length} years`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
