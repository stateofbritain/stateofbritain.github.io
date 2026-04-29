/**
 * Build a Strategic Dependency v1 dataset from raw HMRC trade rows.
 *
 * The shared shape across every commodity card on the dashboard is:
 *   - per-month four-way split of supply (domestic + aligned + neutral + low)
 *   - per-month export split using the same alignment buckets
 *   - 24-month per-partner totals for the expand-state list
 *
 * This helper takes the trade-by-country fetch + an alignment lookup +
 * an optional production-tonnage / production-value function and
 * produces the final dataset. Each commodity's fetch script is a thin
 * wrapper that picks an HS slice, sets units, and supplies metadata.
 */
import { writeFileSync, readFileSync } from "fs";
import { fetchTradeByCountry } from "./hmrc-trade-by-country.js";
import { bucketFor } from "../../src/dashboard/alignmentBuckets.js";

const UNGA_PATH = "public/data/unga-alignment.json";

/**
 * Editorial overrides for entities that don't vote at the UN but are
 * substantial trade partners. iso3 → { bucket, note }.
 *
 *   TWN: Taiwan; functional Western ally, not a UN member since 1971
 *   HKG: Hong Kong SAR; under PRC sovereignty
 *   XKX: Kosovo; Western-recognised, applicant
 *   GIB/FLK/IOT/BMU/MSR/SHN: UK Overseas Territories
 *   CUW/ABW: Netherlands constituent countries
 *   BLM: French overseas collectivity
 *   HMD: Australian territory
 *   ATA: Antarctica treaty zone
 */
const DEFAULT_NON_UN_OVERRIDES = {
  TWN: { bucket: "aligned", note: "Taiwan; not a UN member" },
  HKG: { bucket: "low", note: "Hong Kong SAR; under PRC sovereignty" },
  XKX: { bucket: "aligned", note: "Kosovo; Western-recognised" },
  GIB: { bucket: "aligned", note: "Gibraltar; UK Overseas Territory" },
  FLK: { bucket: "aligned", note: "Falkland Islands; UK Overseas Territory" },
  IOT: { bucket: "aligned", note: "British Indian Ocean Territory" },
  BMU: { bucket: "aligned", note: "Bermuda; UK Overseas Territory" },
  MSR: { bucket: "aligned", note: "Montserrat; UK Overseas Territory" },
  SHN: { bucket: "aligned", note: "St Helena; UK Overseas Territory" },
  CUW: { bucket: "aligned", note: "Curaçao; Netherlands constituent" },
  ABW: { bucket: "aligned", note: "Aruba; Netherlands constituent" },
  BLM: { bucket: "aligned", note: "St Barthélemy; French overseas" },
  HMD: { bucket: "aligned", note: "Heard & McDonald; Australian territory" },
  ATA: { bucket: "aligned", note: "Antarctica; treaty zone" },
};

export function buildAlignmentLookup(extraOverrides = {}) {
  const raw = JSON.parse(readFileSync(UNGA_PATH, "utf-8"));
  const rows = raw.series?.countries?.data || [];
  const map = new Map();
  for (const r of rows) {
    if (r.iso3) {
      map.set(r.iso3, {
        alignmentPct: r.alignmentPct,
        name: r.country,
        source: "voeten",
      });
    }
  }
  const overrides = { ...DEFAULT_NON_UN_OVERRIDES, ...extraOverrides };
  for (const [iso3, override] of Object.entries(overrides)) {
    if (!map.has(iso3)) {
      map.set(iso3, {
        alignmentPct: null,
        name: null,
        bucket: override.bucket,
        note: override.note,
        source: "override",
      });
    }
  }
  return map;
}

function emptyBuckets() {
  return { aligned: 0, neutral: 0, low: 0, unknown: 0 };
}

function bucketForRow(row, alignment) {
  const info = row.alpha3 ? alignment.get(row.alpha3) : null;
  if (!info) return { bucket: "unknown", info: null };
  return {
    bucket: info.bucket || bucketFor(info.alignmentPct),
    info,
  };
}

/**
 * @typedef {Object} BuildOpts
 * @property {string} id              dataset id (e.g. "pharma-dependency")
 * @property {string} pillar          "state"
 * @property {string} topic           e.g. "sovereignCapability"
 * @property {string} hs2             two-digit HS chapter
 * @property {?[number, number]} [hs4Range]
 * @property {string[]} monthIds      "YYYYMM" strings to pull
 * @property {"tonnes"|"value"} metric  which HMRC field drives the buckets
 * @property {?(period: string) => ?number} [productionFor]
 *           returns absolute production in the same metric for a given
 *           "YYYY-MM" period, or null if unavailable
 * @property {string} unit            display unit (e.g. "tonnes / month", "£m / month")
 * @property {Array<Object>} sources  v1 dataset sources array
 * @property {string} description     series.monthly.description
 * @property {string} outputPath      file path for writeFileSync
 * @property {Object} [extraOverrides]
 */

