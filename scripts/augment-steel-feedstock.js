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
    period: "2024",
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

  // Compute aggregate 2nd-order bucket shares across the whole window.
  // For each partner X, their imports redistribute as:
  //   (1 - re_roll_X) into X's own bucket
  //   re_roll_X × upstream_share[U] into upstream U's bucket
  // We aggregate weighted by each partner's window-total imports, then
  // express as fractions of the total. Apply to each month's volume to
  // get a 2nd-order monthly bucket distribution.
  const totalWindowImports = partners.reduce((s, p) => s + (p.importTonnes || 0), 0);
  const aggBuckets = { aligned: 0, neutral: 0, low: 0, unknown: 0 };

  for (const row of partners) {
    const value = row.importTonnes || 0;
    if (value === 0) continue;
    const summary = summaries.get(row.iso3);
    const partnerBucket = row.bucket || "unknown";
    if (!summary || summary.reRollingFraction === 0 || !summary.feedstockTopOrigins.length) {
      // No re-rolling — partner contributes fully to their own bucket
      aggBuckets[partnerBucket] = (aggBuckets[partnerBucket] || 0) + value;
      continue;
    }
    const f = summary.reRollingFraction;
    aggBuckets[partnerBucket] = (aggBuckets[partnerBucket] || 0) + value * (1 - f);
    for (const upstream of summary.feedstockTopOrigins) {
      aggBuckets[upstream.bucket] = (aggBuckets[upstream.bucket] || 0) + value * f * upstream.share;
    }
  }

  const bucketShares2nd = {};
  for (const k of ["aligned", "neutral", "low", "unknown"]) {
    bucketShares2nd[k] = totalWindowImports > 0 ? aggBuckets[k] / totalWindowImports : 0;
  }
  console.log(`\n2nd-order aggregate bucket shares:`);
  for (const [k, v] of Object.entries(bucketShares2nd)) {
    console.log(`  ${k.padEnd(8)} ${(v * 100).toFixed(1)}%`);
  }

  // Apply per-month: imports2ndOrder = monthly_total_imports × shares.
  // This assumes a stable partner mix month-to-month, which is reasonable
  // for steel where the same set of suppliers persists. Refresh of the
  // augment annually (when Comtrade data updates) keeps it current.
  for (const row of dataset.series.monthly.data) {
    const ti = row.totalImports
      ?? ((row.imports?.aligned || 0) + (row.imports?.neutral || 0) +
          (row.imports?.low || 0) + (row.imports?.unknown || 0));
    row.imports2ndOrder = {
      aligned: Math.round(bucketShares2nd.aligned * ti),
      neutral: Math.round(bucketShares2nd.neutral * ti),
      low: Math.round(bucketShares2nd.low * ti),
      unknown: Math.round(bucketShares2nd.unknown * ti),
    };
    const total2nd = (row.production || 0) + ti;
    row.alignedShare2ndOrder = total2nd > 0
      ? Math.round((row.imports2ndOrder.aligned / total2nd) * 1000) / 10
      : null;
  }

  // Reflect the snapshot
  const latest = dataset.series.monthly.data[dataset.series.monthly.data.length - 1];
  if (latest) {
    dataset.snapshot.imports2ndOrder = latest.imports2ndOrder;
    dataset.snapshot.alignedShare2ndOrder = latest.alignedShare2ndOrder;
  }

  // Annotate the source list to surface the methodology
  const COMTRADE_NOTE =
    "Each top partner's reported imports of HS 7206-7207 (semi-finished steel) from upstream-origin countries (China, Russia, India, Turkey, Brazil, Ukraine, Kazakhstan, Iran), and reported exports of HS 7208-7229 (finished) to the UK. Used to estimate the fraction of partner-attributed UK imports that is functionally re-rolled upstream-origin material. " +
    "Reference year: 2024 (with 2023 fallback for slow-reporting partners). " +
    "Notable: Belgium and Germany continue to import Russian semi-finished steel even after the EU's 8th sanctions package — the 'slab carve-out' to keep ArcelorMittal Gent and Bremen operating has been more enduring than originally announced. Belgium's HS 7207 imports from Russia: $1.0bn (2022) → $1.0bn (2022) → $663m (2023) → $623m (2024). The flow declined but didn't end. Caveats: bilateral reporting mismatches between reporters (CIF vs FOB) introduce ~5-15% noise; France typically reports later than other major economies and may not appear in current-year data; the 'feedstock origin' read is an upper bound (some upstream imports are domestically consumed rather than re-exported).";
  const existing = dataset.sources.find((s) => s.id === "comtrade-2ndorder");
  if (existing) {
    existing.note = COMTRADE_NOTE;
  } else {
    dataset.sources.push({
      id: "comtrade-2ndorder",
      name: "UN Comtrade — 2nd-order feedstock origin",
      url: "https://comtradeplus.un.org/",
      publisher: "UN Statistics Division",
      note: COMTRADE_NOTE,
    });
  }
  dataset.generated = new Date().toISOString().slice(0, 10);

  writeFileSync(PATH, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`\n✓ ${PATH} augmented with feedstock data for top ${topPartnerIso3.length} partners`);
}

main().catch((err) => { console.error(err); process.exit(1); });
