/**
 * fetch-environment.js
 *
 * Downloads and parses:
 *  1. DESNZ provisional GHG emissions XLSX (Table 1a, 1990-2024)
 *  2. DEFRA PM2.5 annual mean CSV (Urban Background)
 *  3. DEFRA NO2 annual mean CSV (Urban Background)
 *  4. DfT VEH0171 ODS — ULEV new registrations (UK annual totals)
 *
 * Outputs: public/data/environment.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import XLSX from "xlsx";

const GHG_URL =
  "https://assets.publishing.service.gov.uk/media/67e404ac2621ba30ed977687/2024-provisional-greenhouse-gas-emissions-statistics-data-tables__1_.xlsx";
const PM25_URL =
  "https://assets.publishing.service.gov.uk/media/685bb7e2e9509f1a908eb179/fig06_pm25_annual.csv";
const NO2_URL =
  "https://assets.publishing.service.gov.uk/media/685bb6da454906840a44d664/fig01_nitrogen_dioxide_annual.csv";
const ULEV_URL =
  "https://assets.publishing.service.gov.uk/media/696641a496e60a090ce20006/veh0171.ods";

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
    get(url);
  });
}

// ── GHG emissions ──────────────────────────────────────────────────
function parseGHG(buf) {
  const wb = XLSX.read(buf);
  const ws = wb.Sheets["1a_GHG"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const headerRow = rows[5]; // ["TES sector", "1990", "1991", ...]
  const years = [];
  for (let c = 1; c < headerRow.length; c++) {
    const y = String(headerRow[c]).replace(/\s*\[.*\]/, "").trim();
    years.push(parseInt(y, 10));
  }

  // Sector rows we want (unadjusted)
  const sectorMap = {
    "Electricity supply": "electricity",
    "Fuel supply": "fuel",
    "Domestic transport": "transport",
    "Buildings and product uses": "buildings",
    Industry: "industry",
    Agriculture: "agriculture",
    Waste: "waste",
    "Land use, land use change and forestry": "lulucf",
    "Total greenhouse gas emissions": "total",
  };

  const series = {};
  for (let r = 6; r < rows.length; r++) {
    const label = String(rows[r]?.[0] ?? "").trim();
    if (label === "Temperature adjusted emissions:") break; // stop at temp-adjusted section
    const key = sectorMap[label];
    if (!key) continue;
    series[key] = [];
    for (let c = 0; c < years.length; c++) {
      const val = rows[r][c + 1];
      series[key].push(
        typeof val === "number" ? Math.round(val * 10) / 10 : null
      );
    }
  }

  // Build array of { year, total, electricity, transport, ... }
  return years.map((year, i) => {
    const obj = { year };
    for (const [key, arr] of Object.entries(series)) {
      obj[key] = arr[i];
    }
    return obj;
  });
}

// ── Air quality CSV ────────────────────────────────────────────────
function parseAirQualityCSV(text, siteType) {
  const lines = text.replace(/^\uFEFF/, "").split("\n");
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts[0]?.trim() !== siteType) continue;
    const year = parseInt(parts[1], 10);
    const mean = parseFloat(parts[2]);
    if (!isNaN(year) && !isNaN(mean)) {
      results.push({ year, mean: Math.round(mean * 100) / 100 });
    }
  }
  return results.sort((a, b) => a.year - b.year);
}

// ── ULEV registrations ────────────────────────────────────────────
function parseULEV(buf) {
  const wb = XLSX.read(buf);
  const ws = wb.Sheets["VEH0171a_Fuel"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const results = [];
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (
      row[0] === "United Kingdom" &&
      row[1] === "Annual" &&
      row[4] === "Total"
    ) {
      const year = parseInt(String(row[2]), 10);
      const bev = row[5] || 0;
      const phev = (row[6] || 0) + (row[7] || 0);
      const other = (row[8] || 0) + (row[9] || 0) + (row[10] || 0) + (row[11] || 0);
      results.push({
        year,
        bev,
        phev,
        other,
        total: bev + phev + other,
      });
    }
  }
  return results.sort((a, b) => a.year - b.year);
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log("Downloading GHG emissions...");
  const ghgBuf = await download(GHG_URL);
  const ghg = parseGHG(ghgBuf);
  console.log(`  → ${ghg.length} years (${ghg[0].year}-${ghg[ghg.length - 1].year})`);

  console.log("Downloading PM2.5 data...");
  const pm25Text = (await download(PM25_URL)).toString("utf-8");
  const pm25 = parseAirQualityCSV(pm25Text, "Urban Background");
  console.log(`  → ${pm25.length} years (${pm25[0].year}-${pm25[pm25.length - 1].year})`);

  console.log("Downloading NO2 data...");
  const no2Text = (await download(NO2_URL)).toString("utf-8");
  const no2 = parseAirQualityCSV(no2Text, "Urban Background");
  console.log(`  → ${no2.length} years (${no2[0].year}-${no2[no2.length - 1].year})`);

  console.log("Downloading ULEV registrations...");
  const ulevBuf = await download(ULEV_URL);
  const ulev = parseULEV(ulevBuf);
  console.log(`  → ${ulev.length} years (${ulev[0].year}-${ulev[ulev.length - 1].year})`);

  const output = {
    meta: {
      sources: [
        {
          name: "DESNZ Provisional GHG Emissions Statistics 2024",
          url: "https://www.gov.uk/government/statistics/provisional-uk-greenhouse-gas-emissions-national-statistics-2024",
        },
        {
          name: "DEFRA Air Quality Statistics — PM2.5",
          url: "https://www.gov.uk/government/statistics/air-quality-statistics",
        },
        {
          name: "DEFRA Air Quality Statistics — NO2",
          url: "https://www.gov.uk/government/statistics/air-quality-statistics",
        },
        {
          name: "DfT Vehicle Licensing Statistics — VEH0171",
          url: "https://www.gov.uk/government/statistical-data-sets/vehicle-licensing-statistics-data-tables",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    ghgEmissions: ghg,
    pm25: pm25,
    no2: no2,
    ulevRegistrations: ulev,
  };

  writeFileSync("public/data/environment.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/environment.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
