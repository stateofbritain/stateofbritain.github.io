/**
 * fetch-productivity.js
 *
 * Downloads and parses:
 *  1. ONS Output per Hour Worked XLSX
 *     - Table_5: Output per hour index (2023=100), annual, 1971-2024
 *     - Table_6: Output per hour in £, annual, 1971-2024
 *     - Table_12: Output per hour in £ by SIC section, annual, 1997-2024
 *
 *  2. OECD Productivity Database (SDMX API)
 *     - GDP per hour worked, USD current PPPs, 2023 cross-section (~30 countries)
 *     - GDP per hour worked time series 2000-2023 for UK + key comparators
 *
 * Outputs: public/data/productivity.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import http from "http";
import XLSX from "xlsx";

const ONS_URL =
  "https://www.ons.gov.uk/file?uri=/economy/economicoutputandproductivity/productivitymeasures/datasets/outputperhourworkeduk/current/outputperhourworked.xlsx";

// OECD SDMX API endpoints
const OECD_BASE = "https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,";
const CROSS_SECTION_COUNTRIES = [
  "GBR", "USA", "DEU", "FRA", "JPN", "ITA", "CAN", "KOR", "POL", "IRL",
  "NLD", "SWE", "DNK", "NOR", "AUS", "CHE", "ISR", "ESP", "CZE", "BEL",
  "AUT", "FIN", "NZL", "SVN", "HUN", "TUR", "MEX", "CHL", "LVA", "LTU",
  "EST", "SVK", "PRT", "GRC", "OECD",
];
const TIME_SERIES_COUNTRIES = ["GBR", "USA", "DEU", "FRA", "JPN", "KOR", "POL", "IRL", "OECD"];

const OECD_CROSS_URL = `${OECD_BASE}/${CROSS_SECTION_COUNTRIES.join("+")}.A.GDPHRS._T.USD_PPP_H.V._Z._Z._Z?startPeriod=2023&endPeriod=2023`;
const OECD_TS_URL = `${OECD_BASE}/${TIME_SERIES_COUNTRIES.join("+")}.A.GDPHRS._T.USD_PPP_H.V._Z._Z._Z?startPeriod=2000&endPeriod=2023`;

const COUNTRY_NAMES = {
  GBR: "United Kingdom", USA: "United States", DEU: "Germany", FRA: "France",
  JPN: "Japan", ITA: "Italy", CAN: "Canada", KOR: "South Korea",
  POL: "Poland", IRL: "Ireland", NLD: "Netherlands", SWE: "Sweden",
  DNK: "Denmark", NOR: "Norway", AUS: "Australia", CHE: "Switzerland",
  ISR: "Israel", ESP: "Spain", CZE: "Czech Republic", BEL: "Belgium",
  AUT: "Austria", FIN: "Finland", NZL: "New Zealand", SVN: "Slovenia",
  HUN: "Hungary", TUR: "Turkey", MEX: "Mexico", CHL: "Chile",
  LVA: "Latvia", LTU: "Lithuania", EST: "Estonia", SVK: "Slovakia",
  PRT: "Portugal", GRC: "Greece", OECD: "OECD Average",
};

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      const mod = parsed.protocol === "http:" ? http : https;
      mod.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            "User-Agent": "StateOfBritain/1.0 (data fetch script)",
            Accept: "text/csv",
          },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
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

function parseONS(buf) {
  const wb = XLSX.read(buf);

  // ── Table_5: Output per hour index (2023=100) ──
  const rows5 = XLSX.utils.sheet_to_json(wb.Sheets["Table_5"], { header: 1 });
  // Find the header row (contains "Year" and numeric years)
  let hdrIdx5 = -1;
  for (let r = 0; r < Math.min(rows5.length, 20); r++) {
    if (String(rows5[r]?.[0] ?? "").toLowerCase().includes("year")) {
      hdrIdx5 = r;
      break;
    }
  }
  if (hdrIdx5 === -1) {
    // Fallback: find row with first column that's a 4-digit number
    for (let r = 0; r < Math.min(rows5.length, 20); r++) {
      const v = rows5[r]?.[0];
      if (typeof v === "number" && v >= 1970 && v <= 2030) {
        hdrIdx5 = r - 1;
        break;
      }
    }
  }

  const indexSeries = [];
  for (let r = hdrIdx5 + 1; r < rows5.length; r++) {
    const row = rows5[r];
    const year = typeof row?.[0] === "number" ? row[0] : parseInt(String(row?.[0]), 10);
    const val = row?.[1];
    if (year >= 1970 && year <= 2030 && typeof val === "number") {
      indexSeries.push({ year, index: Math.round(val * 100) / 100 });
    }
  }

  // ── Table_6: Output per hour in £ ──
  const rows6 = XLSX.utils.sheet_to_json(wb.Sheets["Table_6"], { header: 1 });
  let hdrIdx6 = -1;
  for (let r = 0; r < Math.min(rows6.length, 20); r++) {
    const v = rows6[r]?.[0];
    if (typeof v === "number" && v >= 1970 && v <= 2030) {
      hdrIdx6 = r;
      break;
    }
  }

  const levelSeries = [];
  for (let r = hdrIdx6; r < rows6.length; r++) {
    const row = rows6[r];
    const year = typeof row?.[0] === "number" ? row[0] : parseInt(String(row?.[0]), 10);
    const val = row?.[1];
    if (year >= 1970 && year <= 2030 && typeof val === "number") {
      levelSeries.push({ year, gbpPerHour: Math.round(val * 100) / 100 });
    }
  }

  // ── Table_12: Output per hour in £ by SIC section ──
  const rows12 = XLSX.utils.sheet_to_json(wb.Sheets["Table_12"], { header: 1 });
  // Header row has sector names in columns
  let hdrRow12 = null;
  let dataStart12 = 0;
  for (let r = 0; r < Math.min(rows12.length, 15); r++) {
    const cells = rows12[r];
    if (cells && cells.length > 3) {
      // Check if second+ cells contain sector names (strings)
      const hasYear = typeof cells[0] === "number" && cells[0] >= 1990;
      if (hasYear && !hdrRow12) {
        // Previous row might be header
        hdrRow12 = rows12[r - 1];
        dataStart12 = r;
        break;
      }
      // Or explicit header with text
      if (typeof cells[1] === "string" && cells[1].length > 3) {
        hdrRow12 = cells;
        dataStart12 = r + 1;
        break;
      }
    }
  }

  const sectors = [];
  if (hdrRow12) {
    for (let c = 1; c < hdrRow12.length; c++) {
      const name = String(hdrRow12[c] ?? "").trim();
      if (name) sectors.push({ col: c, name });
    }
  }

  // Get latest year data for sector breakdown
  const sectorBreakdown = [];
  if (sectors.length > 0) {
    // Find the last data row
    let lastDataRow = null;
    for (let r = dataStart12; r < rows12.length; r++) {
      const yr = rows12[r]?.[0];
      if (typeof yr === "number" && yr >= 1990 && yr <= 2030) {
        lastDataRow = rows12[r];
      }
    }
    if (lastDataRow) {
      for (const { col, name } of sectors) {
        const val = lastDataRow[col];
        if (typeof val === "number" && val > 0 && !name.toLowerCase().includes("whole")) {
          sectorBreakdown.push({
            sector: name,
            gbpPerHour: Math.round(val * 100) / 100,
          });
        }
      }
      sectorBreakdown.sort((a, b) => b.gbpPerHour - a.gbpPerHour);
    }
  }

  return { indexSeries, levelSeries, sectorBreakdown };
}

function parseOECDcsv(csvText) {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  // CSV header: DATAFLOW,REF_AREA,...,TIME_PERIOD,OBS_VALUE,...
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const countryCode = cols[1];
    const year = parseInt(cols[10], 10);
    const value = parseFloat(cols[11]);
    if (countryCode && !isNaN(year) && !isNaN(value)) {
      results.push({
        countryCode,
        country: COUNTRY_NAMES[countryCode] || countryCode,
        year,
        usdPPP: Math.round(value * 100) / 100,
      });
    }
  }
  return results;
}

async function main() {
  console.log("Downloading ONS Output per Hour Worked...");
  const onsBuf = await download(ONS_URL);
  const { indexSeries, levelSeries, sectorBreakdown } = parseONS(onsBuf);
  console.log(`  → ${indexSeries.length} years of index data`);
  console.log(`  → ${levelSeries.length} years of £/hour data`);
  console.log(`  → ${sectorBreakdown.length} sectors`);

  console.log("\nFetching OECD international comparison (2023)...");
  const crossBuf = await download(OECD_CROSS_URL);
  const crossData = parseOECDcsv(crossBuf.toString("utf8"));
  console.log(`  → ${crossData.length} countries`);

  // Sort by USD PPP descending
  crossData.sort((a, b) => b.usdPPP - a.usdPPP);

  console.log("\nFetching OECD time series (2000-2023)...");
  const tsBuf = await download(OECD_TS_URL);
  const tsRaw = parseOECDcsv(tsBuf.toString("utf8"));

  // Reorganise into { year, GBR, USA, DEU, FRA, JPN, KOR, POL, IRL, OECD }
  const tsMap = {};
  for (const row of tsRaw) {
    if (!tsMap[row.year]) tsMap[row.year] = { year: row.year };
    tsMap[row.year][row.countryCode] = row.usdPPP;
  }
  const timeSeries = Object.values(tsMap).sort((a, b) => a.year - b.year);
  console.log(`  → ${timeSeries.length} years of time series data`);

  const output = {
    meta: {
      sources: [
        {
          name: "ONS Output per hour worked, UK",
          url: "https://www.ons.gov.uk/economy/economicoutputandproductivity/productivitymeasures/datasets/outputperhourworkeduk",
          tables: "5 (index), 6 (£/hour), 12 (by sector)",
          published: "17 February 2026",
        },
        {
          name: "OECD Productivity Database — Productivity Levels",
          url: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_PDB%40DF_PDB_LV&df[ag]=OECD.SDD.TPS&df[vs]=1.0",
          measure: "GDP per hour worked, USD current PPPs",
          note: "Fetched via OECD SDMX REST API",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    indexSeries,
    levelSeries,
    sectorBreakdown,
    international: crossData,
    timeSeries,
  };

  writeFileSync("public/data/productivity.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/productivity.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
