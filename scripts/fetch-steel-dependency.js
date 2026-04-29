/**
 * fetch-steel-dependency.js
 *
 * UK steel supply broken down into four buckets per month:
 *   - domestic production (estimated)
 *   - imports from aligned partners (UNGA agreement >= 70%)
 *   - imports from neutral partners (50-70%)
 *   - imports from low-alignment partners (< 50%)
 * plus exports split by the same alignment classification.
 *
 * Sources:
 *   - HMRC OTS (uktradeinfo.com OData) — finished steel trade per
 *     partner country, HS 7208-7229 within HS chapter 72.
 *   - ONS K23I — basic iron and steel production index, scaled
 *     against the UK Steel 2022 baseline (6.1m tonnes / yr) to
 *     produce a monthly tonnage estimate. Honest in source note.
 *   - public/data/unga-alignment.json — UK roll-call agreement %
 *     used to assign each partner to an alignment bucket.
 *
 * Output: public/data/steel-dependency.json (sob-dataset-v1).
 *
 * Schedule: monthly on the 16th (HMRC OTS publishes ~13th for M-2).
 */
import { writeFileSync, readFileSync } from "fs";
import {
  fetchTradeByCountry,
  lastNMonthIds,
} from "./lib/hmrc-trade-by-country.js";
import { bucketFor } from "../src/dashboard/alignmentBuckets.js";

const HS2 = "72";
const HS4_RANGE = [7208, 7229]; // finished steel slice
const MONTHS_BACK = 24;

// UK 2022 crude steel production: 6.1 million tonnes / yr (UK Steel
// Statistical Yearbook 2023). Divided by 12 = 508,333 tonnes/month at
// K23I = 100. Scales the index back to absolute monthly tonnage.
const UK_2022_BASELINE_MONTHLY_TONNES = 508_333;

const UNGA_PATH = "public/data/unga-alignment.json";
const PROD_PATH = "public/data/iop-steel.json";
const OUTPUT_PATH = "public/data/steel-dependency.json";

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

// Editorial overrides for entities that don't vote at the UN but are
// substantial trade partners. Each entry is (iso3 → { bucket, name }).
// Pinning the bucket directly (rather than fabricating an alignment %)
// keeps the override visible to anyone reading the script.
//
// Justifications:
//   TWN — Taiwan: functional US/Western ally. Substantial steel
//         supplier, not separately represented at UN since 1971.
//   HKG — Hong Kong SAR: under PRC sovereignty since 1997.
//   XKX — Kosovo: Western-recognised, applying for UN membership.
//   GIB, FLK, IOT, BMU, MSR, SHN, CUW, ABW, BLM, HMD, ATA —
//         UK Overseas Territories, EU-associated territories, and
//         uninhabited / research zones. Volumes are negligible
//         (single-digit tonnes/yr); classified aligned for sanity.
const NON_UN_ALIGNMENT_OVERRIDES = {
  TWN: { bucket: "aligned", note: "Taiwan; not a UN member" },
  HKG: { bucket: "low", note: "Hong Kong SAR; under PRC sovereignty" },
  XKX: { bucket: "aligned", note: "Kosovo; Western-recognised, applicant" },
  GIB: { bucket: "aligned", note: "Gibraltar; UK Overseas Territory" },
  FLK: { bucket: "aligned", note: "Falkland Islands; UK Overseas Territory" },
  IOT: { bucket: "aligned", note: "British Indian Ocean Territory" },
  BMU: { bucket: "aligned", note: "Bermuda; UK Overseas Territory" },
  MSR: { bucket: "aligned", note: "Montserrat; UK Overseas Territory" },
  SHN: { bucket: "aligned", note: "St Helena; UK Overseas Territory" },
  CUW: { bucket: "aligned", note: "Curaçao; Netherlands constituent country" },
  ABW: { bucket: "aligned", note: "Aruba; Netherlands constituent country" },
  BLM: { bucket: "aligned", note: "St Barthélemy; French overseas collectivity" },
  HMD: { bucket: "aligned", note: "Heard & McDonald; Australian territory" },
  ATA: { bucket: "aligned", note: "Antarctica; treaty zone" },
};

