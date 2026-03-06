/**
 * fetch-cpih.js
 *
 * Downloads the full CPIH CSV from ONS and extracts 5 aggregate categories.
 * Outputs public/data/cpih.json.
 *
 * Categories: CP00 (Overall), CP01 (Food), CP04 (Housing/energy),
 *             CP07 (Transport), CP09 (Recreation & culture)
 */
import { writeFileSync } from "fs";
import https from "https";

// Direct CSV download — update version number when ONS publishes new data
const CSV_URL =
  "https://download.ons.gov.uk/downloads/datasets/cpih01/editions/time-series/versions/67.csv";

const WANTED = new Set(["CP00", "CP01", "CP04", "CP07", "CP09"]);

const AGGREGATES = [
  { id: "CP00", label: "Overall CPIH" },
  { id: "CP01", label: "Food & non-alcoholic beverages" },
  { id: "CP04", label: "Housing, water, energy & fuels" },
  { id: "CP07", label: "Transport" },
  { id: "CP09", label: "Recreation & culture" },
];

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

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
            return reject(new Error(`HTTP ${res.statusCode}`));
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

function parseONSMonth(id) {
  const [mon, yr] = id.split("-");
  if (!MONTHS[mon] || !yr) return null;
  const year = parseInt(yr) > 50 ? 1900 + parseInt(yr) : 2000 + parseInt(yr);
  return { sort: `${year}-${MONTHS[mon]}`, label: `${mon} ${year}`, year };
}

async function main() {
  console.log("Downloading CPIH CSV...");
  const csv = await download(CSV_URL);
  const lines = csv.split("\n");
  console.log(`  → ${lines.length} rows`);

  // CSV columns: v4_0, mmm-yy, Time, uk-only, Geography, cpih1dim1aggid, Aggregate
  // Col 0: value, Col 1: time code, Col 5: aggregate code
  const byTime = {};
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse — handle quoted fields
    const parts = [];
    let current = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { parts.push(current); current = ""; continue; }
      current += ch;
    }
    parts.push(current);

    const aggCode = parts[5]?.trim();
    if (!WANTED.has(aggCode)) continue;

    const timeCode = parts[1]?.trim();
    const parsed = parseONSMonth(timeCode);
    if (!parsed || parsed.year < 2010) continue;

    const value = parseFloat(parts[0]);
    if (isNaN(value)) continue;

    if (!byTime[parsed.sort]) byTime[parsed.sort] = { time: parsed.sort, label: parsed.label };
    byTime[parsed.sort][aggCode] = value;
    count++;
  }

  const series = Object.values(byTime).sort((a, b) =>
    a.time.localeCompare(b.time)
  );
  console.log(
    `  → ${count} relevant observations, ${series.length} months (${series[0].time} to ${series[series.length - 1].time})`
  );

  const output = {
    meta: {
      source: "ONS Consumer Prices Index including owner occupiers' housing costs (CPIH)",
      url: "https://www.ons.gov.uk/economy/inflationandpriceindices",
      dataset: "cpih01 v67",
      index: "2015 = 100",
      generated: new Date().toISOString().slice(0, 10),
    },
    aggregates: AGGREGATES,
    series,
  };

  writeFileSync("public/data/cpih.json", JSON.stringify(output, null, 2));
  console.log("✓ Written public/data/cpih.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
