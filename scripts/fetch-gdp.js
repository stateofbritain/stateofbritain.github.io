/**
 * fetch-gdp.js
 *
 * Downloads UK GDP data from the ONS timeseries API:
 *  - ABMI: Real GDP (chained volume measures, £m, quarterly)
 *  - IHXW: Real GDP per capita (£, quarterly)
 *  - IHYQ: Quarter-on-quarter growth (%, quarterly)
 *
 * Outputs: public/data/gdp.json (sob-dataset-v1 schema)
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERIES = {
  abmi: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/pn2/data",
  ihxw: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihxw/pn2/data",
  ihyq: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihyq/pn2/data",
};

const MIN_YEAR = 1990;

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            "User-Agent": "StateOfBritain/1.0 (data fetch script)",
            Accept: "application/json",
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
          res.on("end", () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
            } catch (e) {
              reject(new Error(`JSON parse error from ${u}: ${e.message}`));
            }
          });
          res.on("error", reject);
        }
      );
    };
    get(url);
  });
}

/**
 * Convert ONS quarter format "2025 Q4" to "2025-Q4"
 */
function normaliseQuarter(date) {
  return date.replace(/\s+/, "-");
}

/**
 * Extract year from ONS quarter date string
 */
function yearFromDate(date) {
  return parseInt(date.slice(0, 4), 10);
}

/**
 * Parse quarterly data from ONS timeseries API response.
 * Returns a Map keyed by normalised quarter string.
 */
function parseQuarters(json) {
  const map = new Map();
  for (const q of json.quarters || []) {
    const year = parseInt(q.year, 10);
    if (year < MIN_YEAR) continue;
    const val = parseFloat(q.value);
    if (isNaN(val)) continue;
    const key = normaliseQuarter(q.date);
    map.set(key, val);
  }
  return map;
}

async function main() {
  console.log("Fetching ONS GDP series...");

  console.log("  → ABMI (Real GDP, £m)...");
  const abmiJson = await download(SERIES.abmi);
  const abmiData = parseQuarters(abmiJson);
  console.log(`    ${abmiData.size} quarters`);

  console.log("  → IHXW (Real GDP per capita, £)...");
  const ihxwJson = await download(SERIES.ihxw);
  const ihxwData = parseQuarters(ihxwJson);
  console.log(`    ${ihxwData.size} quarters`);

  console.log("  → IHYQ (Quarter-on-quarter growth, %)...");
  const ihyqJson = await download(SERIES.ihyq);
  const ihyqData = parseQuarters(ihyqJson);
  console.log(`    ${ihyqData.size} quarters`);

  // Build combined quarterly series — only include quarters where all three exist
  const allQuarters = [...abmiData.keys()].sort();
  const data = [];
  for (const q of allQuarters) {
    const gdpM = abmiData.get(q);
    const perCapita = ihxwData.get(q);
    const growth = ihyqData.get(q);
    if (gdpM == null || perCapita == null || growth == null) continue;
    data.push({
      quarter: q,
      gdpBn: Math.round((gdpM / 1000) * 10) / 10,
      perCapita: Math.round(perCapita),
      qoqGrowth: Math.round(growth * 10) / 10,
    });
  }

  console.log(`\n  Combined series: ${data.length} quarters (${data[0]?.quarter} to ${data[data.length - 1]?.quarter})`);

  if (data.length === 0) {
    console.error("No combined data produced — check API responses");
    process.exit(1);
  }

  // Snapshot from latest quarter
  const latest = data[data.length - 1];
  const snapshot = {
    latestQuarter: latest.quarter,
    gdpRealBn: latest.gdpBn,
    gdpPerCapita: latest.perCapita,
    qoqGrowth: latest.qoqGrowth,
  };

  const output = {
    $schema: "sob-dataset-v1",
    id: "gdp",
    pillar: "growth",
    topic: "economy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-gdp",
        name: "ONS Gross Domestic Product (PN2)",
        url: "https://www.ons.gov.uk/economy/grossdomesticproductgdp",
        publisher: "Office for National Statistics",
      },
    ],
    snapshot,
    series: {
      quarterly: {
        sourceId: "ons-gdp",
        label: "UK GDP (Real Terms)",
        unit: "£ billion (chained volume)",
        timeField: "quarter",
        data,
      },
    },
  };

  const outPath = join(__dirname, "..", "public", "data", "gdp.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Written ${outPath}`);
  console.log(`  Snapshot: ${JSON.stringify(snapshot)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
