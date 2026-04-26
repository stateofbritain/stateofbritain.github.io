/**
 * fetch-epc-newbuild.js
 *
 * Monthly count of new-build EPC lodgements (England & Wales). Each new
 * dwelling sold or let must be lodged on the EPC register; the count is a
 * near-real-time leading indicator of housing completions, which arrive
 * quarterly with a long lag.
 *
 * Strategy: paginate the EPC Open Data domestic search API, filtered to
 * transaction-type=new_dwelling, walking back 24 months. Auth via Basic
 * (EPC_EMAIL:EPC_API_KEY environment variables).
 *
 * Heads-up: EPC's open data service migrates to "Get energy performance of
 * buildings data" on 30 May 2026. This script targets the legacy v1 API;
 * future migration required.
 *
 * Source: EPC Open Data — https://epc.opendatacommunities.org/
 *
 * Output: public/data/epc-newbuild.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import https from "https";

const EMAIL = process.env.EPC_EMAIL;
const KEY = process.env.EPC_API_KEY;
const BASE = "https://epc.opendatacommunities.org/api/v1/domestic/search";
const PAGE_SIZE = 5000;
const MONTHS_BACK = 24;

function authHeader() {
  if (!EMAIL || !KEY) return null;
  return "Basic " + Buffer.from(`${EMAIL}:${KEY}`).toString("base64");
}

function fetchJsonAuth(url) {
  return new Promise((resolve, reject) => {
    const auth = authHeader();
    if (!auth) return reject(new Error("EPC_EMAIL / EPC_API_KEY env vars not set"));
    const parsed = new URL(url);
    https
      .get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            Authorization: auth,
            Accept: "application/json",
            "User-Agent": "StateOfBritain/1.0 (+dashboard)",
          },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume();
            return fetchJsonAuth(res.headers.location).then(resolve, reject);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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
      )
      .on("error", reject);
  });
}

function lastNMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
}

async function countMonth(period) {
  const [year, month] = period.split("-");
  const fromTo = `from-month=${year}-${month}&to-month=${year}-${month}&transaction-type=new_dwelling`;
  let total = 0;
  let searchAfter = null;
  for (let p = 0; p < 50; p++) {
    const url = `${BASE}?size=${PAGE_SIZE}&${fromTo}${searchAfter ? `&search-after=${encodeURIComponent(searchAfter)}` : ""}`;
    const resp = await fetchJsonAuth(url);
    const rows = resp.rows || [];
    total += rows.length;
    if (rows.length < PAGE_SIZE) return total;
    const last = rows[rows.length - 1];
    searchAfter = last["lmk-key"] || last.lmkKey || null;
    if (!searchAfter) return total;
  }
  return total;
}

async function main() {
  if (!authHeader()) {
    console.warn("EPC_EMAIL / EPC_API_KEY not set; writing empty series.");
    writeEmpty("EPC env vars not set this run; series empty.");
    return;
  }

  const periods = lastNMonths(MONTHS_BACK);
  const data = [];

  for (const period of periods) {
    try {
      const lodgements = await countMonth(period);
      data.push({ month: period, lodgements });
      console.log(`  ${period}: ${lodgements}`);
    } catch (err) {
      console.warn(`  ${period} failed: ${err.message}`);
    }
  }

  if (data.length === 0) {
    writeEmpty("All monthly EPC queries failed this run; series empty.");
    return;
  }

  const latest = data[data.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "epc-newbuild",
    pillar: "foundations",
    topic: "housing",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "epc-open-data",
        name: "EPC Open Data — domestic certificates (new dwellings)",
        url: "https://epc.opendatacommunities.org/",
        publisher: "Department for Levelling Up, Housing and Communities",
        note: "Monthly count of EPC lodgements with transaction-type=new_dwelling. Migrates to 'Get energy performance of buildings data' on 30 May 2026.",
      },
    ],
    snapshot: {
      lodgements: latest.lodgements,
      lodgementsMonth: latest.month,
      lodgementsUnit: "new-build EPC lodgements / month",
    },
    series: {
      monthly: {
        sourceId: "epc-open-data",
        timeField: "month",
        unit: "lodgements / month",
        description:
          "Monthly count of new-dwelling Energy Performance Certificate lodgements, England & Wales.",
        data,
      },
    },
  };

  writeFileSync("public/data/epc-newbuild.json", JSON.stringify(output, null, 2) + "\n");
  console.log(
    `✓ public/data/epc-newbuild.json (${data.length} months; latest ${latest.lodgements} for ${latest.month})`
  );
}

function writeEmpty(note) {
  const output = {
    $schema: "sob-dataset-v1",
    id: "epc-newbuild",
    pillar: "foundations",
    topic: "housing",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "epc-open-data",
        name: "EPC Open Data — domestic certificates (new dwellings)",
        url: "https://epc.opendatacommunities.org/",
        publisher: "DLUHC",
        note,
      },
    ],
    snapshot: {},
    series: {
      monthly: {
        sourceId: "epc-open-data",
        timeField: "month",
        unit: "lodgements / month",
        description: "Monthly count of new-dwelling EPC lodgements.",
        data: [],
      },
    },
  };
  writeFileSync("public/data/epc-newbuild.json", JSON.stringify(output, null, 2) + "\n");
  console.log(`⚠ public/data/epc-newbuild.json (empty; ${note})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
