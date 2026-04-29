/**
 * fetch-food-dependency.js
 *
 * UK food imports across five HS chapters: meat (02), dairy (04),
 * vegetables (07), fruit (08), cereals (10). Builds a composite
 * top-level dataset plus per-chapter facets so the dashboard can show
 * a single headline pie and a per-category breakout in the expanded
 * view.
 *
 * Domestic production: not included for v1. DEFRA self-sufficiency is
 * annual (and per-category, %) — adding it requires per-month back-fill
 * and per-facet baseline. Imports-only is the conservative honest read
 * for now.
 *
 * Output: public/data/food-dependency.json (sob-dataset-v1, with a
 * `series.facets` object keyed by chapter slug).
 * Schedule: monthly on the 16th.
 */
import { writeFileSync, writeFile } from "fs";
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

// Per-chapter UK self-sufficiency ratios from the DEFRA UK Food
// Security Report 2024 (production / (production + imports - exports)).
// We use these to infer monthly domestic production from monthly net
// imports: production = SS/(1-SS) × netImports. See source note.
const FACETS = [
  { key: "meat",       label: "Meat",         hs2: "02", selfSufficiency: 0.75 },
  { key: "dairy",      label: "Dairy & eggs", hs2: "04", selfSufficiency: 0.88 },
  { key: "vegetables", label: "Vegetables",   hs2: "07", selfSufficiency: 0.55 },
  { key: "fruit",      label: "Fruit",        hs2: "08", selfSufficiency: 0.16 },
  { key: "cereals",    label: "Cereals",      hs2: "10", selfSufficiency: 0.85 },
];

const MONTHS_BACK = 24;

const COMMON_SOURCES = [
  {
    id: "hmrc-ots-food",
    name: "HMRC Overseas Trade — food (HS 02, 04, 07, 08, 10)",
    url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
    publisher: "HMRC",
    note:
      "Monthly per-partner trade in meat (02), dairy & eggs (04), vegetables (07), fruit (08), and cereals (10).",
  },
  {
    id: "defra-food-security",
    name: "DEFRA UK Food Security Report 2024 — self-sufficiency",
    url: "https://www.gov.uk/government/statistics/united-kingdom-food-security-report-2024",
    publisher: "DEFRA",
    note:
      "Annual UK self-sufficiency ratio by category, used to infer monthly domestic production from monthly net imports: production = SS/(1-SS) × (imports − exports). Approximations (meat 75%, dairy 88%, veg 55%, fruit 16%, cereals 85%); the ratios shift by a few points year-to-year and the dashboard uses the latest reported figures uniformly across the window.",
  },
  {
    id: "voeten-unga",
    name: "Voeten — UN General Assembly Voting Data",
    url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ",
    publisher: "Harvard Dataverse",
    note: "Used to classify each trade partner into an alignment bucket.",
  },
];

/** production = SS/(1-SS) × netImports. Returns null for SS≥1 or no trade data. */
function inferProduction(selfSufficiency, importValue, exportValue) {
  if (selfSufficiency == null || selfSufficiency >= 1) return null;
  const netImports = (importValue || 0) - (exportValue || 0);
  if (netImports <= 0) {
    // Net exporter (eg lamb in some months): self-sufficiency formula
    // doesn't apply cleanly. Fall back to S × imports as a floor.
    return Math.round(selfSufficiency / (1 - selfSufficiency) * (importValue || 0));
  }
  return Math.round((selfSufficiency / (1 - selfSufficiency)) * netImports);
}

/** Sum two month-level rows (with `imports` and `exports` bucket objects). */
function sumMonth(a, b) {
  if (!a) return { ...b };
  return {
    month: a.month,
    production: (a.production || 0) + (b.production || 0),
    imports: {
      aligned: (a.imports?.aligned || 0) + (b.imports?.aligned || 0),
      neutral: (a.imports?.neutral || 0) + (b.imports?.neutral || 0),
      low: (a.imports?.low || 0) + (b.imports?.low || 0),
      unknown: (a.imports?.unknown || 0) + (b.imports?.unknown || 0),
    },
    exports: {
      aligned: (a.exports?.aligned || 0) + (b.exports?.aligned || 0),
      neutral: (a.exports?.neutral || 0) + (b.exports?.neutral || 0),
      low: (a.exports?.low || 0) + (b.exports?.low || 0),
      unknown: (a.exports?.unknown || 0) + (b.exports?.unknown || 0),
    },
  };
}

function recomputeShares(row) {
  const totalImports =
    (row.imports?.aligned || 0) + (row.imports?.neutral || 0) +
    (row.imports?.low || 0) + (row.imports?.unknown || 0);
  const totalSupply = (row.production || 0) + totalImports;
  const totalExports =
    (row.exports?.aligned || 0) + (row.exports?.neutral || 0) +
    (row.exports?.low || 0) + (row.exports?.unknown || 0);
  return {
    ...row,
    totalImports,
    totalExports,
    alignedShare: totalSupply > 0 ? Math.round((row.imports.aligned / totalSupply) * 1000) / 10 : null,
    domesticShare: totalSupply > 0 && row.production != null
      ? Math.round((row.production / totalSupply) * 1000) / 10
      : null,
  };
}