function buildAlignmentLookup() {
  const raw = readJson(UNGA_PATH);
  const rows = raw.series?.countries?.data || [];
  const byIso3 = new Map();
  for (const r of rows) {
    if (r.iso3) {
      byIso3.set(r.iso3, { alignmentPct: r.alignmentPct, name: r.country, source: "voeten" });
    }
  }
  // Layer overrides on top — only if the iso3 isn't already in the
  // Voeten data (we don't want to override real UNGA records).
  for (const [iso3, override] of Object.entries(NON_UN_ALIGNMENT_OVERRIDES)) {
    if (!byIso3.has(iso3)) {
      byIso3.set(iso3, {
        alignmentPct: null,
        name: null,
        bucket: override.bucket,
        note: override.note,
        source: "override",
      });
    }
  }
  return byIso3;
}

function buildProductionLookup() {
  const raw = readJson(PROD_PATH);
  const rows = raw.series?.monthly?.data || [];
  const byPeriod = new Map();
  for (const r of rows) {
    if (r.period && Number.isFinite(r.value)) {
      byPeriod.set(r.period, r.value);
    }
  }
  return byPeriod;
}

function emptyBucketRow() {
  return { aligned: 0, neutral: 0, low: 0, unknown: 0 };
}

async function main() {
  const alignment = buildAlignmentLookup();
  const production = buildProductionLookup();

  const monthIds = lastNMonthIds(MONTHS_BACK);
  const monthlyData = [];
  const partnerTotals = new Map(); // alpha3 → { name, alignmentPct, importTonnes, exportTonnes }

  for (const id of monthIds) {
    let rows;
    try {
      rows = await fetchTradeByCountry({ hs2: HS2, hs4Range: HS4_RANGE, monthId: id });
    } catch (err) {
      console.warn(`  ${id}: failed (${err.message})`);
      continue;
    }
    if (rows.length === 0) {
      console.warn(`  ${id}: no rows (likely too recent for HMRC publication)`);
      continue;
    }
    const month = rows[0].month;
    const importBuckets = emptyBucketRow();
    const exportBuckets = emptyBucketRow();

    for (const r of rows) {
      const alignInfo = r.alpha3 ? alignment.get(r.alpha3) : null;
      // Override bucket takes precedence; otherwise compute from alignmentPct.
      const bucket = alignInfo
        ? alignInfo.bucket || bucketFor(alignInfo.alignmentPct)
        : "unknown";
      importBuckets[bucket] += r.importTonnes;
      exportBuckets[bucket] += r.exportTonnes;

      if (r.alpha3 && (r.importTonnes > 0 || r.exportTonnes > 0)) {
        if (!partnerTotals.has(r.alpha3)) {
          partnerTotals.set(r.alpha3, {
            iso3: r.alpha3,
            name: alignInfo?.name || r.name,
            alignmentPct: alignInfo?.alignmentPct ?? null,
            bucket,
            classifySource: alignInfo?.source ?? "unknown",
            importTonnes: 0,
            exportTonnes: 0,
            months: 0,
          });
        }
        const acc = partnerTotals.get(r.alpha3);
        acc.importTonnes += r.importTonnes;
        acc.exportTonnes += r.exportTonnes;
        acc.months += 1;
      }
    }

    const k23i = production.get(month);
    const productionTonnes = k23i != null
      ? Math.round((k23i / 100) * UK_2022_BASELINE_MONTHLY_TONNES)
      : null;

    const totalImports =
      importBuckets.aligned + importBuckets.neutral + importBuckets.low + importBuckets.unknown;
    const totalSupply = (productionTonnes || 0) + totalImports;
    const alignedShare = totalSupply > 0
      ? Math.round((importBuckets.aligned / totalSupply) * 1000) / 10
      : null;
    const domesticShare = totalSupply > 0 && productionTonnes != null
      ? Math.round((productionTonnes / totalSupply) * 1000) / 10
      : null;

    monthlyData.push({
      month,
      production: productionTonnes,
      productionIndex: k23i ?? null,
      imports: importBuckets,
      exports: exportBuckets,
      totalImports,
      totalExports:
        exportBuckets.aligned + exportBuckets.neutral + exportBuckets.low + exportBuckets.unknown,
      alignedShare,
      domesticShare,
    });
    console.log(
      `  ${month}: prod ${productionTonnes?.toLocaleString() ?? "?"}t | imp aligned ${importBuckets.aligned.toLocaleString()} | neutral ${importBuckets.neutral.toLocaleString()} | low ${importBuckets.low.toLocaleString()} | exp ${(exportBuckets.aligned + exportBuckets.neutral + exportBuckets.low + exportBuckets.unknown).toLocaleString()}t`
    );
  }

  if (monthlyData.length === 0) {
    throw new Error("No months returned data; aborting");
  }

  monthlyData.sort((a, b) => a.month.localeCompare(b.month));
  const latest = monthlyData[monthlyData.length - 1];

  // Build top partner list (by total imports across the 24-month window)
  const partnerArr = [...partnerTotals.values()]
    .map((p) => ({
      iso3: p.iso3,
      country: p.name,
      alignmentPct: p.alignmentPct,
      bucket: p.bucket,
      classifySource: p.classifySource,
      importTonnes: p.importTonnes,
      exportTonnes: p.exportTonnes,
    }))
    .sort((a, b) => b.importTonnes - a.importTonnes);

  const output = {
    $schema: "sob-dataset-v1",
    id: "steel-dependency",
    pillar: "state",
    topic: "sovereignCapability",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "hmrc-ots-72-finished",
        name: "HMRC Overseas Trade — finished steel (HS 7208-7229)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note:
          "Monthly per-partner trade in finished steel products. EU + non-EU flow types combined.",
      },
      {
        id: "ons-iop-k23i",
        name: "ONS Index of Production — Basic iron and steel (K23I)",
        url: "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23I/data",
        publisher: "ONS",
        note: "Monthly production index, 2022 = 100, CVMSA.",
      },
      {
        id: "uksteel-2022-baseline",
        name: "UK Steel Statistical Yearbook 2023 — 2022 production baseline",
        url: "https://www.uksteel.org/uk-steel-publications-1",
        publisher: "UK Steel",
        note:
          "2022 UK crude steel production: 6.1 million tonnes ÷ 12 = 508,333 tonnes/month at K23I = 100. Used to scale the production index to absolute monthly tonnage.",
      },
      {
        id: "voeten-unga",
        name: "Voeten — UN General Assembly Voting Data",
        url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ",
        publisher: "Harvard Dataverse (Erik Voeten)",
        note:
          "Used to classify each trade partner into an alignment bucket. Aligned ≥ 70%, neutral 50–70%, low < 50%.",
      },
    ],
    snapshot: {
      month: latest.month,
      production: latest.production,
      imports: latest.imports,
      exports: latest.exports,
      alignedShare: latest.alignedShare,
      domesticShare: latest.domesticShare,
      partnersTracked: partnerArr.length,
      windowMonths: monthlyData.length,
    },
    series: {
      monthly: {
        sourceId: "hmrc-ots-72-finished",
        timeField: "month",
        unit: "tonnes / month",
        description:
          "Monthly UK supply of finished steel: production estimate plus imports broken down by trade partner alignment bucket. Exports broken down by the same buckets.",
        data: monthlyData,
      },
      byPartner: {
        sourceId: "hmrc-ots-72-finished",
        timeField: "iso3",
        unit: "tonnes (24-month total)",
        description:
          "Per-partner totals summed over the 24-month window; sorted by total imports descending.",
        data: partnerArr,
      },
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `✓ ${OUTPUT_PATH} (${monthlyData.length} months; ${partnerArr.length} partners; latest ${latest.month} aligned-share ${latest.alignedShare}%)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
