/**
 * fetch-tech-incorporations.js
 *
 * Monthly count of new UK companies incorporated in target "frontier-tech"
 * SIC codes — a free proxy for ecosystem vitality where direct data on
 * AI / biotech / semiconductor activity is otherwise paywalled.
 *
 * Source: Companies House public-data API.
 * Endpoint: https://api.company-information.service.gov.uk/advanced-search/companies
 * Auth: Basic auth (base64 of "{API_KEY}:") — API key is free.
 *       Sign up: https://developer.company-information.service.gov.uk/get-started/
 *
 * Set COMPANIES_HOUSE_API_KEY in the environment before running. Without it
 * the script writes a placeholder JSON noting the missing key.
 *
 * Output: public/data/tech-incorporations.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import https from "https";

const API_BASE = "https://api.company-information.service.gov.uk";
const KEY = process.env.COMPANIES_HOUSE_API_KEY;

// Target SIC 2007 codes representing frontier-tech sectors. Five-digit codes
// per Companies House convention. Adjust these editorial choices in the
// dashboard catalog if the proxy starts to mislead.
const SIC_CODES = [
  "62012",  // Business and domestic software development
  "62020",  // Information technology consultancy activities
  "62090",  // Other information technology service activities
  "63110",  // Data processing, hosting and related activities
  "21100",  // Basic pharmaceutical products
  "26110",  // Electronic components
  "26200",  // Computers and peripheral equipment
  "26300",  // Communication equipment
  "72110",  // R&D — biotechnology
  "72190",  // R&D — other natural sciences & engineering
];

const MONTHS_BACK = 24;
const REQUEST_DELAY_MS = 600; // CH soft-rate-limit-friendly

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function authHeader() {
  return "Basic " + Buffer.from(`${KEY}:`).toString("base64");
}

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          Authorization: authHeader(),
          Accept: "application/json",
          "User-Agent": "StateOfBritain/1.0 (+dashboard)",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${path}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8"))); }
          catch (err) { reject(err); }
        });
        res.on("error", reject);
      }
    ).on("error", reject).end();
  });
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function isoDate(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

async function countForMonth(year, monthIndex) {
  const from = isoDate(year, monthIndex, 1);
  const to = isoDate(year, monthIndex, lastDayOfMonth(year, monthIndex));
  const sicParam = SIC_CODES.join(",");
  const path =
    `/advanced-search/companies?` +
    `company_status=active&sic_codes=${sicParam}` +
    `&incorporated_from=${from}&incorporated_to=${to}&size=1`;
  const json = await fetchJson(path);
  return Number.parseInt(json.total_results, 10) || 0;
}

async function writePlaceholder(reason) {
  const output = {
    $schema: "sob-dataset-v1",
    id: "tech-incorporations",
    pillar: "growth",
    topic: "startups",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ch-api",
        name: "Companies House Advanced Search API (frontier-tech SIC codes)",
        url: "https://developer.company-information.service.gov.uk/",
        publisher: "Companies House",
        note: reason,
      },
    ],
    series: { monthly: { sourceId: "ch-api", timeField: "month", unit: "incorporations / month", description: reason, data: [] } },
  };
  writeFileSync(
    "public/data/tech-incorporations.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(`⚠ Wrote placeholder tech-incorporations.json: ${reason}`);
}

async function main() {
  if (!KEY) {
    await writePlaceholder("COMPANIES_HOUSE_API_KEY not set; placeholder written. Set the env var (or GitHub Secret) to populate.");
    return;
  }

  const monthly = [];
  const now = new Date();
  for (let offset = MONTHS_BACK - 1; offset >= 0; offset--) {
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 15));
    const y = target.getUTCFullYear();
    const m = target.getUTCMonth();
    const period = `${y}-${String(m + 1).padStart(2, "0")}`;
    try {
      const count = await countForMonth(y, m);
      monthly.push({ month: period, count });
      console.log(`  ${period}: ${count} new tech-SIC incorporations`);
    } catch (err) {
      console.warn(`  ${period}: ${err.message}; skipping`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (monthly.length === 0) {
    await writePlaceholder("No data fetched — check API key / network.");
    return;
  }

  const latest = monthly[monthly.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "tech-incorporations",
    pillar: "growth",
    topic: "startups",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ch-api",
        name: "Companies House Advanced Search API (frontier-tech SIC codes)",
        url: "https://developer.company-information.service.gov.uk/",
        publisher: "Companies House",
        note:
          "New companies incorporated each month with at least one of the configured frontier-tech SIC codes: " +
          SIC_CODES.join(", "),
      },
    ],
    snapshot: {
      count: latest.count,
      countMonth: latest.month,
    },
    series: {
      monthly: {
        sourceId: "ch-api",
        timeField: "month",
        unit: "incorporations / month",
        description:
          "Monthly count of UK companies newly incorporated with at least one of the configured frontier-tech SIC codes.",
        data: monthly,
      },
    },
  };

  writeFileSync(
    "public/data/tech-incorporations.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/tech-incorporations.json (${monthly.length} months; latest ${latest.count} for ${latest.month})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
