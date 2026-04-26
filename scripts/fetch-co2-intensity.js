/**
 * fetch-co2-intensity.js
 *
 * Fetches GB electricity carbon intensity (gCO2/kWh) from NESO's free public
 * Carbon Intensity API. Aggregates to monthly average by sampling the 15th of
 * each month for the last 24 months.
 *
 * Source: https://api.carbonintensity.org.uk/
 * No auth, no documented rate limit (we still throttle 200ms between calls).
 *
 * Output: public/data/co2-intensity.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import https from "https";

const BASE = "https://api.carbonintensity.org.uk";
const MONTHS_BACK = 24;
const SAMPLE_DAY_OF_MONTH = 15;
const REQUEST_DELAY_MS = 200;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (+dashboard)" },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume();
            return get(res.headers.location);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
            } catch (err) {
              reject(err);
            }
          });
          res.on("error", reject);
        }
      ).on("error", reject);
    };
    get(url);
  });
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const now = new Date();
  const monthly = [];

  console.log(`Fetching CO2 intensity samples (15th of each month, last ${MONTHS_BACK} months)…`);
  for (let offset = MONTHS_BACK - 1; offset >= 0; offset--) {
    const target = new Date(now);
    target.setUTCDate(SAMPLE_DAY_OF_MONTH);
    target.setUTCMonth(target.getUTCMonth() - offset);

    if (target > now) continue;

    const dateStr = isoDate(target);
    const url = `${BASE}/intensity/date/${dateStr}`;
    try {
      const json = await fetchJson(url);
      const points = json.data || [];
      const values = points
        .map((p) => p.intensity?.actual)
        .filter((v) => v != null && Number.isFinite(v));

      if (values.length === 0) {
        console.warn(`  ${dateStr}: no actual values; skipping`);
        continue;
      }

      const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
      const period = dateStr.slice(0, 7); // YYYY-MM
      monthly.push({ period, intensity: avg, samples: values.length });
      console.log(`  ${period}: ${avg} gCO2/kWh (${values.length} half-hours)`);
    } catch (err) {
      console.warn(`  ${dateStr}: ${err.message}; skipping`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (monthly.length === 0) {
    throw new Error("No data fetched");
  }

  // Annual averages from the monthly sample (for longSeries on the tile).
  const byYear = new Map();
  for (const m of monthly) {
    const yr = parseInt(m.period.slice(0, 4), 10);
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr).push(m.intensity);
  }
  const annual = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, vs]) => ({
      year,
      intensity: Math.round(vs.reduce((s, v) => s + v, 0) / vs.length),
    }));

  const latest = monthly[monthly.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "co2-intensity",
    pillar: "foundations",
    topic: "energy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "neso-carbon-intensity",
        name: "NESO Carbon Intensity API",
        url: "https://api.carbonintensity.org.uk/",
        publisher: "NESO",
        note: "Half-hourly grams of CO2 per kWh of electricity generated in GB. Sampled on the 15th of each month and averaged.",
      },
    ],
    snapshot: {
      intensity: latest.intensity,
      intensityPeriod: latest.period,
      intensityUnit: "gCO2/kWh",
    },
    series: {
      monthly: {
        sourceId: "neso-carbon-intensity",
        timeField: "period",
        unit: "gCO2/kWh",
        description:
          "Monthly average carbon intensity of GB electricity generation. Sampled on the 15th of each month from NESO's half-hourly intensity feed.",
        data: monthly.map(({ period, intensity }) => ({ period, intensity })),
      },
      annual: {
        sourceId: "neso-carbon-intensity",
        timeField: "year",
        unit: "gCO2/kWh",
        description:
          "Annual average carbon intensity, derived from the monthly sample.",
        data: annual,
      },
    },
  };

  writeFileSync(
    "public/data/co2-intensity.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `\n✓ public/data/co2-intensity.json written (${monthly.length} monthly, ${annual.length} annual)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