/**
 * Pull HMRC trade for the slice across monthIds, classify each
 * partner into an alignment bucket, optionally add a production line,
 * and write the v1 dataset to disk.
 */
export async function buildDependencyDataset(opts) {
  const {
    id, pillar = "state", topic = "sovereignCapability",
    hs2, hs4Range, monthIds, metric, productionFor = null,
    unit, sources, description, outputPath, extraOverrides,
    title = id,
  } = opts;

  const alignment = buildAlignmentLookup(extraOverrides);
  const monthlyData = [];
  const partnerTotals = new Map();
  const importKey = metric === "value" ? "importGbp" : "importTonnes";
  const exportKey = metric === "value" ? "exportGbp" : "exportTonnes";

  for (const id of monthIds) {
    let rows;
    try {
      rows = await fetchTradeByCountry({ hs2, hs4Range, monthId: id });
    } catch (err) {
      console.warn(`  ${id}: failed (${err.message})`);
      continue;
    }
    if (rows.length === 0) {
      console.warn(`  ${id}: no rows`);
      continue;
    }
    const month = rows[0].month;
    const importBuckets = emptyBuckets();
    const exportBuckets = emptyBuckets();

    for (const r of rows) {
      const { bucket, info } = bucketForRow(r, alignment);
      const impVal = r[importKey] || 0;
      const expVal = r[exportKey] || 0;
      importBuckets[bucket] += impVal;
      exportBuckets[bucket] += expVal;

      if (r.alpha3 && (impVal > 0 || expVal > 0)) {
        if (!partnerTotals.has(r.alpha3)) {
          partnerTotals.set(r.alpha3, {
            iso3: r.alpha3,
            name: info?.name || r.name,
            alignmentPct: info?.alignmentPct ?? null,
            bucket,
            classifySource: info?.source ?? "unknown",
            importValue: 0,
            exportValue: 0,
            months: 0,
          });
        }
        const acc = partnerTotals.get(r.alpha3);
        acc.importValue += impVal;
        acc.exportValue += expVal;
        acc.months += 1;
      }
    }

    const production = productionFor ? productionFor(month) : null;
    const totalImports = importBuckets.aligned + importBuckets.neutral + importBuckets.low + importBuckets.unknown;
    const totalSupply = (production || 0) + totalImports;
    const alignedShare = totalSupply > 0
      ? Math.round((importBuckets.aligned / totalSupply) * 1000) / 10
      : null;
    const domesticShare = totalSupply > 0 && production != null
      ? Math.round((production / totalSupply) * 1000) / 10
      : null;

    monthlyData.push({
      month,
      production,
      imports: importBuckets,
      exports: exportBuckets,
      totalImports,
      totalExports:
        exportBuckets.aligned + exportBuckets.neutral + exportBuckets.low + exportBuckets.unknown,
      alignedShare,
      domesticShare,
    });
    console.log(
      `  ${month}: prod ${production?.toLocaleString() ?? "?"} | imp aligned ${importBuckets.aligned.toLocaleString()} | neutral ${importBuckets.neutral.toLocaleString()} | low ${importBuckets.low.toLocaleString()}`
    );
  }

  if (monthlyData.length === 0) throw new Error("No rows for any month — aborting");

  monthlyData.sort((a, b) => a.month.localeCompare(b.month));
  const latest = monthlyData[monthlyData.length - 1];

  // The component expects the legacy field names `importTonnes` and
  // `exportTonnes` on the byPartner list, regardless of metric. Names
  // are misleading for value-based commodities but kept for consistency.
  const partnerArr = [...partnerTotals.values()]
    .map((p) => ({
      iso3: p.iso3,
      country: p.name,
      alignmentPct: p.alignmentPct,
      bucket: p.bucket,
      classifySource: p.classifySource,
      importTonnes: p.importValue,
      exportTonnes: p.exportValue,
    }))
    .sort((a, b) => b.importTonnes - a.importTonnes);

  const output = {
    $schema: "sob-dataset-v1",
    id,
    pillar,
    topic,
    generated: new Date().toISOString().slice(0, 10),
    sources,
    snapshot: {
      title,
      month: latest.month,
      production: latest.production,
      imports: latest.imports,
      exports: latest.exports,
      alignedShare: latest.alignedShare,
      domesticShare: latest.domesticShare,
      partnersTracked: partnerArr.length,
      windowMonths: monthlyData.length,
      metric,
      unit,
    },
    series: {
      monthly: {
        sourceId: sources[0]?.id,
        timeField: "month",
        unit,
        description,
        data: monthlyData,
      },
      byPartner: {
        sourceId: sources[0]?.id,
        timeField: "iso3",
        unit: `${unit} (window total)`,
        description: `Per-partner totals across the ${monthIds.length}-month window; sorted by total imports descending.`,
        data: partnerArr,
      },
    },
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `✓ ${outputPath} (${monthlyData.length} months; ${partnerArr.length} partners; latest ${latest.month} aligned-share ${latest.alignedShare}%)`
  );
  return output;
}
