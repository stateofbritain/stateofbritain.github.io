/**
 * fetch-births-monthly.js
 *
 * Monthly live births in England via NHS Digital's "Maternity Services
 * Monthly Statistics" (MSDS). Counts the field "Number of deliveries
 * with at least one baby" from the monthly activity CSV.
 *
 * Strategy:
 *   1. Scrape the MSDS index page for the latest publication slug.
 *   2. Fetch the publication page; look for binary CSV / ZIP download links.
 *   3. Parse the activity CSV for monthly delivery counts.
 *
 * Realistic warning: NHS Digital's CMS is JS-rendered and the binary
 * download URLs are not exposed in initial HTML. Without a headless
 * browser, this script currently writes empty JSON. The infrastructure
 * is in place for when either NHS Digital surfaces a stable URL pattern
 * or a Playwright-based fetcher is added.
 *
 * Source: NHS Digital — Maternity Services Monthly Statistics.
 * https://digital.nhs.uk/data-and-information/publications/statistical/maternity-services-monthly-statistics
 *
 * Output: public/data/births-monthly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchHtml, fetchBuffer } from "./lib/xlsx-fetch.js";

const INDEX_URL =
  "https://digital.nhs.uk/data-and-information/publications/statistical/maternity-services-monthly-statistics";

const MONTH_NAMES = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

function findPublicationSlugs(html) {
  const re = /\/data-and-information\/publications\/statistical\/maternity-services-monthly-statistics\/[a-z0-9-]+/gi;
  const seen = new Set();
  const out = [];
  for (const m of html.match(re) || []) {
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

function parseSlugMonth(slug) {
  // e.g. "/...statistics/final-april-2026-provisional-may-2026-official-statistics"
  const m = slug.match(/final-([a-z]+)-(\d{4})-provisional-([a-z]+)-(\d{4})/i);
  if (!m) return null;
  const finalMonth = MONTH_NAMES[m[1].toLowerCase()];
  const finalYear = m[2];
  if (!finalMonth) return null;
  return { final: `${finalYear}-${finalMonth}`, slug };
}

function findDownloadUrls(html) {
  // NHS Digital occasionally surfaces files at https://files.digital.nhs.uk/.../*.csv or *.zip
  const re = /https?:\/\/files\.digital\.nhs\.uk\/[^"'\s)<>]+\.(?:csv|zip|xlsx|ods)/gi;
  return [...new Set(html.match(re) || [])];
}

function parseDeliveriesCsv(text) {
  // Expected columns approximately: ReportingPeriod, MeasureName, MeasureValue.
  // Look for "Deliveries with at least one baby" or "Total deliveries".
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const header = lines[0].split(",").map((c) => c.trim().replace(/"/g, "").toLowerCase());
  const periodCol = header.findIndex((c) => /reporting.?period|month|date/.test(c));
  const measureCol = header.findIndex((c) => /measure.?name|metric|indicator/.test(c));
  const valueCol = header.findIndex((c) => /measure.?value|value|count|number/.test(c));
  if (periodCol < 0 || valueCol < 0) return null;

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    if (measureCol >= 0) {
      const m = cells[measureCol]?.toLowerCase() || "";
      if (!/(deliver(y|ies).*(at.?least.?one.?baby|live.?birth)|live.?birth)/i.test(m)) continue;
    }
    const period = parseReportingPeriod(cells[periodCol]);
    const value = Number.parseFloat((cells[valueCol] || "").replace(/,/g, ""));
    if (!period || !Number.isFinite(value)) continue;
    out.push({ month: period, deliveries: Math.round(value) });
  }
  return out.length > 0 ? out.sort((a, b) => a.month.localeCompare(b.month)) : null;
}

function parseReportingPeriod(s) {
  if (typeof s !== "string") return null;
  // "2026-04-01" or "April 2026" or "2026-04"
  const iso = s.match(/(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const named = s.match(/^([a-z]+)\s+(\d{4})$/i);
  if (named) {
    const mm = MONTH_NAMES[named[1].toLowerCase()];
    if (mm) return `${named[2]}-${mm}`;
  }
  return null;
}

async function tryDiscovery() {
  try {
    const indexHtml = await fetchHtml(INDEX_URL);
    const slugs = findPublicationSlugs(indexHtml)
      .map(parseSlugMonth)
      .filter(Boolean)
      .sort((a, b) => b.final.localeCompare(a.final));
    if (slugs.length === 0) return null;
    for (const { slug } of slugs.slice(0, 3)) {
      try {
        const pubUrl = `https://digital.nhs.uk${slug}`;
        const pubHtml = await fetchHtml(pubUrl);
        const files = findDownloadUrls(pubHtml);
        for (const fileUrl of files) {
          try {
            const buf = await fetchBuffer(fileUrl);
            // Only attempt CSV parse for now; skip ZIP (would need a deflate dep).
            if (/\.csv$/i.test(fileUrl)) {
              const data = parseDeliveriesCsv(buf.toString("utf-8"));
              if (data) return { data, url: fileUrl };
            }
          } catch (err) {
            console.warn(`  ${fileUrl}: ${err.message}`);
          }
        }
      } catch (err) {
        console.warn(`  publication ${slug}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Index page failed: ${err.message}`);
  }
  return null;
}

async function main() {
  const result = await tryDiscovery();
  const data = result?.data ?? [];
  const liveUrl = result?.url ?? null;

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
        url: liveUrl ?? INDEX_URL,
        publisher: "NHS Digital",
        note: liveUrl
          ? "Monthly count of deliveries with at least one baby, England (NHS-coverage subset of all live births)."
          : "Live discovery did not succeed this run. NHS Digital's CMS does not expose data file URLs in initial HTML; the tile will read 'no data' until either NHS Digital surfaces a stable URL or a headless-browser fetcher is added.",
      },
    ],
    snapshot: data.length
      ? {
          deliveries: data[data.length - 1].deliveries,
          deliveriesMonth: data[data.length - 1].month,
          deliveriesUnit: "deliveries / month (with at least one baby)",
        }
      : {},
    series: {
      monthly: {
        sourceId: "nhs-digital-msds",
        timeField: "month",
        unit: "deliveries / month",
        description:
          "Monthly count of NHS deliveries with at least one baby, England. Provisional latest month, finalised one month later.",
        data,
      },
    },
  };

  writeFileSync(
    "public/data/births-monthly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `${data.length > 0 ? "✓" : "⚠"} public/data/births-monthly.json (${data.length} months; source=${liveUrl ? "live" : "empty (no fallback)"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
