/**
 * fetch-youth-unemployment.js
 *
 * Downloads UK youth (16-24) unemployment rate and economic inactivity rate
 * from ONS Labour Force Survey time series CSVs (generator format).
 *
 * Series:
 *  - MGWY: Unemployment rate, 16-24, seasonally adjusted
 *  - AIYL: Economic inactivity rate, 16-24, seasonally adjusted
 *
 * Extracts quarterly data only, merges the two series by quarter,
 * and outputs public/data/youth-unemployment.json in sob-dataset-v1 schema.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UNEMPLOYMENT_URL =
  "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgwy/lms";

const INACTIVITY_URL =
  "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/aiyl/lms";

/**
 * Download a URL as text, following redirects.
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
 * Parse quarterly data from an ONS generator CSV.
 *
 * The CSV has metadata header rows, then annual rows ("1992","16.3"),
 * then quarterly rows ("1992 Q1","15.4"), then monthly rows.
 * All fields are quoted. We extract only the quarterly rows.
 *
 * Returns a Map of quarter key ("1992-Q1") to numeric value.
 */
function parseQuarterly(csv) {
  const quarterPattern = /^(\d{4})\s+Q([1-4])$/;
  const data = new Map();

  for (const line of csv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ONS generator CSVs quote every field: "1992 Q2","16.2"
    // Strip surrounding quotes and split on ","
    const parts = trimmed.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
    if (parts.length < 2) continue;

    const label = parts[0];
    const value = parts[1];

    const match = label.match(quarterPattern);
    if (!match) continue;

    const num = parseFloat(value);
    if (isNaN(num)) continue;

    const quarter = `${match[1]}-Q${match[2]}`;
    data.set(quarter, Math.round(num * 10) / 10);
  }

  return data;
}

async function main() {
  console.log("Downloading youth unemployment rate (MGWY)...");
  const unempCsv = await download(UNEMPLOYMENT_URL);
  const unempData = parseQuarterly(unempCsv);
  console.log(`  → ${unempData.size} quarterly values`);

  console.log("Downloading youth economic inactivity rate (AIYL)...");
  const inactCsv = await download(INACTIVITY_URL);
  const inactData = parseQuarterly(inactCsv);
  console.log(`  → ${inactData.size} quarterly values`);

  // Merge: only include quarters where both series have data
  const allQuarters = [...new Set([...unempData.keys(), ...inactData.keys()])]
    .filter((q) => unempData.has(q) && inactData.has(q))
    .sort();

  if (allQuarters.length === 0) {
    throw new Error("No overlapping quarterly data found between the two series");
  }

  const merged = allQuarters.map((q) => ({
    quarter: q,
    unemploymentRate: unempData.get(q),
    inactivityRate: inactData.get(q),
  }));

  console.log(`  → ${merged.length} merged quarterly rows (${allQuarters[0]} to ${allQuarters[allQuarters.length - 1]})`);

  // Snapshot from the latest quarter
  const latest = merged[merged.length - 1];

  const dataset = {
    $schema: "sob-dataset-v1",
    id: "youth-unemployment",
    pillar: "growth",
    topic: "employment",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-lfs",
        name: "ONS Labour Force Survey",
        url: "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgwy/lms",
        publisher: "Office for National Statistics",
        note: "Seasonally adjusted, rolling three-month average. Ages 16-24, UK.",
      },
    ],
    snapshot: {
      latestQuarter: latest.quarter,
      unemploymentRate: latest.unemploymentRate,
      inactivityRate: latest.inactivityRate,
    },
    series: {
      quarterly: {
        sourceId: "ons-lfs",
        label: "Youth Labour Market (16-24)",
        unit: "%",
        timeField: "quarter",
        description:
          "Youth (16-24) unemployment rate and economic inactivity rate, seasonally adjusted, quarterly.",
        methodologyBreaks: [
          {
            at: "2020-Q1",
            label: "COVID-19 impact",
            description:
              "Labour Force Survey response rates fell sharply from March 2020, affecting headline estimates. ONS introduced weighting adjustments but advises caution interpreting levels during 2020-2021.",
            severity: "major",
          },
        ],
        data: merged,
      },
    },
  };

  const outPath = join(__dirname, "..", "public", "data", "youth-unemployment.json");
  writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
