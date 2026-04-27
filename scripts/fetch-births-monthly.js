/**
 * fetch-births-monthly.js
 *
 * Monthly UK live births sourced from NHS Digital's "Maternity Services
 * Monthly Statistics" (MSDS) publication. Pulls headline TotalBabies and
 * TotalDeliveries at National-ALL granularity for each reporting month.
 *
 * NHS Digital's CMS renders publication pages client-side, so the data
 * file URLs aren't reachable by plain HTTP. Until that changes (or until
 * a headless-browser fetcher is added), the workflow is:
 *
 *   1. Download the latest "exp-data" CSVs by hand from
 *      https://digital.nhs.uk/data-and-information/publications/statistical/maternity-services-monthly-statistics
 *   2. Drop them into `data/manual-uploads/msds/`
 *   3. Run `node scripts/fetch-births-monthly.js`
 *
 * The script aggregates every CSV in that folder into one v1 dataset.
 * Each MSDS publication contains a "Final {prev-month}" CSV and a
 * "Provisional {latest-month}" CSV — drop both to maximise series length.
 *
 * Output: public/data/births-monthly.json (sob-dataset-v1)
 */
import { writeFileSync, readdirSync, readFileSync, existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = "data/manual-uploads/msds";
const PUBLICATION_INDEX =
  "https://digital.nhs.uk/data-and-information/publications/statistical/maternity-services-monthly-statistics";

function parseDmy(s) {
  // "01/01/2026" → "2026-01"
  const m = (s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}`;
}

/**
 * Parse a single MSDS exp-data CSV and return one row per dimension we
 * care about. Headers: ReportingPeriodStartDate, ReportingPeriodEndDate,
 * Dimension, Org_Level, Org_Code, Org_Name, Measure, Count_Of, Final_value
 *
 * We aggregate at Org_Level=National + Org_Code=ALL only.
 */
function parseMsdsCsv(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return null;
  const out = { totalBabies: null, totalDeliveries: null, period: null };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cells = line.split(",");
    if (cells.length < 9) continue;
    const orgLevel = cells[3];
    const orgCode = cells[4];
    if (orgLevel !== "National" || orgCode !== "ALL") continue;
    const dim = cells[2];
    const value = Number.parseFloat(cells[8]);
    if (!Number.isFinite(value)) continue;
    if (dim === "TotalBabies") {
      out.totalBabies = Math.round(value);
      out.period ??= parseDmy(cells[0]);
    } else if (dim === "TotalDeliveries") {
      out.totalDeliveries = Math.round(value);
      out.period ??= parseDmy(cells[0]);
    }
  }
  return out.period && (out.totalBabies != null || out.totalDeliveries != null) ? out : null;
}

function main() {
  if (!existsSync(UPLOAD_DIR)) {
    console.warn(`No ${UPLOAD_DIR} directory; series will be empty.`);
    writeEmpty();
    return;
  }

  const files = readdirSync(UPLOAD_DIR).filter((f) => /\.csv$/i.test(f));
  if (files.length === 0) {
    console.warn(`No CSVs found in ${UPLOAD_DIR}; series will be empty.`);
    writeEmpty();
    return;
  }

  // Parse each CSV; deduplicate by reporting period (later files override).
  const byPeriod = new Map();
  for (const f of files) {
    try {
      const text = readFileSync(path.join(UPLOAD_DIR, f), "utf-8");
      const parsed = parseMsdsCsv(text);
      if (!parsed) {
        console.warn(`  ${f}: no recognisable national totals`);
        continue;
      }
      console.log(
        `  ${f}: ${parsed.period} babies=${parsed.totalBabies?.toLocaleString() ?? "?"} deliveries=${parsed.totalDeliveries?.toLocaleString() ?? "?"}`
      );
      byPeriod.set(parsed.period, parsed);
    } catch (err) {
      console.warn(`  ${f} parse failed: ${err.message}`);
    }
  }

  if (byPeriod.size === 0) {
    writeEmpty();
    return;
  }

  const data = [...byPeriod.values()]
    .map((r) => ({
      month: r.period,
      babies: r.totalBabies,
      deliveries: r.totalDeliveries,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const latest = data[data.length - 1];
  const output = {
    $schema: "sob-dataset-v1",
    id: "births-monthly",
    pillar: "foundations",
    topic: "family",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "nhs-digital-msds",
        name: "NHS Digital — Maternity Services Monthly Statistics (MSDS)",
        url: PUBLICATION_INDEX,
        publisher: "NHS Digital",
        note:
          "National-level totals from the monthly MSDS exp-data CSV (TotalBabies, TotalDeliveries). NHS-coverage subset of all live births in England. Latest reporting month is provisional; finalised in the next publication.",
      },
    ],
    snapshot: {
      babies: latest.babies,
      deliveries: latest.deliveries,
      birthsMonth: latest.month,
      birthsUnit: "babies / month",
    },
    series: {
      monthly: {
        sourceId: "nhs-digital-msds",
        timeField: "month",
        unit: "babies / month",
        description:
          "Monthly count of NHS-recorded babies (TotalBabies) and deliveries (TotalDeliveries) at national level, England.",
        data,
      },
    },
  };

  writeFileSync(
    "public/data/births-monthly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/births-monthly.json (${data.length} months; latest babies=${latest.babies?.toLocaleString()} for ${latest.month})`
  );
}

function writeEmpty() {
  const output = {
    $schema: "sob-dataset-v1",
    id: "births-monthly",
    pillar: "foundations",
    topic: "family",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "nhs-digital-msds",
        name: "NHS Digital — Maternity Services Monthly Statistics (MSDS)",
        url: PUBLICATION_INDEX,
        publisher: "NHS Digital",
        note:
          "Drop monthly MSDS exp-data CSVs into data/manual-uploads/msds/ and re-run this script. NHS Digital's CMS doesn't expose data file URLs to plain HTTP, so manual upload is the workaround until a headless-browser fetcher is added.",
      },
    ],
    snapshot: {},
    series: {
      monthly: {
        sourceId: "nhs-digital-msds",
        timeField: "month",
        unit: "babies / month",
        description: "Monthly count of NHS-recorded babies (TotalBabies) at national level, England.",
        data: [],
      },
    },
  };
  writeFileSync(
    "public/data/births-monthly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(`⚠ public/data/births-monthly.json (empty; drop CSVs into ${UPLOAD_DIR})`);
}

main();
