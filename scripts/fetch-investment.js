/**
 * fetch-investment.js
 *
 * Downloads and parses:
 *  1. ONS Business Investment XLSX (cxnv.xlsx)
 *     - NPEK: Business Investment, current prices SA (£m), 1997-2025
 *     - NPEL: Business Investment, chained volume measure SA (£m)
 *     - NPQS: Total GFCF, current prices SA (£m), 1948-2025
 *     - NPQT: Total GFCF, CVM SA (£m)
 *     - RPZG: Government GFCF, current prices SA (£m)
 *     - TLPK: Intangible fixed assets, CP SA
 *     - TLPW: Plant & machinery, CP SA
 *     - TLPX: Transport equipment, CP SA
 *     - EQED: Buildings & structures, CP SA
 *
 *  2. OECD National Accounts GFCF as % GDP (SDMX API)
 *     - Cross-section: ~23 countries, latest year (2023)
 *     - Time series: UK + 7 comparators, 2000-2023
 *
 * Outputs: public/data/investment.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import http from "http";
import XLSX from "xlsx";

const ONS_URL =
  "https://www.ons.gov.uk/file?uri=/economy/grossdomesticproductgdp/datasets/businessinvestment/current/cxnv.xlsx";

// OECD SDMX — GFCF as % of GDP
const OECD_BASE = "https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NAAG@DF_NAAG_III,";
const CROSS_COUNTRIES = [
  "GBR", "USA", "DEU", "FRA", "JPN", "ITA", "CAN", "KOR", "POL",
  "NLD", "SWE", "DNK", "NOR", "AUS", "CHE", "ISR", "ESP", "CZE",
  "BEL", "AUT", "FIN", "NZL", "OECD",
];
const TS_COUNTRIES = ["GBR", "USA", "DEU", "FRA", "JPN", "KOR", "POL", "OECD"];

const OECD_CROSS_URL = `${OECD_BASE}/A.${CROSS_COUNTRIES.join("+")}.P51G.PT_B1GQ.NAAG_III?startPeriod=2023&endPeriod=2023`;
const OECD_TS_URL = `${OECD_BASE}/A.${TS_COUNTRIES.join("+")}.P51G.PT_B1GQ.NAAG_III?startPeriod=2000&endPeriod=2023`;

const COUNTRY_NAMES = {
  GBR: "United Kingdom", USA: "United States", DEU: "Germany", FRA: "France",
  JPN: "Japan", ITA: "Italy", CAN: "Canada", KOR: "South Korea",
  POL: "Poland", NLD: "Netherlands", SWE: "Sweden", DNK: "Denmark",
  NOR: "Norway", AUS: "Australia", CHE: "Switzerland", ISR: "Israel",
  ESP: "Spain", CZE: "Czech Republic", BEL: "Belgium", AUT: "Austria",
  FIN: "Finland", NZL: "New Zealand", OECD: "OECD Average",
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

// Column indices (by CDID code) in the ONS XLSX
const COLS = {
  NPEK: 300,  // Business Investment CP SA
  NPEL: 301,  // Business Investment CVM SA
  NPQS: 305,  // Total GFCF CP SA
  NPQT: 306,  // Total GFCF CVM SA
  RPZG: 308,  // Government GFCF CP SA
  TLPK: 309,  // Intangible fixed assets CP SA
  TLPW: 310,  // Plant & machinery CP SA
  TLPX: 311,  // Transport equipment CP SA
  EQED: 274,  // Buildings & structures CP SA
};

function parseONS(buf) {
  const wb = XLSX.read(buf);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["data"], { header: 1 });

  // Verify CDID codes match expected positions
  const cdids = rows[1];
  for (const [name, col] of Object.entries(COLS)) {
    if (cdids[col] !== name) {
      console.warn(`  Warning: expected ${name} at col ${col}, found ${cdids[col]}`);
    }
  }

  const ukTrend = [];
  const assetBreakdown = [];

  for (let r = 7; r < rows.length; r++) {
    const yearStr = rows[r][0];
    if (typeof yearStr !== "string" || !/^\d{4}$/.test(yearStr)) continue;
    const year = parseInt(yearStr, 10);

    const npqs = rows[r][COLS.NPQS];
    const npqt = rows[r][COLS.NPQT];
    if (typeof npqs !== "number" || npqs === 0) continue;

    const entry = { year, gfcfCP: npqs, gfcfCVM: npqt };

    // Business investment starts 1997
    const npek = rows[r][COLS.NPEK];
    const npel = rows[r][COLS.NPEL];
    if (typeof npek === "number" && npek > 0) {
      entry.biCP = npek;
      entry.biCVM = npel;
      entry.biSharePct = +(npek / npqs * 100).toFixed(1);
    }

    // Government GFCF
    const rpzg = rows[r][COLS.RPZG];
    if (typeof rpzg === "number" && rpzg > 0) {
      entry.govCP = rpzg;
    }

    ukTrend.push(entry);

    // Asset breakdown for years where data exists
    const tlpk = rows[r][COLS.TLPK];
    const tlpw = rows[r][COLS.TLPW];
    const tlpx = rows[r][COLS.TLPX];
    const eqed = rows[r][COLS.EQED];
    if (typeof tlpk === "number" && typeof tlpw === "number" && year >= 1997) {
      assetBreakdown.push({
        year,
        intangibles: Math.round(tlpk),
        plantMachinery: Math.round(tlpw),
        transport: Math.round(tlpx || 0),
        buildings: Math.round(eqed || 0),
        other: Math.round(npqs - (tlpk + tlpw + (tlpx || 0) + (eqed || 0))),
      });
    }
  }

  return { ukTrend, assetBreakdown };
}

function parseOECDcsv(csvText) {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    // Use proper CSV parsing for lines with commas in DATAFLOW field
    const match = lines[i].match(/^[^,]*,([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*)/);
    if (!match) continue;
    const countryCode = match[2];
    const year = parseInt(match[6], 10);
    const value = parseFloat(match[7]);
    if (countryCode && !isNaN(year) && !isNaN(value)) {
      results.push({
        countryCode,
        country: COUNTRY_NAMES[countryCode] || countryCode,
        year,
        pctGDP: Math.round(value * 10) / 10,
      });
    }
  }
  return results;
}

async function main() {
  console.log("Downloading ONS Business Investment...");
  const onsBuf = await download(ONS_URL);
  const { ukTrend, assetBreakdown } = parseONS(onsBuf);
  console.log(`  → ${ukTrend.length} years of UK investment data`);
  console.log(`  → ${assetBreakdown.length} years of asset breakdown`);

  console.log("\nFetching OECD GFCF/GDP cross-section (2023)...");
  const crossBuf = await download(OECD_CROSS_URL);
  const crossData = parseOECDcsv(crossBuf.toString("utf8"));
  crossData.sort((a, b) => b.pctGDP - a.pctGDP);
  console.log(`  → ${crossData.length} countries`);

  console.log("\nFetching OECD GFCF/GDP time series (2000-2023)...");
  const tsBuf = await download(OECD_TS_URL);
  const tsRaw = parseOECDcsv(tsBuf.toString("utf8"));
  const tsMap = {};
  for (const row of tsRaw) {
    if (!tsMap[row.year]) tsMap[row.year] = { year: row.year };
    tsMap[row.year][row.countryCode] = row.pctGDP;
  }
  const timeSeries = Object.values(tsMap).sort((a, b) => a.year - b.year);
  console.log(`  → ${timeSeries.length} years of time series`);

  const output = {
    meta: {
      sources: [
        {
          name: "ONS Business Investment, Q4 2024 revised results",
          url: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/businessinvestment",
          note: "GFCF and Business Investment, current prices and chained volume measure, seasonally adjusted.",
          published: "12 February 2026",
        },
        {
          name: "OECD National Accounts — Gross Fixed Capital Formation as % of GDP",
          url: "https://data-explorer.oecd.org/",
          note: "Dataflow DSD_NAAG@DF_NAAG_III, measure P51G, unit PT_B1GQ. Fetched via OECD SDMX REST API.",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    ukTrend,
    assetBreakdown,
    international: crossData,
    timeSeries,
  };

  writeFileSync("public/data/investment.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/investment.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
