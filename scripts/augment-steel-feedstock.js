/**
 * augment-steel-feedstock.js
 *
 * Reads public/data/steel-dependency.json and augments each top
 * partner's row with a feedstock-origin summary derived from UN
 * Comtrade. Output: same file, with each byPartner row gaining
 * `reRollingFraction` and `feedstockTopOrigins` fields.
 *
 * The dashboard renders these in a new column on the partner table
 * inside the steel card's expanded view.
 *
 * Run after fetch-steel-dependency.js. Annual-ish refresh (the
 * coefficients depend on Comtrade annual data).
 */
import { readFileSync, writeFileSync } from "fs";
import {
  compute2ndOrderCoefficients,
  partnerFeedstockSummary,
} from "./lib/second-order-origin.js";
import { bucketFor } from "../src/dashboard/alignmentBuckets.js";

const PATH = "public/data/steel-dependency.json";
const TOP_N = 15;

const FINISHED_HS = ["7208","7209","7210","7211","7212","7213","7214","7215","7216","7217","7218","7219","7220","7221","7222","7223","7224","7225","7226","7227","7228","7229"];
const FEEDSTOCK_HS = ["7206","7207"]; // semi-finished steel: ingots, blooms, billets, slabs
const UPSTREAM_SOURCES = ["CHN","RUS","IND","TUR","BRA","UKR","KAZ","IRN"];

function buildAlignmentLookup() {
  const raw = JSON.parse(readFileSync("public/data/unga-alignment.json", "utf-8"));
  const rows = raw.series?.countries?.data || [];
  const map = new Map();
  for (const r of rows) {
    if (r.iso3) {
      map.set(r.iso3, { alignmentPct: r.alignmentPct, name: r.country });
    }
  }
  // Non-UN overrides matching what build-dependency-dataset.js applies
  const overrides = {
    TWN: { bucket: "aligned", name: "Taiwan" },
    HKG: { bucket: "low", name: "Hong Kong" },
    XKX: { bucket: "aligned", name: "Kosovo" },
  };
  for (const [iso3, override] of Object.entries(overrides)) {
    if (!map.has(iso3)) {
      map.set(iso3, { alignmentPct: null, name: override.name, bucket: override.bucket });
    }
  }
  return map;
}

async function main() {
  const dataset = JSON.parse(readFileSync(PATH, "utf-8"));
  const partners = dataset.series?.byPartner?.data || [];
  if (partners.length === 0) throw new Error(`No byPartner data in ${PATH}`);

  const topPartnerIso3 = partners.slice(0, TOP_N)
    .map((p) => p.iso3)
    .filter((x) => x);
  console.log(`Computing 2nd-order coefficients for top ${topPartnerIso3.length} partners…`);

  const coefficients = await compute2ndOrderCoefficients({
    partners: topPartnerIso3,
    finishedHs: FINISHED_HS,
    feedstockHs: FEEDSTOCK_HS,
    upstreamSources: UPSTREAM_SOURCES,
    period: "2023",
  });

  const alignmentLookup = buildAlignmentLookup();
  const summaries = partnerFeedstockSummary({ coefficients, bucketFor, alignmentLookup });

  // Augment the byPartner rows
  for (const row of partners) {
    const summary = summaries.get(row.iso3);
    if (!summary) continue;
    row.reRollingFraction = Math.round(summary.reRollingFraction * 1000) / 10;
    row.feedstockTopOrigins = summary.feedstockTopOrigins.map((o) => ({
      iso3: o.iso3,
      country: o.country,
      alignmentPct: o.alignmentPct,
      bucket: o.bucket,
      share: Math.round(o.share * 1000) / 10,
    }));
  }

  // Annotate the source list to surface the methodology
  if (!dataset.sources.find((s) => s.id === "comtrade-2ndorder")) {
    dataset.sources.push({
      id: "comtrade-2ndorder",
      name: "UN Comtrade — 2nd-order feedstock origin",
      url: "https://comtradeplus.un.org/",
      publisher: "UN Statistics Division",
      note:
        "Each top partner's reported imports of HS 7206-7207 (semi-finished steel) from upstream-origin countries (China, Russia, India, Turkey, Brazil, Ukraine, Kazakhstan, Iran), and reported exports of HS 7208-7229 (finished) to the UK. Used to estimate the fraction of partner-attributed UK imports that is functionally re-rolled upstream-origin material. Annual data; latest available year used.",
    });
  }
  dataset.generated = new Date().toISOString().slice(0, 10);

  writeFileSync(PATH, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`\n✓ ${PATH} augmented with feedstock data for top ${topPartnerIso3.length} partners`);
}

main().catch((err) => { console.error(err); process.exit(1); });
