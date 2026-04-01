/**
 * fetch-transport-fares.js
 *
 * Downloads UK transport fare price indices from ONS (MM23 dataset):
 *  - CPIH All Items (L522)
 *  - CPIH Rail fares (L54D, COICOP 07.3.1)
 *  - CPIH Bus & Coach fares (J2TU, COICOP 07.3.2.1)
 *  - RPI Rail fares (DOCW)
 *  - RPI Bus & Coach fares (DOCX)
 *
 * CPIH series use 2015=100 base. RPI series use Jan 1987=100 base.
 * CPIH bus data only starts from Jan 2015; RPI series go back to 1987.
 *
 * Outputs: public/data/transport-fares.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const URLS = {
  cpihAll:   "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/l522/mm23",
  cpihRail:  "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/l54d/mm23",
  cpihBus:   "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/j2tu/mm23",
  rpiRail:   "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/docw/mm23",
  rpiBus:    "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/docx/mm23",
};

const MONTH_MAP = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/**
 * Download a URL, following redirects (ONS often 301/302s).
 */
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
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        }
      );
    };
    get(url);
  });
}

/**
 * Parse ONS generator CSV and extract monthly data rows.
 *
 * The CSV has metadata header rows, then annual data, then quarterly data,
 * then monthly data. Monthly rows match the pattern "YYYY MMM" in the first
 * column, e.g. "2020 JAN", with the value in the second column.
 *
 * Returns a Map of "YYYY-MM" => float value.
 */
function parseMonthly(csv) {
  const result = new Map();
  const lines = csv.split("\n");
  const monthlyPattern = /^(\d{4})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split on comma — ONS generator CSVs are simple two-column
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx === -1) continue;

    const label = trimmed.slice(0, commaIdx).trim().replace(/^"/, "").replace(/"$/, "").trim();
    const valStr = trimmed.slice(commaIdx + 1).trim().replace(/^"/, "").replace(/"$/, "").trim();

    const match = label.match(monthlyPattern);
    if (!match) continue;

    const year = match[1];
    const monthNum = MONTH_MAP[match[2]];
    const value = parseFloat(valStr);
    if (isNaN(value)) continue;

    const key = `${year}-${monthNum}`;
    result.set(key, Math.round(value * 10) / 10);
  }

  return result;
}

