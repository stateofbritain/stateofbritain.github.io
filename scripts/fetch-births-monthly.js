/**
 * fetch-births-monthly.js
 *
 * Monthly UK live births sourced from NHS Digital's "Maternity Services
 * Monthly Statistics" (MSDS) publication. Pulls headline TotalBabies and
 * TotalDeliveries at National-ALL granularity for each reporting month.
 *
 * Discovery:
 *   1. Scrape the MSDS index for every publication slug.
 *   2. Filter to `final-{m}-provisional-{n}-official-statistics` releases.
 *   3. For each, fetch the publication page (with a realistic Chrome
 *      User-Agent — NHS Digital returns a thin shell to non-browser UAs)
 *      and extract `files.digital.nhs.uk/.../msds-*-exp-data.csv` URLs.
 *   4. Download each CSV, parse TotalBabies + TotalDeliveries, aggregate
 *      by reporting period.
 *
 * The very latest publications (typically the past 1-2 months) sometimes
 * return a thin shell even with the right UA, presumably while their
 * server-side render warms. They're picked up on the next run.
 *
 * Manual fallback: any CSV dropped into data/manual-uploads/msds/ is
 * folded into the same series, so you can backfill or unblock if
 * scraping is misbehaving.
 *
 * Output: public/data/births-monthly.json (sob-dataset-v1)
 */
import { writeFileSync, readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { fetchHtml, fetchBuffer } from "./lib/xlsx-fetch.js";

const PUBLICATION_INDEX =
  "https://digital.nhs.uk/data-and-information/publications/statistical/maternity-services-monthly-statistics";
const UPLOAD_DIR = "data/manual-uploads/msds";
const REQUEST_DELAY_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseDmy(s) {
  const m = (s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}`;
}

function parseMsdsCsv(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return null;
  const out = { totalBabies: null, totalDeliveries: null, period: null };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cells = line.split(",");
    if (cells.length < 9) continue;
    if (cells[3] !== "National" || cells[4] !== "ALL") continue;
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

function findPublicationSlugs(indexHtml) {
  const re = /\/data-and-information\/publications\/statistical\/maternity-services-monthly-statistics\/final-[a-z]+-\d{4}-provisional-[a-z]+-\d{4}-official-statistics/g;
  return [...new Set(indexHtml.match(re) || [])];
}

function findExpDataCsvUrls(pubHtml) {
  const re = /https?:\/\/files\.digital\.nhs\.uk\/[A-F0-9]{2}\/[A-F0-9]{6}\/msds-[a-zA-Z0-9-]+-exp-data\.csv/gi;
  return [...new Set(pubHtml.match(re) || [])];
}

async function discoverFromIndex() {
  const byPeriod = new Map();
  let indexHtml;
  try {
    indexHtml = await fetchHtml(PUBLICATION_INDEX);
  } catch (err) {
    console.warn(`Index fetch failed: ${err.message}`);
    return byPeriod;
  }

  const slugs = findPublicationSlugs(indexHtml);
  console.log(`Found ${slugs.length} final/provisional publication slugs`);

  for (const slug of slugs) {
    const pubUrl = `https://digital.nhs.uk${slug}`;
    let pubHtml;
    try {
      pubHtml = await fetchHtml(pubUrl);
    } catch (err) {
      console.warn(`  ${slug}: page fetch failed (${err.message})`);
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    const csvUrls = findExpDataCsvUrls(pubHtml);
    if (csvUrls.length === 0) {
      console.warn(`  ${slug}: thin shell (no file URLs); skipping`);
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    for (const csvUrl of csvUrls) {
      try {
        const buf = await fetchBuffer(csvUrl);
        const parsed = parseMsdsCsv(buf.toString("utf-8"));
        if (parsed) {
          if (!byPeriod.has(parsed.period)) {
            byPeriod.set(parsed.period, parsed);
            console.log(
              `  ${parsed.period}: babies=${parsed.totalBabies?.toLocaleString() ?? "?"} deliveries=${parsed.totalDeliveries?.toLocaleString() ?? "?"} (${path.basename(csvUrl)})`
            );
          }
        }
      } catch (err) {
        console.warn(`  ${csvUrl}: ${err.message}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return byPeriod;
}

function ingestManualUploads(byPeriod) {
  if (!existsSync(UPLOAD_DIR)) return;
  const files = readdirSync(UPLOAD_DIR).filter((f) => /\.csv$/i.test(f));
  if (files.length === 0) return;
  console.log(`Folding in ${files.length} manually-uploaded CSV(s) from ${UPLOAD_DIR}`);
  for (const f of files) {
    try {
      const text = readFileSync(path.join(UPLOAD_DIR, f), "utf-8");
      const parsed = parseMsdsCsv(text);
      if (parsed && !byPeriod.has(parsed.period)) {
        byPeriod.set(parsed.period, parsed);
        console.log(
          `  manual ${f} → ${parsed.period}: babies=${parsed.totalBabies?.toLocaleString() ?? "?"} deliveries=${parsed.totalDeliveries?.toLocaleString() ?? "?"}`
        );
      }
    } catch (err) {
      console.warn(`  ${f} parse failed: ${err.message}`);
    }
  }
}

async function main() {
  const byPeriod = await discoverFromIndex();
  ingestManualUploads(byPeriod);

  const data = [...byPeriod.values()]
    .map((r) => ({ month: r.period, babies: r.totalBabies, deliveries: r.totalDeliveries }))
    .sort((a, b) => a.month.localeCompare(b.month));

  if (data.length === 0) {
    writeEmpty();
    return;
  }

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
          "National-level totals from the monthly MSDS exp-data CSVs (TotalBabies, TotalDeliveries). NHS-coverage subset of all live births in England. Latest reporting month is provisional; finalised in the next publication.",
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
        note: "Live discovery and manual-upload fallback both yielded no rows this run.",
      },
    ],
    snapshot: {},
    series: {
      monthly: {
        sourceId: "nhs-digital-msds",
        timeField: "month",
        unit: "babies / month",
        description: "Monthly count of NHS-recorded babies at national level, England.",
        data: [],
      },
    },
  };
  writeFileSync("public/data/births-monthly.json", JSON.stringify(output, null, 2) + "\n");
  console.log(`⚠ public/data/births-monthly.json (empty)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
