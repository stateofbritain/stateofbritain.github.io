/**
 * fetch-research.js
 *
 * Downloads and parses:
 *  1. ONS GERD Official Statistics 2023 XLSX
 *     - Table 3: R&D by sector of funding (current + constant prices, 2018-2023)
 *     - Table 6: Total R&D and % of GDP (2018-2023)
 *     - Table 5: Regional breakdown (2022-2023)
 *
 *  2. Curated G7 + international R&D/GDP comparison from World Bank / OECD MSTI
 *
 * Outputs: public/data/research.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import XLSX from "xlsx";

const GERD_URL =
  "https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/researchanddevelopmentexpenditure/datasets/ukgrossdomesticexpenditureonresearchanddevelopment2021designatedasofficialstatistics/2023/gerdofficial2023.xlsx";

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

function parseGERD(buf) {
  const wb = XLSX.read(buf);

  // ── Table 3: R&D by sector of funding ──
  // Row 9: header [label, 2018, 2019, 2020, 2021, 2022, 2023]
  // Row 10: Total
  // Row 11-17: sector breakdown
  const rows3 = XLSX.utils.sheet_to_json(wb.Sheets["3"], { header: 1 });
  const hdr3 = rows3[9]; // ["Sector funding the R&D", 2018, 2019, ...]
  const years = [];
  for (let c = 1; c < hdr3.length; c++) {
    const yr = parseInt(String(hdr3[c]), 10);
    if (yr >= 2000) years.push({ col: c, year: yr });
  }

  // Extract named rows (current prices, rows 10-17)
  const sectorLabels = {
    10: "total",
    11: "government",
    12: "ukri",
    13: "hefce",
    14: "higherEducation",
    15: "business",
    16: "privateNonProfit",
    17: "overseas",
  };

  const bySector = [];
  for (const { col, year } of years) {
    const entry = { year };
    for (const [rowIdx, key] of Object.entries(sectorLabels)) {
      const val = rows3[parseInt(rowIdx)]?.[col];
      if (typeof val === "number") entry[key] = val;
    }
    bySector.push(entry);
  }

  // Constant prices (rows 21-28)
  const bySectorReal = [];
  const realLabels = {
    21: "total",
    22: "government",
    23: "ukri",
    24: "hefce",
    25: "higherEducation",
    26: "business",
    27: "privateNonProfit",
    28: "overseas",
  };

  const hdrReal = rows3[20]; // header row for constant prices
  const yearsReal = [];
  for (let c = 1; c < hdrReal.length; c++) {
    const yr = parseInt(String(hdrReal[c]), 10);
    if (yr >= 2000) yearsReal.push({ col: c, year: yr });
  }

  for (const { col, year } of yearsReal) {
    const entry = { year };
    for (const [rowIdx, key] of Object.entries(realLabels)) {
      const val = rows3[parseInt(rowIdx)]?.[col];
      if (typeof val === "number") entry[key] = val;
    }
    bySectorReal.push(entry);
  }

  // ── Table 6: Total R&D and % of GDP ──
  const rows6 = XLSX.utils.sheet_to_json(wb.Sheets["6"], { header: 1 });
  const hdr6 = rows6[7]; // header
  const totalRow = rows6[8]; // total expenditure
  const pctRow = rows6[9]; // as % GDP

  const gdpPct = [];
  for (let c = 1; c < hdr6.length; c++) {
    const yr = parseInt(String(hdr6[c]), 10);
    if (yr >= 2000) {
      gdpPct.push({
        year: yr,
        total: typeof totalRow[c] === "number" ? totalRow[c] : null,
        pctGDP: typeof pctRow[c] === "number" ? pctRow[c] : null,
      });
    }
  }

  // ── Table 5: Regional breakdown (2023) ──
  const rows5 = XLSX.utils.sheet_to_json(wb.Sheets["5"], { header: 1 });
  // Row 8: header [Country or region, Gov & UKRI, HE, Business, PNP, Total]
  // Row 9 onwards: data
  const regions = [];
  for (let r = 9; r < rows5.length; r++) {
    const row = rows5[r];
    const name = String(row?.[0] ?? "").trim();
    const total = row?.[5];
    if (name && typeof total === "number" && total > 0) {
      regions.push({
        region: name,
        govUkri: typeof row[1] === "number" ? row[1] : null,
        he: typeof row[2] === "number" ? row[2] : null,
        business: typeof row[3] === "number" ? row[3] : null,
        pnp: typeof row[4] === "number" ? row[4] : null,
        total,
      });
    }
  }

  return { bySector, bySectorReal, gdpPct, regions };
}

// ── Curated international comparison ──────────────────────────────
// Source: World Bank API (indicator GB.XPD.RSDV.GD.ZS) / OECD MSTI, retrieved March 2026
// Most recent available year varies by country (2021-2023)
// Broad set per design principle: not just G7 — include high-performing small nations,
// emerging economies catching up, and instructive comparators.
const INTERNATIONAL = [
  { country: "Israel", pctGDP: 6.02, year: 2022 },
  { country: "South Korea", pctGDP: 5.21, year: 2022 },
  { country: "United States", pctGDP: 3.59, year: 2022 },
  { country: "Japan", pctGDP: 3.41, year: 2022 },
  { country: "Sweden", pctGDP: 3.40, year: 2022 },
  { country: "Belgium", pctGDP: 3.38, year: 2022 },
  { country: "Austria", pctGDP: 3.20, year: 2022 },
  { country: "Germany", pctGDP: 3.13, year: 2022 },
  { country: "Finland", pctGDP: 2.92, year: 2022 },
  { country: "Denmark", pctGDP: 2.85, year: 2022 },
  { country: "Switzerland", pctGDP: 2.80, year: 2021 },
  { country: "OECD Average", pctGDP: 2.70, year: 2023 },
  { country: "United Kingdom", pctGDP: 2.64, year: 2023 },
  { country: "Netherlands", pctGDP: 2.32, year: 2022 },
  { country: "France", pctGDP: 2.23, year: 2022 },
  { country: "Czech Republic", pctGDP: 1.98, year: 2022 },
  { country: "Norway", pctGDP: 1.83, year: 2022 },
  { country: "Singapore", pctGDP: 1.82, year: 2022 },
  { country: "Canada", pctGDP: 1.70, year: 2023 },
  { country: "Australia", pctGDP: 1.68, year: 2021 },
  { country: "Italy", pctGDP: 1.39, year: 2022 },
  { country: "Ireland", pctGDP: 1.25, year: 2022 },
  { country: "Spain", pctGDP: 1.25, year: 2022 },
  { country: "Poland", pctGDP: 1.20, year: 2022 },
];

async function main() {
  console.log("Downloading ONS GERD Official Statistics 2023...");
  const buf = await download(GERD_URL);
  const { bySector, bySectorReal, gdpPct, regions } = parseGERD(buf);
  console.log(`  → ${bySector.length} years of sector data (current prices)`);
  console.log(`  → ${bySectorReal.length} years of sector data (constant prices)`);
  console.log(`  → ${gdpPct.length} years of GDP % data`);
  console.log(`  → ${regions.length} regional rows`);

  const output = {
    meta: {
      sources: [
        {
          name: "ONS UK Gross Domestic Expenditure on R&D, 2023 (Official Statistics)",
          url: "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/researchanddevelopmentexpenditure/datasets/ukgrossdomesticexpenditureonresearchanddevelopment2021designatedasofficialstatistics",
          tables: "3 (sector funding, current & constant), 5 (regional), 6 (total & % GDP)",
          published: "15 August 2025",
        },
        {
          name: "World Bank / OECD MSTI (international comparison)",
          url: "https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS",
          note: "Most recent year varies by country (2022-2023)",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    bySector,
    bySectorReal,
    gdpPct,
    regions,
    international: INTERNATIONAL,
  };

  writeFileSync("public/data/research.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/research.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