async function main() {
  console.log("Downloading ONS transport fare indices...");

  // Download all five series in parallel
  const [csvCpihAll, csvCpihRail, csvCpihBus, csvRpiRail, csvRpiBus] = await Promise.all([
    download(URLS.cpihAll).then(csv => { console.log("  Downloaded CPIH All Items (L522)"); return csv; }),
    download(URLS.cpihRail).then(csv => { console.log("  Downloaded CPIH Rail fares (L54D)"); return csv; }),
    download(URLS.cpihBus).then(csv => { console.log("  Downloaded CPIH Bus & Coach (J2TU)"); return csv; }),
    download(URLS.rpiRail).then(csv => { console.log("  Downloaded RPI Rail fares (DOCW)"); return csv; }),
    download(URLS.rpiBus).then(csv => { console.log("  Downloaded RPI Bus & Coach (DOCX)"); return csv; }),
  ]);

  // Parse monthly data from each CSV
  const cpihAll = parseMonthly(csvCpihAll);
  const cpihRail = parseMonthly(csvCpihRail);
  const cpihBus = parseMonthly(csvCpihBus);
  const rpiRail = parseMonthly(csvRpiRail);
  const rpiBus = parseMonthly(csvRpiBus);

  console.log(`  Parsed monthly points: CPIH All=${cpihAll.size}, CPIH Rail=${cpihRail.size}, CPIH Bus=${cpihBus.size}, RPI Rail=${rpiRail.size}, RPI Bus=${rpiBus.size}`);

  // ── Build CPIH monthly series (from 2015-01 onwards, when bus data starts) ──
  const cpihMonths = new Set();
  for (const key of cpihBus.keys()) {
    if (key >= "2015-01") cpihMonths.add(key);
  }
  // Also add months from rail/allItems that are >= 2015-01
  for (const key of cpihRail.keys()) {
    if (key >= "2015-01") cpihMonths.add(key);
  }

  const cpihData = [...cpihMonths]
    .sort()
    .filter(month => {
      // Only include months where we have all three CPIH values
      return cpihAll.has(month) && cpihRail.has(month) && cpihBus.has(month);
    })
    .map(month => ({
      month,
      rail: cpihRail.get(month),
      bus: cpihBus.get(month),
      allItems: cpihAll.get(month),
    }));

  console.log(`  CPIH monthly series: ${cpihData.length} months (${cpihData[0]?.month} to ${cpihData[cpihData.length - 1]?.month})`);

  // ── Build RPI monthly series (from 1987-01 onwards) ──
  const rpiMonths = new Set();
  for (const key of rpiRail.keys()) {
    if (key >= "1987-01") rpiMonths.add(key);
  }
  for (const key of rpiBus.keys()) {
    if (key >= "1987-01") rpiMonths.add(key);
  }

  const rpiData = [...rpiMonths]
    .sort()
    .filter(month => {
      // Only include months where we have both RPI series
      return rpiRail.has(month) && rpiBus.has(month);
    })
    .map(month => ({
      month,
      rail: rpiRail.get(month),
      bus: rpiBus.get(month),
    }));

  console.log(`  RPI monthly series: ${rpiData.length} months (${rpiData[0]?.month} to ${rpiData[rpiData.length - 1]?.month})`);

  // ── Snapshot: latest CPIH values ──
  const latestCpih = cpihData[cpihData.length - 1];
  const snapshot = {
    latestMonth: latestCpih.month,
    railIndex: latestCpih.rail,
    busIndex: latestCpih.bus,
    allItemsIndex: latestCpih.allItems,
  };

  console.log(`  Snapshot (${snapshot.latestMonth}): Rail=${snapshot.railIndex}, Bus=${snapshot.busIndex}, All Items=${snapshot.allItemsIndex}`);

  // ── Assemble output ──
  const output = {
    $schema: "sob-dataset-v1",
    id: "transport-fares",
    pillar: "foundations",
    topic: "transport",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-cpih-fares",
        name: "ONS Consumer Prices Index including owner occupiers' housing costs (CPIH)",
        url: "https://www.ons.gov.uk/economy/inflationandpriceindices",
        publisher: "Office for National Statistics",
        note: "CPIH component indices, 2015=100. Rail fares (COICOP 07.3.1), bus & coach fares (COICOP 07.3.2.1). Monthly, not seasonally adjusted.",
      },
      {
        id: "ons-rpi-fares",
        name: "ONS Retail Prices Index (RPI)",
        url: "https://www.ons.gov.uk/economy/inflationandpriceindices",
        publisher: "Office for National Statistics",
        note: "RPI component indices, Jan 1987=100. Rail fares (DOCW), bus & coach fares (DOCX). Monthly, not seasonally adjusted. RPI is a legacy measure but provides longer bus fare history than CPIH.",
      },
    ],
    snapshot,
    series: {
      cpihMonthly: {
        sourceId: "ons-cpih-fares",
        label: "Transport Fare Indices (CPIH, 2015=100)",
        unit: "index (2015=100)",
        timeField: "month",
        description: "Monthly CPIH component indices for rail fares, bus & coach fares, and all items. 2015=100.",
        data: cpihData,
      },
      rpiMonthly: {
        sourceId: "ons-rpi-fares",
        label: "Transport Fare Indices (RPI, Jan 1987=100)",
        unit: "index (Jan 1987=100)",
        timeField: "month",
        description: "Monthly RPI component indices for rail and bus & coach fares. Jan 1987=100. Longer history than CPIH bus series.",
        data: rpiData,
      },
    },
  };

  const outPath = join(__dirname, "..", "public", "data", "transport-fares.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Written ${outPath}`);
  console.log(`  CPIH: ${cpihData.length} months, RPI: ${rpiData.length} months`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
