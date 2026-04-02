/**
 * fetch-unemployment.js
 *
 * Downloads UK labour market data from ONS Labour Force Survey time series
 * CSVs (generator format).
 *
 * Series IDs:
 *  - MGSX: Unemployment rate (16+, SA, %)
 *  - LF24: Employment rate (16-64, SA, %)
 *  - LF2S: Economic inactivity rate (16-64, SA, %)
 *  - MGSC: Unemployed level (16+, SA, thousands)
 *  - LF69: Long-term sick (inactive, 16-64, SA, thousands)
 *  - LF63: Students (inactive, 16-64, SA, thousands)
 *  - LF66: Looking after family/home (inactive, 16-64, SA, thousands)
 *  - LF6B: Retired (inactive, 16-64, SA, thousands)
 *  - LF6E: Other (inactive, 16-64, SA, thousands)
 *
 * Extracts quarterly data only, merges into two series, and outputs
 * public/data/unemployment.json in sob-dataset-v1 schema.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const URLS = {
  unemploymentRate:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms",
  employmentRate:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/lf24/lms",
  inactivityRate:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf2s/lms",
  unemployedThousands:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsc/lms",
  longTermSick:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf69/lms",
  students:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf63/lms",
  lookingAfterFamily:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf66/lms",
  retired:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf6b/lms",
  other:
    "https://www.ons.gov.uk/generator?format=csv&uri=/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf6e/lms",
};

const SERIES_LABELS = {
  unemploymentRate: "MGSX",
  employmentRate: "LF24",
  inactivityRate: "LF2S",
  unemployedThousands: "MGSC",
  longTermSick: "LF69",
  students: "LF63",
  lookingAfterFamily: "LF66",
  retired: "LF6B",
  other: "LF6E",
};

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
 * The CSV has metadata header rows, then annual rows ("1971","5.2"),
 * then quarterly rows ("1992 Q1","9.8"), then monthly rows.
 * We extract only the quarterly rows.
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
    const parts = trimmed.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
    if (parts.length < 2) continue;

    const label = parts[0];
    const value = parts[1];

    const match = label.match(quarterPattern);
    if (!match) continue;

    const num = parseFloat(value);
    if (isNaN(num)) continue;

    const quarter = `${match[1]}-Q${match[2]}`;
    data.set(quarter, num);
  }

  return data;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Download all series with delays between requests and retry on 429
  const rawData = {};
  const keys = Object.keys(URLS);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let csv;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`Downloading ${key} (${SERIES_LABELS[key]})${attempt > 0 ? ` [retry ${attempt}]` : ""}...`);
        csv = await download(URLS[key]);
        break;
      } catch (err) {
        if (attempt < 2 && err.message.includes("429")) {
          console.log(`  Rate limited, waiting 10s...`);
          await sleep(10000);
        } else {
          throw err;
        }
      }
    }
    rawData[key] = parseQuarterly(csv);
    console.log(`  → ${rawData[key].size} quarterly values`);
    if (i < keys.length - 1) await sleep(2000);
  }

  // --- Series 1: quarterly ---
  // Merge unemployment rate, employment rate, inactivity rate, and unemployed level
  // Only include quarters from 1992 onwards where all 4 values are present
  const rateSeries = ["unemploymentRate", "employmentRate", "inactivityRate", "unemployedThousands"];
  const allRateQuarters = new Set();
  for (const key of rateSeries) {
    for (const q of rawData[key].keys()) allRateQuarters.add(q);
  }

  const quarterlyData = [...allRateQuarters]
    .filter((q) => {
      if (q < "1992") return false;
      return rateSeries.every((key) => rawData[key].has(q));
    })
    .sort()
    .map((q) => ({
      quarter: q,
      unemploymentRate: Math.round(rawData.unemploymentRate.get(q) * 10) / 10,
      employmentRate: Math.round(rawData.employmentRate.get(q) * 10) / 10,
      inactivityRate: Math.round(rawData.inactivityRate.get(q) * 10) / 10,
      unemployedThousands: Math.round(rawData.unemployedThousands.get(q)),
    }));

  console.log(`\nSeries "quarterly": ${quarterlyData.length} rows (${quarterlyData[0]?.quarter} to ${quarterlyData[quarterlyData.length - 1]?.quarter})`);

  // --- Series 2: inactivityReasons ---
  // All reasons for economic inactivity (16-64), quarterly from 1993 onwards
  const reasonsSeries = ["longTermSick", "students", "lookingAfterFamily", "retired", "other"];
  const allReasonQuarters = new Set();
  for (const key of reasonsSeries) {
    for (const q of rawData[key].keys()) allReasonQuarters.add(q);
  }

  const inactivityReasonsData = [...allReasonQuarters]
    .filter((q) => {
      if (q < "1993") return false;
      return reasonsSeries.every((key) => rawData[key].has(q));
    })
    .sort()
    .map((q) => ({
      quarter: q,
      longTermSick: Math.round(rawData.longTermSick.get(q)),
      students: Math.round(rawData.students.get(q)),
      lookingAfterFamily: Math.round(rawData.lookingAfterFamily.get(q)),
      retired: Math.round(rawData.retired.get(q)),
      other: Math.round(rawData.other.get(q)),
    }));

  console.log(`Series "inactivityReasons": ${inactivityReasonsData.length} rows (${inactivityReasonsData[0]?.quarter} to ${inactivityReasonsData[inactivityReasonsData.length - 1]?.quarter})`);

  if (quarterlyData.length === 0) {
    throw new Error("No overlapping quarterly data found for main series");
  }

  // Snapshot from the latest quarter
  const latest = quarterlyData[quarterlyData.length - 1];

  const dataset = {
    $schema: "sob-dataset-v1",
    id: "unemployment",
    pillar: "growth",
    topic: "employment",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-lfs-unemployment",
        name: "ONS Labour Force Survey",
        url: "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment",
        publisher: "Office for National Statistics",
        note: "Seasonally adjusted, rolling three-month average. UK.",
      },
    ],
    snapshot: {
      latestQuarter: latest.quarter,
      unemploymentRate: latest.unemploymentRate,
      employmentRate: latest.employmentRate,
      inactivityRate: latest.inactivityRate,
      unemployedThousands: latest.unemployedThousands,
    },
    series: {
      quarterly: {
        sourceId: "ons-lfs-unemployment",
        label: "UK Labour Market",
        unit: "% / thousands",
        timeField: "quarter",
        description:
          "Unemployment rate (16+), employment rate (16-64), economic inactivity rate (16-64), and unemployed level (16+, thousands). All seasonally adjusted, quarterly.",
        methodologyBreaks: [
          {
            at: "2020-Q1",
            label: "COVID-19 impact",
            description:
              "Labour Force Survey response rates fell sharply from March 2020, affecting headline estimates. ONS introduced weighting adjustments but advises caution interpreting levels during 2020-2021.",
            severity: "major",
          },
        ],
        data: quarterlyData,
      },
      inactivityReasons: {
        sourceId: "ons-lfs-unemployment",
        label: "Economic Inactivity Reasons",
        unit: "thousands",
        timeField: "quarter",
        description:
          "Reasons for economic inactivity (16-64): long-term sick, students, looking after family/home, retired, and other. Seasonally adjusted, quarterly, in thousands.",
        methodologyBreaks: [
          {
            at: "2020-Q1",
            label: "COVID-19 impact",
            description:
              "Labour Force Survey response rates fell sharply from March 2020, affecting headline estimates. ONS introduced weighting adjustments but advises caution interpreting levels during 2020-2021.",
            severity: "major",
          },
        ],
        data: inactivityReasonsData,
      },
    },
  };

  const outPath = join(__dirname, "..", "public", "data", "unemployment.json");
  writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