async function main() {
  const monthIds = lastNMonthIds(MONTHS_BACK);

  // 1) Pull each facet (one HS chapter) in turn. Inject DEFRA-derived
  //    domestic production estimate into each monthly row.
  const facetData = {};
  for (const facet of FACETS) {
    console.log(`\n[${facet.key}] HS ${facet.hs2} — ${facet.label} (SS ${(facet.selfSufficiency * 100).toFixed(0)}%)`);
    const dataset = await buildDependencyDataset({
      id: `food-${facet.key}`,
      title: facet.label,
      hs2: facet.hs2,
      monthIds,
      metric: "value",
      unit: "£ / month",
      description: `Monthly UK ${facet.label.toLowerCase()} imports (HS ${facet.hs2}).`,
      sources: COMMON_SOURCES,
      // outputPath omitted: in-memory only.
    });

    // Layer the inferred production figure onto each monthly row and
    // recompute the shares.
    for (const row of dataset.series.monthly.data) {
      const totalImports =
        (row.imports?.aligned || 0) + (row.imports?.neutral || 0) +
        (row.imports?.low || 0) + (row.imports?.unknown || 0);
      const totalExports =
        (row.exports?.aligned || 0) + (row.exports?.neutral || 0) +
        (row.exports?.low || 0) + (row.exports?.unknown || 0);
      row.production = inferProduction(facet.selfSufficiency, totalImports, totalExports);
      const totalSupply = (row.production || 0) + totalImports;
      row.alignedShare = totalSupply > 0
        ? Math.round((row.imports.aligned / totalSupply) * 1000) / 10
        : null;
      row.domesticShare = totalSupply > 0 && row.production != null
        ? Math.round((row.production / totalSupply) * 1000) / 10
        : null;
    }
    facetData[facet.key] = dataset;
  }

  // 2) Compose top-level monthly data by summing across facets.
  const monthsPresent = new Set();
  for (const f of Object.values(facetData)) {
    for (const m of f.series.monthly.data) monthsPresent.add(m.month);
  }
  const allMonths = [...monthsPresent].sort();

  const topMonthly = allMonths.map((month) => {
    let row = null;
    for (const f of Object.values(facetData)) {
      const fm = f.series.monthly.data.find((d) => d.month === month);
      if (fm) row = sumMonth(row, fm);
    }
    return row && recomputeShares(row);
  }).filter(Boolean);

  // 3) Compose top-level byPartner by summing each iso3 across facets.
  // For aligned/neutral/low classification we use whichever the first
  // facet recorded for that partner (the alignment bucket is a property
  // of the partner, not the trade flow).
  const partnerMap = new Map();
  for (const f of Object.values(facetData)) {
    for (const p of f.series.byPartner.data) {
      if (!partnerMap.has(p.iso3)) {
        partnerMap.set(p.iso3, {
          iso3: p.iso3,
          country: p.country,
          alignmentPct: p.alignmentPct,
          bucket: p.bucket,
          classifySource: p.classifySource,
          importTonnes: 0,
          exportTonnes: 0,
        });
      }
      const acc = partnerMap.get(p.iso3);
      acc.importTonnes += p.importTonnes;
      acc.exportTonnes += p.exportTonnes;
    }
  }
  const topPartners = [...partnerMap.values()].sort((a, b) => b.importTonnes - a.importTonnes);

  const topLatest = topMonthly[topMonthly.length - 1];

  // 4) Build the v1 output. series.facets carries each chapter's
  // own monthly + byPartner sub-series for the expanded view.
  const facetsOut = {};
  for (const facet of FACETS) {
    const d = facetData[facet.key];
    const lf = d.series.monthly.data[d.series.monthly.data.length - 1] || {};
    facetsOut[facet.key] = {
      label: facet.label,
      hs2: facet.hs2,
      latest: {
        month: lf.month,
        imports: lf.imports || { aligned: 0, neutral: 0, low: 0, unknown: 0 },
        exports: lf.exports || { aligned: 0, neutral: 0, low: 0, unknown: 0 },
        alignedShare: lf.alignedShare,
      },
      monthly: d.series.monthly.data,
      byPartner: d.series.byPartner.data.slice(0, 12),
    };
  }

  const output = {
    $schema: "sob-dataset-v1",
    id: "food-dependency",
    pillar: "state",
    topic: "sovereignCapability",
    generated: new Date().toISOString().slice(0, 10),
    sources: COMMON_SOURCES,
    snapshot: {
      title: "Food",
      month: topLatest.month,
      production: null,
      imports: topLatest.imports,
      exports: topLatest.exports,
      alignedShare: topLatest.alignedShare,
      domesticShare: null,
      partnersTracked: topPartners.length,
      windowMonths: topMonthly.length,
      metric: "value",
      unit: "£ / month",
      facetKeys: FACETS.map((f) => f.key),
    },
    series: {
      monthly: {
        sourceId: "hmrc-ots-food",
        timeField: "month",
        unit: "£ / month",
        description: "Composite monthly UK food imports across HS 02, 04, 07, 08, 10.",
        data: topMonthly,
      },
      byPartner: {
        sourceId: "hmrc-ots-food",
        timeField: "iso3",
        unit: "£ (window total)",
        description: "Per-partner totals summed across all five food chapters.",
        data: topPartners,
      },
      facets: {
        sourceId: "hmrc-ots-food",
        timeField: "key",
        unit: "£ / month",
        description: "Per-chapter facets: meat / dairy / vegetables / fruit / cereals.",
        data: facetsOut,
      },
    },
  };

  writeFileSync("public/data/food-dependency.json", JSON.stringify(output, null, 2) + "\n");
  console.log(
    `\n✓ public/data/food-dependency.json (${topMonthly.length} months across 5 chapters; latest ${topLatest.month} aligned-share ${topLatest.alignedShare}%)`
  );
  console.log("Per-facet aligned shares:");
  for (const f of FACETS) {
    const fl = facetsOut[f.key].latest;
    console.log(`  ${f.label.padEnd(15)} ${fl.alignedShare}% (${fl.month})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
