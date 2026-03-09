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

// ─── Energy Security (curated) ────────────────────────────────────────
// Sources:
//   - DESNZ Gas storage data / National Gas Transmission
//   - DUKES Chapter 4 (gas), Chapter 3 (oil)
//   - Elexon / BMRS (interconnectors)
//   - National Grid ESO Electricity Capacity Report

// UK gas storage capacity and days of average demand
// Rough storage field (3.3 bcm) closed June 2017, partially reopened late 2022 (~0.8 bcm)
// Days = capacityBcm / (annualConsumptionBcm / 365)
const gasStorage = [
  { year: 2000, capacityBcm: 3.9, consumptionBcm: 95.2, daysOfDemand: 14.9 },
  { year: 2005, capacityBcm: 4.4, consumptionBcm: 95.8, daysOfDemand: 16.8 },
  { year: 2010, capacityBcm: 4.6, consumptionBcm: 93.8, daysOfDemand: 17.9 },
  { year: 2013, capacityBcm: 4.6, consumptionBcm: 82.0, daysOfDemand: 20.5 },
  { year: 2015, capacityBcm: 4.6, consumptionBcm: 76.4, daysOfDemand: 22.0 },
  { year: 2017, capacityBcm: 1.3, consumptionBcm: 80.2, daysOfDemand: 5.9 },
  { year: 2018, capacityBcm: 1.3, consumptionBcm: 79.0, daysOfDemand: 6.0 },
  { year: 2020, capacityBcm: 1.3, consumptionBcm: 72.1, daysOfDemand: 6.6 },
  { year: 2022, capacityBcm: 1.7, consumptionBcm: 73.5, daysOfDemand: 8.4 },
  { year: 2023, capacityBcm: 1.7, consumptionBcm: 69.8, daysOfDemand: 8.9 },
  { year: 2024, capacityBcm: 1.7, consumptionBcm: 68.5, daysOfDemand: 9.1 },
];

// International comparison — gas storage as days of average daily demand
// Source: Gas Infrastructure Europe (GIE) / IEA / national regulators
// Data as of winter 2024/25 storage season
const gasStorageIntl = [
  { country: "Austria", daysOfDemand: 117, asOf: "2024-25" },
  { country: "France", daysOfDemand: 103, asOf: "2024-25" },
  { country: "Germany", daysOfDemand: 89, asOf: "2024-25" },
  { country: "Italy", daysOfDemand: 80, asOf: "2024-25" },
  { country: "Netherlands", daysOfDemand: 45, asOf: "2024-25" },
  { country: "Spain", daysOfDemand: 42, asOf: "2024-25" },
  { country: "Poland", daysOfDemand: 35, asOf: "2024-25" },
  { country: "UK", daysOfDemand: 9, asOf: "2024-25" },
];
const gasStorageIntlAsOf = "Winter 2024/25";

// Import dependency by fuel (% of consumption met by net imports)
// Negative = net exporter
// Source: DUKES Chapters 3 (oil) and 4 (gas), BEIS Energy Trends (electricity)
const importsByFuel = [
  { year: 2000, gasPct: -5,  oilPct: -16, elecPct: 3 },
  { year: 2004, gasPct: 2,   oilPct: -8,  elecPct: 3 },
  { year: 2005, gasPct: 8,   oilPct: -2,  elecPct: 3 },
  { year: 2006, gasPct: 15,  oilPct: 3,   elecPct: 2 },
  { year: 2008, gasPct: 26,  oilPct: 13,  elecPct: 1 },
  { year: 2010, gasPct: 45,  oilPct: 30,  elecPct: 2 },
  { year: 2012, gasPct: 47,  oilPct: 38,  elecPct: 5 },
  { year: 2014, gasPct: 50,  oilPct: 40,  elecPct: 6 },
  { year: 2015, gasPct: 47,  oilPct: 43,  elecPct: 6 },
  { year: 2017, gasPct: 49,  oilPct: 44,  elecPct: 5 },
  { year: 2018, gasPct: 54,  oilPct: 45,  elecPct: 7 },
  { year: 2020, gasPct: 56,  oilPct: 44,  elecPct: 8 },
  { year: 2021, gasPct: 53,  oilPct: 41,  elecPct: 6 },
  { year: 2022, gasPct: 52,  oilPct: 37,  elecPct: 6 },
  { year: 2023, gasPct: 56,  oilPct: 43,  elecPct: 5 },
  { year: 2024, gasPct: 58,  oilPct: 46,  elecPct: 5 },
];

// Electricity interconnectors
// Source: Ofgem / National Grid ESO
const interconnectors = [
  { name: "IFA",       partner: "France",      capacityMw: 2000, yearOpened: 1986 },
  { name: "Moyle",     partner: "N. Ireland",  capacityMw: 500,  yearOpened: 2001 },
  { name: "BritNed",   partner: "Netherlands", capacityMw: 1000, yearOpened: 2011 },
  { name: "EWIC",      partner: "Ireland",     capacityMw: 500,  yearOpened: 2012 },
  { name: "Nemo Link", partner: "Belgium",     capacityMw: 1000, yearOpened: 2019 },
  { name: "IFA2",      partner: "France",      capacityMw: 1000, yearOpened: 2021 },
  { name: "NSL",       partner: "Norway",      capacityMw: 1400, yearOpened: 2021 },
  { name: "ElecLink",  partner: "France",      capacityMw: 1000, yearOpened: 2022 },
  { name: "Viking Link",partner: "Denmark",    capacityMw: 1400, yearOpened: 2023 },
];
const totalInterconnectorMw = interconnectors.reduce((s, ic) => s + ic.capacityMw, 0);

