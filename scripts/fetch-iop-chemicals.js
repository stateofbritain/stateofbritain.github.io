/**
 * fetch-iop-chemicals.js
 *
 * ONS Index of Production — chemicals & chemical products subindex (series K226).
 * Monthly, base 2022 = 100 (CVM, seasonally adjusted).
 *
 * Source: ONS time series API (no auth, free public).
 * Endpoint: https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/k226/data
 *
 * Output: public/data/iop-chemicals.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import https from "https";

const URL_API =
  "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/k226/data";

const MONTHS_SHORT = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

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
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
            } catch (e) {
              reject(e);
            }
          });
          res.on("error", reject);
        }
      ).on("error", reject);
    };
    get(url);
  });
}

function parseOnsMonth(date) {
  // ONS time series API returns dates like "2024 JAN" or "2024-01" depending on field.
  // The `date` field is typically "YYYY MMM"; fall back to direct parse.
  if (typeof date !== "string") return null;
  const m1 = date.match(/^(\d{4})\s+([A-Z]{3})$/);
  if (m1 && MONTHS_SHORT[m1[2]]) {
    return `${m1[1]}-${MONTHS_SHORT[m1[2]]}`;
  }
  const m2 = date.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return null;
}

async function main() {
  console.log("Fetching ONS series K226 (Index of Production — chemicals)…");
  const json = await fetchJson(URL_API);

  if (!json.months) {
    throw new Error("Response missing months array");
  }

  const monthly = json.months
    .map((m) => ({
      period: parseOnsMonth(m.date),
      value: Number.parseFloat(m.value),
    }))
    .filter((m) => m.period != null && Number.isFinite(m.value))
    .sort((a, b) => a.period.localeCompare(b.period));

  if (monthly.length === 0) {
    throw new Error("No monthly observations parsed");
  }

  const annual = (json.years || [])
    .map((y) => ({
      year: Number.parseInt(y.date, 10),
      value: Number.parseFloat(y.value),
    }))
    .filter((y) => Number.isFinite(y.year) && Number.isFinite(y.value))
    .sort((a, b) => a.year - b.year);

  const latest = monthly[monthly.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "iop-chemicals",
    pillar: "growth",
    topic: "industrial",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-iop-k226",
        name: "ONS Index of Production — chemicals & chemical products (K226)",
        url: "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/k226/data",
        publisher: "ONS",
        note: "Monthly index, seasonally adjusted, chained volume measures.",
      },
    ],
    snapshot: {
      indexValue: latest.value,
      indexPeriod: latest.period,
      indexUnit: "index (2022=100)",
    },
    series: {
      monthly: {
        sourceId: "ons-iop-k226",
        timeField: "period",
        unit: "index (2022=100)",
        description:
          "Monthly Index of Production for chemicals manufacturing (SIC 20). Series K226.",
        data: monthly,
      },
      annual: {
        sourceId: "ons-iop-k226",
        timeField: "year",
        unit: "index (2022=100)",
        description: "Annual Index of Production for chemicals.",
        data: annual,
      },
    },
  };

  writeFileSync(
    "public/data/iop-chemicals.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/iop-chemicals.json (${monthly.length} monthly, ${annual.length} annual; latest=${latest.value} for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
