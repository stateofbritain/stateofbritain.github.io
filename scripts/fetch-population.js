/**
 * fetch-population.js
 *
 * Downloads UK population mid-year estimates from ONS timeseries CSVs:
 *  - UKPOP: UK total population
 *  - ENPOP: England
 *  - SCPOP: Scotland
 *  - WAPOP: Wales
 *  - NIPOP: Northern Ireland
 *
 * Each CSV has metadata header rows then annual rows like "1971,55928000".
 * Values are raw person counts (not thousands).
 *
 * Outputs: public/data/population.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { join } from "path";
import https from "https";

const SERIES = [
  {
    key: "uk",
    label: "UKPOP",
    url: "https://www.ons.gov.uk/generator?format=csv&uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/timeseries/ukpop/pop",
  },
  {
    key: "england",
    label: "ENPOP",
    url: "https://www.ons.gov.uk/generator?format=csv&uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/timeseries/enpop/pop",
  },
  {
    key: "scotland",
    label: "SCPOP",
    url: "https://www.ons.gov.uk/generator?format=csv&uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/timeseries/scpop/pop",
  },
  {
    key: "wales",
    label: "WAPOP",
    url: "https://www.ons.gov.uk/generator?format=csv&uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/timeseries/wapop/pop",
  },
  {
    key: "ni",
    label: "NIPOP",
    url: "https://www.ons.gov.uk/generator?format=csv&uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/timeseries/nipop/pop",
  },
];

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
          if ([301, 302, 303, 307].includes(res.statusCode)) {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse an ONS timeseries CSV.
 * Metadata rows have various formats; annual data rows are quoted:
 *   "1971","55928000"
 * Returns a Map of year -> integer population.
 */
function parseOnsTimeseries(csv) {
  const result = new Map();
  const lines = csv.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Match: quoted 4-digit year, comma, quoted integer
    const match = trimmed.match(/^"?(\d{4})"?\s*,\s*"?([\d\s]+)"?$/);
    if (!match) continue;
    const year = parseInt(match[1], 10);
    // Remove any spaces from the value
    const value = parseInt(match[2].replace(/\s/g, ""), 10);
    if (year >= 1900 && year <= 2100 && !isNaN(value)) {
      result.set(year, value);
    }
  }
  return result;
}

async function main() {
  // Download all CSVs with a delay between requests
  const parsed = {};
  for (const s of SERIES) {
    console.log(`Downloading ${s.label}...`);
    const csv = await download(s.url);
    const data = parseOnsTimeseries(csv);
    console.log(`  -> ${data.size} annual data points`);
    parsed[s.key] = data;
    // Small delay to avoid rate limiting
    if (s !== SERIES[SERIES.length - 1]) {
      await sleep(1000);
    }
  }

  // Merge by year: only include years where UK total is available, starting from 1971
  const ukYears = [...parsed.uk.keys()].filter((y) => y >= 1971).sort((a, b) => a - b);

  const annualData = [];
  for (const year of ukYears) {
    const row = { year, uk: parsed.uk.get(year) };
    if (parsed.england.has(year)) row.england = parsed.england.get(year);
    if (parsed.scotland.has(year)) row.scotland = parsed.scotland.get(year);
    if (parsed.wales.has(year)) row.wales = parsed.wales.get(year);
    if (parsed.ni.has(year)) row.ni = parsed.ni.get(year);
    annualData.push(row);
  }

  // Find latest year where all 5 series have data
  let latestYear = null;
  for (let i = annualData.length - 1; i >= 0; i--) {
    const r = annualData[i];
    if (r.uk && r.england && r.scotland && r.wales && r.ni) {
      latestYear = r.year;
      break;
    }
  }

  const latestRow = annualData.find((r) => r.year === latestYear);
  console.log(`\nLatest complete year: ${latestYear}`);
  console.log(`  UK: ${latestRow.uk?.toLocaleString()}`);
  console.log(`  England: ${latestRow.england?.toLocaleString()}`);
  console.log(`  Scotland: ${latestRow.scotland?.toLocaleString()}`);
  console.log(`  Wales: ${latestRow.wales?.toLocaleString()}`);
  console.log(`  NI: ${latestRow.ni?.toLocaleString()}`);

  const output = {
    $schema: "sob-dataset-v1",
    id: "population",
    pillar: "foundations",
    topic: "demographics",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-mye",
        name: "ONS Mid-Year Population Estimates",
        url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates",
        publisher: "Office for National Statistics",
        note: "Mid-year estimates, rebased to Census 2021/2022. UK, England, Scotland, Wales, Northern Ireland.",
      },
    ],
    snapshot: {
      latestYear,
      ukPopulation: latestRow.uk,
      englandPopulation: latestRow.england,
      scotlandPopulation: latestRow.scotland,
      walesPopulation: latestRow.wales,
      niPopulation: latestRow.ni,
    },
    series: {
      annual: {
        sourceId: "ons-mye",
        label: "UK Population (Mid-Year Estimates)",
        unit: "persons",
        timeField: "year",
        description:
          "Annual mid-year population estimates for the UK and constituent countries.",
        data: annualData,
      },
    },
  };

  const outPath = join(import.meta.dirname, "..", "public", "data", "population.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n-> Written ${outPath}`);
  console.log(`   ${annualData.length} years (${annualData[0].year}-${annualData[annualData.length - 1].year})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