// De-rated capacity margin (% above peak demand)
// Source: National Grid ESO Electricity Capacity Report / Winter Outlook
const capacityMargin = [
  { year: 2010, marginPct: 14.0 },
  { year: 2012, marginPct: 9.0 },
  { year: 2014, marginPct: 4.1 },
  { year: 2015, marginPct: 5.1 },
  { year: 2016, marginPct: 6.6 },
  { year: 2017, marginPct: 7.3 },
  { year: 2018, marginPct: 8.3 },
  { year: 2019, marginPct: 7.4 },
  { year: 2020, marginPct: 8.2 },
  { year: 2021, marginPct: 4.2 },
  { year: 2022, marginPct: 3.7 },
  { year: 2023, marginPct: 7.4 },
  { year: 2024, marginPct: 5.9 },
];

const latestGasStorage = gasStorage[gasStorage.length - 1];
const latestImportsByFuel = importsByFuel[importsByFuel.length - 1];
const latestCapMargin = capacityMargin[capacityMargin.length - 1];

// ── National Gas live gas storage fill level ─────────────────────────
// Public SOAP API — no API key required
// PUBOBJ330: "Storage, Daily Aggregated Stock level, D+1" (kWh)
// Total working gas volume ~15.1 TWh (from AGSI historical / Ofgem)
const TOTAL_WORKING_GAS_TWH = 15.1; // approximate total UK storage capacity

async function fetchGasStorageFill() {
  try {
    console.log("  Fetching National Gas live storage data...");
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:pub="http://www.NationalGrid.com/MIPI/">
  <soap:Body>
    <pub:GetPublicationDataWM>
      <pub:reqObject>
        <pub:LatestFlag>N</pub:LatestFlag>
        <pub:ApplicableForFlag>Y</pub:ApplicableForFlag>
        <pub:ToDate>${to}</pub:ToDate>
        <pub:FromDate>${from}</pub:FromDate>
        <pub:DateType>GASDAY</pub:DateType>
        <pub:PublicationObjectNameList>
          <pub:string>Storage, Daily Aggregated Stock level, D+1</pub:string>
        </pub:PublicationObjectNameList>
      </pub:reqObject>
    </pub:GetPublicationDataWM>
  </soap:Body>
</soap:Envelope>`;

    const res = await fetch(
      "https://marketinformation.nationalgas.com/MIPIws-public/public/publicwebservice.asmx",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": "http://www.NationalGrid.com/MIPI/GetPublicationDataWM",
        },
        body: soapBody,
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    // Parse date+value pairs from SOAP XML
    const entries = [...xml.matchAll(
      /<ApplicableFor>(.*?)<\/ApplicableFor>.*?<Value>(.*?)<\/Value>/gs
    )].map((m) => ({
      date: m[1].slice(0, 10),
      kWh: parseFloat(m[2]),
    })).filter((e) => !isNaN(e.kWh));

    if (entries.length === 0) return null;

    const latest = entries[entries.length - 1];
    const gasInStorageTwh = +(latest.kWh / 1e9).toFixed(4);
    const fillPct = +(gasInStorageTwh / TOTAL_WORKING_GAS_TWH * 100).toFixed(1);
    const gasInStorageBcm = +(gasInStorageTwh / 10.55).toFixed(3);
    const daysAtCurrentFill = +(latestGasStorage.daysOfDemand * fillPct / 100).toFixed(1);

    const history = entries.map((e) => {
      const twh = e.kWh / 1e9;
      return {
        date: e.date,
        fillPct: +(twh / TOTAL_WORKING_GAS_TWH * 100).toFixed(1),
        gasInStorageTwh: +twh.toFixed(4),
      };
    });

    console.log(`  GB storage: ${fillPct}% full (${gasInStorageTwh} TWh / ${gasInStorageBcm} bcm) as of ${latest.date} — ${daysAtCurrentFill} days of demand`);
    return {
      fillPct,
      gasInStorageTwh,
      gasInStorageBcm,
      workingVolumeTwh: TOTAL_WORKING_GAS_TWH,
      daysAtCurrentFill,
      asOf: latest.date,
      history,
    };
  } catch (err) {
    console.log(`  National Gas fetch failed: ${err.message} — continuing without live data`);
    return null;
  }
}

function buildSecuritySnapshot(liveFill) {
  const snap = {
    gasStorageDays: latestGasStorage.daysOfDemand,
    gasStorageYear: latestGasStorage.year,
    gasImportPct: latestImportsByFuel.gasPct,
    oilImportPct: latestImportsByFuel.oilPct,
    elecImportPct: latestImportsByFuel.elecPct,
    importsByFuelYear: latestImportsByFuel.year,
    totalInterconnectorMw,
    capacityMarginPct: latestCapMargin.marginPct,
    capacityMarginYear: latestCapMargin.year,
  };
  if (liveFill) {
    snap.liveFillPct = liveFill.fillPct;
    snap.liveDaysOfDemand = liveFill.daysAtCurrentFill;
    snap.liveFillAsOf = liveFill.asOf;
  }
  return snap;
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

  // Fetch live gas storage fill level (optional, requires GIE_API_KEY)
  const liveFill = await fetchGasStorageFill();

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
    energySecurity: {
      snapshot: buildSecuritySnapshot(liveFill),
      gasStorage,
      gasStorageIntl,
      gasStorageIntlAsOf,
      importsByFuel,
      interconnectors,
      capacityMargin,
      liveFill,
    },
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
