/**
 * build-dependency-rollup.js
 *
 * Aggregates the per-commodity strategic-dependency datasets into a
 * single cross-cutting roll-up. Sums the four-bucket imports (and
 * domestic production where present) across all £-denominated cards
 * to give a one-line summary headline like:
 *
 *   "£0.58bn / month of low-alignment imports across 13 strategic goods"
 *
 * Steel is excluded because its dataset is tonnes-denominated; mixing
 * units would be meaningless. Every other dependency card is in £.
 *
 * Output: public/data/dependency-rollup.json
 * Cadence: monthly (cheap, idempotent — runs on day 19 after the
 * commodity fetches on the 18th).
 *
 * The output is consumed by the Sovereign Capability dashboard tile
 * for "Low-alignment dependency value", which sits above the
 * Strategic Dependencies grid as a meta-summary.
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DATA_DIR = "public/data";
const OUT_PATH = "public/data/dependency-rollup.json";

// Steel is in tonnes; every other dependency card is £. Don't mix
// units in the roll-up.
const EXCLUDE = new Set(["steel-dependency.json"]);

function listDependencyFiles() {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith("-dependency.json"))
    .filter((f) => !EXCLUDE.has(f))
    .filter((f) => f !== "dependency-rollup.json")
    .sort();
}

function emptyBuckets() {
  return { aligned: 0, neutral: 0, low: 0, unknown: 0 };
}

function main() {
  const files = listDependencyFiles();
  console.log(`Aggregating ${files.length} dependency datasets:`);
  for (const f of files) console.log(`  ${f}`);

  const monthMap = new Map(); // month → { imports, production }
  const sourceIds = [];
  const datasetTitles = [];

  for (const f of files) {
    const dataset = JSON.parse(readFileSync(path.join(DATA_DIR, f), "utf-8"));
    if (dataset.snapshot?.metric !== "value") {
      console.warn(`  skipping ${f}: metric=${dataset.snapshot?.metric}, not £-denominated`);
      continue;
    }
    datasetTitles.push(dataset.snapshot?.title || dataset.id);
    sourceIds.push({
      id: dataset.id,
      title: dataset.snapshot?.title || dataset.id,
      url: `/data/${dataset.id.replace(/-dependency$/, "")}`,
    });
    const monthly = dataset.series?.monthly?.data || [];
    for (const row of monthly) {
      if (!row.month) continue;
      if (!monthMap.has(row.month)) {
        monthMap.set(row.month, {
          month: row.month,
          imports: emptyBuckets(),
          production: 0,
        });
      }
      const acc = monthMap.get(row.month);
      const imp = row.imports || {};
      acc.imports.aligned += imp.aligned || 0;
      acc.imports.neutral += imp.neutral || 0;
      acc.imports.low += imp.low || 0;
      acc.imports.unknown += imp.unknown || 0;
      acc.production += row.production || 0;
    }
  }

  const months = [...monthMap.keys()].sort();
  // Drop the first 1-2 months if they have noticeably fewer contributing
  // datasets (typical when one fetch hasn't backfilled as far). A month
  // is kept only if its total imports are within 50% of the median
  // month — caps trough months that drag the trend.
  const totalsByMonth = months.map((m) => {
    const r = monthMap.get(m);
    return (r.imports.aligned + r.imports.neutral + r.imports.low + r.imports.unknown);
  });
  const sorted = [...totalsByMonth].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const monthly = months
    .filter((m, i) => totalsByMonth[i] > median * 0.5)
    .map((m) => {
      const r = monthMap.get(m);
      const imp = r.imports;
      const totalImports = imp.aligned + imp.neutral + imp.low + imp.unknown;
      const totalSupply = totalImports + r.production;
      return {
        month: m,
        production: r.production,
        imports: imp,
        totalImports,
        totalSupply,
        lowAlignmentImports: imp.low,
        nonAlignedImports: imp.low + imp.neutral + imp.unknown,
        alignedShare: totalSupply > 0 ? Math.round((imp.aligned / totalSupply) * 1000) / 10 : null,
        lowShare: totalSupply > 0 ? Math.round((imp.low / totalSupply) * 1000) / 10 : null,
      };
    });

  const latest = monthly[monthly.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "dependency-rollup",
    pillar: "state",
    topic: "sovereignCapability",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "dependency-rollup",
        name: "Strategic dependency roll-up across the dashboard's per-commodity cards",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC + UNGA voting (Voeten)",
        note: `Sum of HMRC bulk-COO imports across ${datasetTitles.length} £-denominated strategic goods (${datasetTitles.join(", ")}), bucketed by partner-country UNGA alignment with the UK. Steel is excluded because its dependency dataset is tonnes-denominated.`,
      },
    ],
    snapshot: {
      title: "Strategic dependency roll-up",
      month: latest.month,
      production: latest.production,
      imports: latest.imports,
      totalImports: latest.totalImports,
      totalSupply: latest.totalSupply,
      lowAlignmentImports: latest.lowAlignmentImports,
      nonAlignedImports: latest.nonAlignedImports,
      alignedShare: latest.alignedShare,
      lowShare: latest.lowShare,
      cardsAggregated: datasetTitles.length,
      metric: "value",
      unit: "£ / month",
    },
    series: {
      monthly: {
        sourceId: "dependency-rollup",
        timeField: "month",
        unit: "£ / month",
        description: `Cross-cutting monthly UK strategic-dependency imports, summed across ${datasetTitles.length} cards on the Sovereign Capability dashboard. Each row carries lowAlignmentImports (HMRC partner UNGA <50%) and nonAlignedImports (UNGA <70% + unknown).`,
        data: monthly,
      },
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `\n✓ ${OUT_PATH} (${monthly.length} months; latest ${latest.month})\n` +
    `  total imports £${(latest.totalImports / 1e9).toFixed(2)}bn/mo\n` +
    `  low-alignment £${(latest.lowAlignmentImports / 1e6).toFixed(0)}m/mo (${latest.lowShare}% of total supply)\n` +
    `  aligned share ${latest.alignedShare}%`
  );
}

main();
