/**
 * fetch-startups.js
 *
 * Downloads and parses:
 *  1. ONS Business Demography XLSX — births, deaths, active enterprises
 *     (Tables 1.1a-d, 2.1a-d, 3.1a-d: UK row from geographic breakdowns)
 *  2. Survival rates (Table 4.1)
 *  3. Births by SIC section (Table 1.2)
 *  4. High-growth enterprises (Table 7.2)
 *
 * Also embeds curated VC/equity data from published British Business Bank
 * Small Business Equity Tracker reports (not available as downloadable dataset).
 *
 * Outputs: public/data/startups.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import XLSX from "xlsx";

const BIZ_DEMOG_URL =
  "https://www.ons.gov.uk/file?uri=/businessindustryandtrade/business/activitysizeandlocation/datasets/businessdemographyreferencetable/current/businessdemographyexceltables2024.xlsx";

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (data fetch script)" },
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

/**
 * Extract UK total from a geographic sheet.
 * Row 3 = header [null, null, year1, year2, ...], Row 4 = UK total.
 * Returns array of { year, value } objects.
 */
function extractUKTotals(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const headerRow = rows[3];
  const ukRow = rows[4];
  if (!headerRow || !ukRow) return [];
  const results = [];
  for (let c = 2; c < headerRow.length; c++) {
    const yr = parseInt(String(headerRow[c]).replace(/"/g, "").trim(), 10);
    if (yr >= 2000 && yr <= 2030 && typeof ukRow[c] === "number") {
      results.push({ year: yr, value: ukRow[c] });
    }
  }
  return results;
}

function parseDemography(buf) {
  const wb = XLSX.read(buf);

  // ── Births, Deaths, Active: UK totals from Tables 1.1a-d, 2.1a-d, 3.1a-d ──
  const birthEntries = [
    ...extractUKTotals(wb, "Table 1.1a"),
    ...extractUKTotals(wb, "Table 1.1b"),
    ...extractUKTotals(wb, "Table 1.1c"),
    ...extractUKTotals(wb, "Table 1.1d"),
  ];
  const deathEntries = [
    ...extractUKTotals(wb, "Table 2.1a"),
    ...extractUKTotals(wb, "Table 2.1b"),
    ...extractUKTotals(wb, "Table 2.1c"),
    ...extractUKTotals(wb, "Table 2.1d"),
  ];
  const activeEntries = [
    ...extractUKTotals(wb, "Table 3.1a"),
    ...extractUKTotals(wb, "Table 3.1b"),
    ...extractUKTotals(wb, "Table 3.1c"),
    ...extractUKTotals(wb, "Table 3.1d"),
  ];

  // Merge into year-keyed demography array
  const yearMap = {};
  for (const { year, value } of birthEntries) {
    if (!yearMap[year]) yearMap[year] = { year };
    yearMap[year].births = value;
  }
  for (const { year, value } of deathEntries) {
    if (!yearMap[year]) yearMap[year] = { year };
    yearMap[year].deaths = value;
  }
  for (const { year, value } of activeEntries) {
    if (!yearMap[year]) yearMap[year] = { year };
    yearMap[year].active = value;
  }
  const demography = Object.values(yearMap).sort((a, b) => a.year - b.year);

  // ── High-growth enterprises: Table 7.2 total row ──
  let highGrowth = [];
  const ws72 = wb.Sheets["Table 7.2"];
  if (ws72) {
    const rows72 = XLSX.utils.sheet_to_json(ws72, { header: 1 });
    const hdr72 = rows72[3]; // [null, 2019, 2020, ...]
    // Find "Total" row
    for (let r = rows72.length - 1; r >= 0; r--) {
      if (String(rows72[r]?.[0] ?? "").toLowerCase().includes("total")) {
        for (let c = 1; c < hdr72.length; c++) {
          const yr = parseInt(String(hdr72[c]).replace(/"/g, "").trim(), 10);
          const val = rows72[r][c];
          if (yr >= 2000 && typeof val === "number") {
            highGrowth.push({ year: yr, count: val });
          }
        }
        break;
      }
    }
    highGrowth.sort((a, b) => a.year - b.year);
  }

  // ── Table 4.1 — Survival rates by cohort (Total row per cohort year) ──
  const survival = [];
  const ws4 = wb.Sheets["Table 4.1"];
  if (ws4) {
    const rows4 = XLSX.utils.sheet_to_json(ws4, { header: 1 });
    // Header at row 3: [null, "Births", "1-year survival", "1-year per cent", ...]
    const hdr4 = rows4[3];

    // Find column indices for percent columns
    const pctCols = {};
    for (let c = 0; c < hdr4.length; c++) {
      const h = String(hdr4[c] ?? "").toLowerCase();
      if (h.includes("1-year") && h.includes("per cent")) pctCols.yr1 = c;
      if (h.includes("2-year") && h.includes("per cent")) pctCols.yr2 = c;
      if (h.includes("3-year") && h.includes("per cent")) pctCols.yr3 = c;
      if (h.includes("4-year") && h.includes("per cent")) pctCols.yr4 = c;
      if (h.includes("5-year") && h.includes("per cent")) pctCols.yr5 = c;
    }

    // Find "Total" rows for each cohort year
    let currentCohort = null;
    for (let r = 4; r < rows4.length; r++) {
      const row = rows4[r];
      const col0 = String(row?.[0] ?? "").trim();
      // Cohort year markers are standalone numbers
      const yr = parseInt(col0, 10);
      if (yr >= 2000 && yr <= 2030 && col0.length === 4) {
        currentCohort = yr;
        continue;
      }
      if (col0.toLowerCase() === "total" && currentCohort) {
        const entry = { cohort: currentCohort };
        for (const [key, col] of Object.entries(pctCols)) {
          const val = row[col];
          if (typeof val === "number") entry[key] = Math.round(val * 10) / 10;
        }
        if (entry.yr1 !== undefined) survival.push(entry);
        currentCohort = null;
      }
    }
  }

  // ── Table 1.2 — Births by SIC section ──
  // This has fine-grained 3-digit SIC codes. We want broad SIC sections.
  // Broad sections start with 2-digit codes at the start of the label.
  let sectorBreakdown = [];
  const ws12 = wb.Sheets["Table 1.2"];
  if (ws12) {
    const rows12 = XLSX.utils.sheet_to_json(ws12, { header: 1 });
    const hdr12 = rows12[3]; // [null, 2019, "2020", 2021, 2022, "2023", 2024]

    // Find 2024 column
    let col2024 = -1;
    for (let c = 0; c < hdr12.length; c++) {
      if (parseInt(String(hdr12[c]).replace(/"/g, "").trim(), 10) === 2024) {
        col2024 = c;
      }
    }

    if (col2024 >= 0) {
      // Aggregate sub-sectors into broad SIC divisions (2-digit level)
      // Only take rows that start with a 2-digit code (not indented sub-categories)
      for (let r = 4; r < rows12.length; r++) {
        const label = String(rows12[r]?.[0] ?? "").trim();
        // Broad sectors start without leading spaces and have "NN :" format
        if (label.startsWith("    ")) continue; // skip sub-categories
        if (!label.match(/^\d{2}\s*:/)) continue;
        const val = rows12[r][col2024];
        if (typeof val === "number" && val > 0) {
          // Clean up sector name
          const name = label.replace(/^\d{2}\s*:\s*/, "").trim();
          sectorBreakdown.push({ sector: name, births: val });
        }
      }
      sectorBreakdown.sort((a, b) => b.births - a.births);
      // Keep top 15 + "Other"
      if (sectorBreakdown.length > 15) {
        const top = sectorBreakdown.slice(0, 15);
        const otherTotal = sectorBreakdown.slice(15).reduce((s, r) => s + r.births, 0);
        top.push({ sector: "Other", births: otherTotal });
        sectorBreakdown = top;
      }
    }
  }

  return { demography, survival, sectorBreakdown, highGrowth };
}

// ── Curated equity data ───────────────────────────────────────────
// Source: British Business Bank Small Business Equity Tracker (editions 2016–2025)
// https://www.british-business-bank.co.uk/research
// Figures are UK announced equity deals into SMEs from Beauhurst data as reported by BBB.
// All values in £bn.
const EQUITY_DATA = [
  { year: 2015, total: 3.5, deals: 1270 },
  { year: 2016, total: 3.4, deals: 1041 },
  { year: 2017, total: 6.4 },
  { year: 2018, total: 6.7 },
  { year: 2019, total: 8.5, deals: 1832 },
  { year: 2020, total: 8.8 },
  { year: 2021, total: 18.1, deals: 2616 },
  { year: 2022, total: 16.7, deals: 2702 },
  { year: 2023, total: 8.7, deals: 2152 },
  { year: 2024, total: 10.8, deals: 2048 },
];

async function main() {
  console.log("Downloading ONS Business Demography...");
  const buf = await download(BIZ_DEMOG_URL);
  const { demography, survival, sectorBreakdown, highGrowth } = parseDemography(buf);
  console.log(`  → ${demography.length} years of demography (${demography[0].year}-${demography[demography.length - 1].year})`);
  console.log(`  → ${survival.length} cohort survival rows`);
  console.log(`  → ${sectorBreakdown.length} sector breakdown rows`);
  console.log(`  → ${highGrowth.length} high-growth enterprise years`);

  const output = {
    meta: {
      sources: [
        {
          name: "ONS Business Demography, UK 2024",
          url: "https://www.ons.gov.uk/businessindustryandtrade/business/activitysizeandlocation/datasets/businessdemographyreferencetable",
          tables: "1.1a-d, 2.1a-d, 3.1a-d (UK totals), 1.2 (births by SIC), 4.1 (survival), 7.2 (high-growth)",
        },
        {
          name: "British Business Bank Small Business Equity Tracker (editions 2016–2025)",
          url: "https://www.british-business-bank.co.uk/about-research-and-publications/small-business-equity-tracker-2025",
          note: "UK announced equity deals into SMEs from Beauhurst data",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    demography,
    survival,
    sectorBreakdown,
    highGrowth,
    equity: EQUITY_DATA,
  };

  writeFileSync("public/data/startups.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/startups.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
